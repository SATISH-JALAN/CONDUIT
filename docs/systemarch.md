/// CONDUIT — FULL SYSTEM DESIGN
Production Architecture
How every layer works. How data flows. How the frontend sees results.
Stellar · Soroban · Bun · TypeScript · Python · LangGraph · PostgreSQL · Redis
 
00
System Overview
The full picture before going deep

What Conduit Actually Is at a Systems Level
Conduit is three things running simultaneously: a Stellar blockchain protocol (Soroban smart contracts), a TypeScript backend monolith (Bun), and a consumer frontend (Next.js + React Native). The key insight is that the yield counter the user sees is NOT reading from the blockchain every 100ms. It is a mathematical formula running in the browser. The blockchain is only touched when real money moves.

⚡  The Core Loop in One Paragraph
User deposits USDC into a Soroban contract (stream_router.rs). The contract stores 3 values: principal, APY in basis points, and the timestamp of deposit. The Bun backend reads these values once and caches them in Redis. It sends them to the frontend via WebSocket. The frontend then runs V(t) = P × e^(r×Δt) every 100ms — pure math, zero network calls. When the user taps Harvest, the frontend calls the Bun API, Bun builds a Stellar transaction, submits it to Horizon, the contract calculates the actual accrued yield and transfers it. The Redis cache is updated. A new WebSocket message is sent with the new anchor values.

System Components Map
Layer	Technology	What It Does	Port/Endpoint
Browser/Mobile	Next.js + React Native	Renders UI, runs V(t) counter formula, opens WebSocket	localhost:3000
WebSocket Server	Bun + native WS	Maintains live connection per user, pushes anchor updates	localhost:3001/ws
API Server	Bun + Hono	REST endpoints for deposit, harvest, oracle, compliance	localhost:3001/api
AI Agent	Python + FastAPI + LangGraph	COND decision loop, calls Bun /internal/tx via HTTP	localhost:8001
Oracle Service	Bun + setInterval	Polls Benji/Reflector NAV every 60s, writes to chain	Internal to Bun server
Keeper Service	Bun + BullMQ	Scheduled jobs: compound, rebalance, harvest triggers	Internal to Bun server
Indexer	Bun + Horizon SSE	Streams all chain events, writes to TimescaleDB	Internal to Bun server
Compliance	Bun + Chainalysis REST	KYC webhook handler, sanctions screening	localhost:3001/compliance
PostgreSQL + TimescaleDB	Database	User data, positions, APY history, COND logs	localhost:5432
Redis	Cache + Queue	V(t) anchor cache, BullMQ jobs, WS session registry	localhost:6379
Stellar Soroban	Blockchain	Smart contracts: yield math, vaults, compliance, NFTs	localhost:8000 (local)

01
Smart Contracts — Soroban on Stellar
The on-chain state. Written in Rust. Compiled to WASM.

Contract Architecture
All contracts are deployed on Stellar Futurenet (testnet) or Mainnet. They communicate with each other via cross-contract calls. The Bun backend interacts with them through stellar-sdk by building, signing, and submitting transactions to Horizon. Users NEVER submit transactions directly — Bun owns all signing keys and uses Fee-Bump to sponsor user fees (users pay zero XLM).

🔑  Critical Architecture Rule
No Python code ever signs or submits a Stellar transaction. COND (Python) sends a signed action payload to POST /internal/tx on the Bun server. Bun validates it, builds the Stellar transaction, signs it with the operational keypair, and submits to Horizon. This means all private key material lives in one place: the Bun server environment variables.

Contract 1 — compliance.rs
The gatekeeper. Every other contract calls require_kyc() before allowing financial operations. Must be deployed first.
Function	Parameters	What It Does	Storage Type
verify_kyc()	wallet: Address, hash: BytesN<32>	Writes KYC attestation hash. Called by Bun Compliance Service after Persona verifies user.	Persistent storage keyed by wallet address
check_sanctions()	wallet: Address	Returns true if wallet is sanctioned. Called before any deposit.	Persistent storage — sanctions flag map
require_kyc()	wallet: Address	Panics (reverts tx) if wallet has no attestation. Called by stream_router on deposit.	Read-only check against persistent storage
require_accredited()	wallet: Address	Panics if no accreditation attestation. Called by yield_nft on mint.	Read-only check
set_accredited()	wallet: Address, status: bool	Writes accreditation status. Called by Bun after Parallel Markets confirms.	Persistent storage

Contract 2 — stream_router.rs (Core Product)
Stores the virtual streaming anchor for every user. This is the most important contract. Everything the counter shows comes from the three values this contract stores.
📐  The Math
APY is stored in basis points (bps). 5.21% = 521 bps. Never use floating point in Soroban — it is not supported. All yield calculations use i128 fixed-point arithmetic. Accrued yield = principal × apy_bps × elapsed_seconds ÷ (10000 × 31_536_000). This is the integer approximation of continuous compounding, accurate to 6 decimal places at the amounts we handle.

Function	Parameters	What It Does	Events Emitted
deposit()	amount: i128, apy_bps: u32	Calls compliance.rs require_kyc() first. Stores {principal, apy_bps, sync_ts: current_ledger_ts}. Transfers USDC from user to contract.	DepositEvent {wallet, amount, apy_bps, sync_ts}
harvest()		Calculates accrued = principal × bps × Δt ÷ (10000 × 31536000). Transfers accrued to user. Updates sync_ts to now.	HarvestEvent {wallet, accrued, new_sync_ts}
withdraw()	amount: i128	Harvests all pending yield first, then transfers principal back to user.	WithdrawEvent {wallet, principal, accrued}
get_accrued()	wallet: Address	View function. Returns accrued yield at current ledger time. Used by Bun to verify harvest amounts.	No event — view only
update_apy()	wallet: Address, new_bps: u32	Called by Bun Keeper when oracle detects APY change. Harvests current yield first, then updates bps.	ApyUpdateEvent {wallet, old_bps, new_bps}

Contract 3 — bond_box.rs
Multi-asset vault. Users deposit into a Bond Box and receive LP shares. The vault holds allocation percentages for each underlying asset. LP shares use CAP-46-6 standard fungible token interface.
Function	What It Does
deposit_box(amount, box_id)	Mints LP shares proportional to deposit. If TVL = $100K and user deposits $1K, they get 1% of total shares. On first deposit, 1 share = 1 USDC.
withdraw_box(shares)	Burns LP shares, returns proportional USDC plus accrued yield. Calls stream_router harvest() internally.
rebalance(box_id, new_allocations[])	Called by Bun Keeper only. Swaps assets via core_amm to match new target percentages.
get_nav(box_id)	Reads credit_oracle for each asset NAV, returns weighted total. Used by frontend to show Box value.

Contract 4 — cond_executor.rs
Executes actions proposed by COND agent. Validates mandate bounds before executing. Writes Chain-of-Thought (CoT) log as on-chain event for EU AI Act compliance.
Function	What It Does
execute_action(payload: ActionPayload)	Receives signed payload from Bun server. Validates signature (HMAC shared secret between Bun and Python). Checks mandate_bounds. If valid, executes the rotation or harvest. Emits CoT event.
validate_mandate(wallet, action)	Pure function. Checks action against stored mandate: min_credit_rating, max_risk_level, liquidity_preference. Returns ok/err.
log_cot(wallet, reason, action, confidence)	Writes CoT entry as Soroban event. Immutable. EU AI Act Art.13 compliant. Indexed by Bun Indexer.
update_mandate(wallet, mandate)	Called by Bun when user changes COND settings in UI. Validates mandate params are within allowed range.

Remaining Contracts (Brief)
Contract	Purpose	Key Functions
credit_oracle.rs	Stores PD/LGD/credit_spread per bond issuer. Written by Oracle Service every 4h.	update_credit(issuer, pd_bps, lgd_bps) · get_credit(issuer) · trigger_alert(issuer)
split_config.rs	Stores yield routing rules per user (N destinations, percentages). Applied at harvest time.	set_split(destinations[], percentages[]) · apply_split(wallet, amount) · get_split(wallet)
yield_nft.rs	Mints time-bounded yield strips as transferable tokens. Accreditation-gated via compliance.rs.	mint_stream_pack(position, duration) · redeem(nft_id) · get_npv(nft_id)
core_amm.rs	Multi-asset Stableswap AMM for in-box bond swaps. Newton-Raphson invariant solver in fixed-point Rust.	swap(from, to, amount) · add_liquidity(amounts[]) · get_price(asset_a, asset_b)
creator_pool.rs	Fan-funded yield pools. COND-managed. Creator gets 10% of yield.	create_pool(creator, box_id) · fan_deposit(pool_id, amount) · distribute_yield(pool_id)

02
Bun Backend Monolith
All TypeScript. All Bun. One process locally. Splits at deploy.

Folder Structure
Everything runs as a single Bun process in development. In production on Railway, you can split into separate services by changing the entry point. The code does not change — only which folder is the entry point.

server/
├── index.ts                   ← Bun.serve() entry point, routes all requests
├── stream/
│   ├── ws.ts                  ← WebSocket handler, one connection per user
│   ├── cache.ts               ← Redis: read/write V(t) anchors
│   └── formula.ts             ← V(t) = P × e^(r×Δt) shared math (also on frontend)
├── oracle/
│   ├── nav.ts                 ← Polls Benji API + Reflector every 60s
│   ├── credit.ts              ← CDS spread data every 4h
│   └── twap.ts                ← 30-min TWAP from TimescaleDB
├── keeper/
│   ├── queue.ts               ← BullMQ job definitions
│   ├── compound.ts            ← Auto-harvest when threshold reached
│   └── rebalance.ts           ← Triggers bond_box rebalance on drift > 2%
├── compliance/
│   ├── kyc.ts                 ← Persona webhook handler + on-chain attestation
│   ├── sanctions.ts           ← Chainalysis KYT calls
│   └── geo.ts                 ← IP georestriction middleware
├── indexer/
│   ├── horizon.ts             ← Subscribes to Horizon SSE event stream
│   ├── parser.ts              ← Parses XDR-encoded Soroban events
│   └── writer.ts              ← Writes parsed events to TimescaleDB
├── notifications/
│   └── push.ts                ← Expo Push API: milestone, COND actions, alerts
├── stellar/
│   ├── builder.ts             ← Builds Stellar transactions using stellar-sdk
│   ├── signer.ts              ← Signs with operational keypair (Fee-Bump)
│   └── submitter.ts           ← Submits to Horizon, handles errors + retries
├── routes/
│   ├── deposit.ts             ← POST /api/deposit
│   ├── harvest.ts             ← POST /api/harvest
│   ├── withdraw.ts            ← POST /api/withdraw
│   ├── position.ts            ← GET /api/position/:wallet
│   ├── boxes.ts               ← GET /api/boxes, GET /api/boxes/:id
│   └── internal.ts            ← POST /internal/tx (COND agent calls this)
└── shared/
    ├── types.ts               ← Zod schemas shared with frontend
    ├── redis.ts               ← Redis client singleton
    ├── db.ts                  ← Drizzle ORM + PostgreSQL client
    └── logger.ts              ← Pino structured JSON logging

Service 1 — Stream Service (WebSocket)
SERVICE 1  Stream Service   Bun native WS   :3001/ws
Maintains one WebSocket connection per active user. The single most important service — it is the pipe between the blockchain state and the live counter the user sees.
Responsibilities: 
•	On connect: reads wallet address from JWT token in WS handshake
•	Fetches anchor from Redis: GET conduit:anchor:{wallet} → {principal, apy_bps, sync_ts}
•	Sends ANCHOR_UPDATE message immediately so counter starts without waiting
•	Subscribes to Redis pub/sub channel conduit:events:{wallet} for real-time updates
•	On deposit/harvest events from Indexer: updates Redis, publishes to channel, WS receives, sends new ANCHOR_UPDATE
•	On APY change from Oracle: updates Redis anchor with new apy_bps, sends ANCHOR_UPDATE
•	Handles reconnection: on WS connect always send current anchor (never trust client cache)
•	Multiple devices: stores session IDs in Redis Set conduit:ws:{wallet} → fans out to all
API Endpoints / Events: 
WS connect   : wss://api.conduit.fi/ws?token={jwt}
MSG out      : ANCHOR_UPDATE {principal, apy_bps, sync_ts, wallet}
MSG out      : HARVEST_COMPLETE {accrued, new_sync_ts, new_principal}
MSG out      : COND_ACTION {type, detail, apy_before, apy_after}
MSG out      : RACE_UPDATE {rank, delta, week_apy}
MSG out      : CREDIT_ALERT {issuer, pd_change, action_taken}
Redis KEY    : conduit:anchor:{wallet} TTL:7d
Redis PUBSUB : conduit:events:{wallet}

Service 2 — API Server (REST)
SERVICE 2  API Server   Bun + Hono   :3001/api
Handles all REST API calls from the frontend. Validates JWT, validates input with Zod, builds and submits Stellar transactions, returns results.
Responsibilities: 
•	POST /api/deposit: validates amount, calls compliance.rs check_sanctions, builds deposit() tx, submits, waits for confirmation, updates Redis anchor, returns new anchor
•	POST /api/harvest: calls stream_router get_accrued() to verify amount, builds harvest() tx, applies split_config, submits, updates Redis, sends WS notification
•	POST /api/withdraw: validates sufficient balance, builds withdraw() tx, submits, clears Redis anchor for that wallet
•	GET /api/position/:wallet: reads Redis first (cache hit), falls back to Horizon contract data (cache miss), returns {principal, apy_bps, sync_ts, pending_yield}
•	GET /api/boxes: returns Bond Box configs with live NAV from credit_oracle.rs
•	POST /internal/tx: COND-only endpoint, validates HMAC signature, validates mandate bounds, builds and submits the action transaction
•	All routes use Zod for request validation, Pino for structured logging, Redis for rate limiting
API Endpoints / Events: 
POST /api/deposit       → {tx_hash, anchor: {principal, apy_bps, sync_ts}}
POST /api/harvest       → {tx_hash, accrued, new_anchor, splits_applied[]}
POST /api/withdraw      → {tx_hash, principal_returned, accrued_returned}
GET  /api/position/:w   → {principal, apy_bps, sync_ts, pending_yield_est}
GET  /api/boxes         → [{id, name, apy_bps, tvl, assets[], nav}]
POST /api/split         → {ok, split_config_stored}
POST /internal/tx       → {ok, tx_hash, cot_ledger} (COND only)
GET  /api/leaderboard   → [{rank, handle, apy_7d, box_name}]

Service 3 — Oracle Service
SERVICE 3  Oracle Service   Bun setInterval   :Internal
Polls NAV data from external sources every 60 seconds. Publishes on-chain only when deviation exceeds 0.01% to avoid unnecessary transactions. Critical for accurate APY display.
Responsibilities: 
•	Every 60s: fetches BENJI NAV from Franklin Templeton API (requires partnership)
•	Every 60s: fetches USDY NAV from Ondo Finance API + verifies against Reflector on-chain oracle
•	Dual-source disagreement circuit breaker: if Benji API and Reflector disagree by >0.5%, publish NEITHER — alert and hold last known good value
•	Staleness check: if last update is >5 minutes old, set confidence_score=0, halt AMM swaps
•	TWAP calculation: queries TimescaleDB for 30-min rolling average to protect against flash manipulation
•	If deviation >0.01%: builds update_credit() tx, submits to credit_oracle.rs
•	Publishes NAV update to Redis pub/sub → Stream Service picks up → sends WS update to relevant users
•	Every 4h: fetches CDS spread data (or ETF proxy during dev), writes to credit_oracle.rs
API Endpoints / Events: 
Redis KEY   : conduit:oracle:nav:{asset_id} → {nav, confidence, ts}
Redis KEY   : conduit:oracle:twap:{asset_id} → {twap_30min, ts}
Soroban call: credit_oracle.rs.update_credit(issuer, pd_bps, lgd_bps)
Redis PUBSUB: conduit:oracle:update → {asset_id, old_nav, new_nav, confidence}
Internal API: GET /oracle/status → {assets[], last_update, confidence_scores}

Service 4 — Keeper Service
SERVICE 4  Keeper Service   Bun + BullMQ   :Internal
Runs scheduled financial operations. Uses BullMQ (backed by Redis) for reliable job queuing with retries. Critical for auto-compound and rebalance features.
Responsibilities: 
•	HARVEST_CHECK job (every 15min per user): reads pending yield from Redis, if > user compound_threshold → queues HARVEST_EXECUTE job
•	HARVEST_EXECUTE job: calls POST /api/harvest internally, handles Stellar tx retry on failure, verifies tx landed on-chain before marking job complete
•	REBALANCE_CHECK job (every 1h per box): reads current allocation vs target from bond_box.rs, if drift >2% → queues REBALANCE_EXECUTE
•	REBALANCE_EXECUTE: calls bond_box.rebalance() via core_amm swaps, uses channel accounts for parallel submission
•	CREDIT_CHECK job (every 4h): reads credit_oracle.rs events, if PD increased >20bps → publishes to Redis pub/sub → COND agent evaluates
•	Channel account rotation: maintains pool of 10 pre-funded accounts, Redis tracks availability with TTL locks to prevent double-spend
•	Job deduplication: BullMQ jobId = "harvest:{wallet}" prevents duplicate harvest if user manually triggers while scheduled job is queued
•	Dead letter queue: failed jobs after 5 retries go to DLQ, alert fires via Notification Service
API Endpoints / Events: 
BullMQ Queue: conduit:harvest-check   (cron: */15 * * * *)
BullMQ Queue: conduit:harvest-execute (triggered by check)
BullMQ Queue: conduit:rebalance       (cron: 0 * * * *)
BullMQ Queue: conduit:credit-check    (cron: 0 */4 * * *)
Redis KEY   : conduit:channel:{address}:locked → bool TTL:30s
Redis KEY   : conduit:jobs:dlq → list of failed job IDs

Service 5 — Indexer
SERVICE 5  Indexer   Bun + Horizon SSE   :Internal
The single source of truth for all on-chain events. Subscribes to Horizon SSE once on startup, parses every Soroban contract event, writes to TimescaleDB, fans out to Redis pub/sub for real-time notifications.
Responsibilities: 
•	On startup: reads last_processed_ledger from Postgres, opens Horizon SSE stream with ?cursor={ledger} to resume without missing events
•	Receives raw XDR-encoded Soroban events from Horizon, parses using stellar-sdk xdr.ScVal deserializer
•	Identifies event type from contract_id + topic bytes, routes to appropriate parser
•	DepositEvent → writes to positions table, updates Redis anchor, publishes conduit:events:{wallet}
•	HarvestEvent → writes to harvests table, updates Redis anchor, publishes conduit:events:{wallet}
•	CreditEvent → writes to credit_history table, publishes conduit:oracle:credit:{issuer}
•	CoTEvent (COND) → writes to cond_decisions table, indexed for COND chat queries
•	Checkpoint: writes last_processed_ledger to Postgres every 100 ledgers to support restart
•	The Indexer is the ONLY writer to TimescaleDB for chain-derived data — prevents duplicates
API Endpoints / Events: 
Horizon SSE  : GET {horizon_url}/accounts/{contract}/operations?cursor={ledger}
TimescaleDB  : INSERT INTO positions, harvests, credit_history, cond_decisions
Redis PUBSUB : conduit:events:{wallet} (deposit, harvest events)
Redis PUBSUB : conduit:oracle:credit:{issuer} (credit change events)
Redis PUBSUB : conduit:leaderboard:update (triggers leaderboard recalculation)
Internal API : GET /indexer/status → {last_ledger, events_processed, lag_seconds}

Service 6 — Compliance Service
SERVICE 6  Compliance   Bun + Chainalysis REST   :3001/compliance
Handles all regulatory requirements. KYC attestation from Persona, sanctions screening from Chainalysis, geo-restriction middleware. Writes attestations to compliance.rs on Stellar.
Responsibilities: 
•	POST /compliance/kyc-webhook: receives Persona webhook (HMAC verified), calls Persona API to confirm status, hashes attestation ID with SHA-256, calls compliance.rs verify_kyc() via Bun stellar module
•	Retry queue: if on-chain write fails (Stellar congestion), BullMQ job retries up to 5x — idempotent by design (same hash = no-op)
•	Sanctions check: every new wallet address screened against Chainalysis KYT on registration AND on every transaction >$1000
•	Geo middleware: checks CF-IPCountry header (or IP lookup), rejects sanctioned jurisdictions with 403 before any contract call
•	Accreditation: calls Parallel Markets API, writes to compliance.rs set_accredited() on success
•	All compliance events written to Postgres compliance_log table for audit trail
API Endpoints / Events: 
POST /compliance/kyc-webhook  ← Persona sends here after verification
POST /compliance/screen/:addr ← Internal call before any deposit
POST /compliance/accredit/:addr ← After Parallel Markets confirms
GET  /compliance/status/:addr ← Returns {kyc_ok, sanctions_ok, accredited}
Soroban call: compliance.rs.verify_kyc(wallet, sha256_hash)
Soroban call: compliance.rs.set_accredited(wallet, true)
Chainalysis : POST https://api.chainalysis.com/api/kyt/v2/users

03
COND AI Agent — Python + LangGraph
The autonomous portfolio manager. Separate process. No chain keys.

Architecture
COND runs as a completely separate Python FastAPI process. It has NO access to Stellar private keys. It communicates with the Bun server via HTTP. Its only outputs are: (1) action payloads sent to POST /internal/tx on Bun, and (2) analysis written to Postgres via direct connection.

🔐  Security Model
COND and Bun share a 256-bit HMAC secret stored in environment variables. Every action payload COND sends is signed with this secret. Bun verifies the signature before executing any transaction. Even if COND is compromised, it cannot submit unauthorized transactions — Bun's mandate validator will reject anything outside the user's configured bounds.

LangGraph State Machine — 5 Nodes
Node	What It Does	Inputs	Outputs
OBSERVE	Reads current state from Redis and Horizon. Pulls oracle data, credit scores, current allocations, pending yields.	Redis anchor cache, Horizon contract reads, credit_oracle.rs data	State object: {positions, nav_data, credit_scores, apy_matrix}
REASON	Calls Claude Sonnet 4.6 via Anthropic API with structured prompt. Returns action proposal as JSON tool call.	State object + user mandate + recent CoT history from Postgres	ActionProposal: {action_type, rationale, expected_apy_delta, confidence}
VALIDATE	Validates proposal against user mandate in Python (mirrors Rust logic). Checks min_credit_rating, max_risk, liquidity rules.	ActionProposal + UserMandate from Postgres	ValidationResult: {ok: bool, reason: string}
EXECUTE	Sends signed payload to POST /internal/tx on Bun server. Waits for tx_hash response.	Validated ActionProposal + HMAC signature	{tx_hash, cot_ledger} or error
LOG	Writes full CoT entry to Postgres cond_decisions table. Updates agent memory checkpointer.	Full execution trace	Postgres INSERT, LangGraph checkpoint saved

Trigger Events (when COND evaluates)
COND does NOT run on a fixed schedule for every user — too expensive. It runs on triggers:
Trigger	Source	COND Response
Credit score deterioration	credit_oracle.rs emits CreditAlert, Indexer publishes to Redis, COND subscribes	Evaluate rotation away from affected bond. If confidence >0.85, execute. Else, notify user.
APY differential >25bps	Oracle Service detects better opportunity, publishes to Redis	Evaluate whether rotation improves user APY within mandate. Propose if beneficial.
Compound threshold reached	Keeper Service detects pending yield > user threshold	Trigger harvest + reinvest via /internal/tx
User opens app	Frontend calls GET /api/position, Bun checks last_cond_eval timestamp	If last eval >4h ago, trigger async COND evaluation cycle
Manual user request	User taps "Ask COND to evaluate" in app	Immediate evaluation cycle, result shown in chat

Token Cost Management
Claude Sonnet 4.6 costs ~$0.0135 per COND evaluation (2K input + 500 output tokens). At 40,000 users, hourly evaluation for all would cost $13,000/day. The trigger-based model targets maximum 3 evaluations per user per day = $0.04/user/day. COND Pro at $9.99/month = $0.33/user/day. Margin is comfortable.

04
Data Layer
PostgreSQL + TimescaleDB + Redis

PostgreSQL Schema (Key Tables)
Table	Type	Key Columns	Purpose
users	Regular	wallet_address (PK), kyc_status, sanctions_ok, accredited, created_at	User registry. Source of truth for compliance status.
positions	Regular	wallet (FK), box_id, principal, apy_bps, sync_ts, last_harvest	Current position data. Mirrors what is on-chain. Updated by Indexer.
harvests	TimescaleDB hypertable	wallet, amount, ts, tx_hash, splits_applied[]	Every harvest event. Time-partitioned. Used for total earned calculation.
apy_history	TimescaleDB hypertable	box_id, apy_bps, nav, ts, confidence	APY over time. Used for sparkline charts. Indexed by ts for fast range queries.
cond_decisions	Regular	wallet, action_type, rationale, tx_hash, apy_before, apy_after, ts	COND CoT log. Also written on-chain but queried from here (faster).
mandates	Regular	wallet (PK), min_credit_bps, max_risk_level, compound_threshold, liquidity_pref	User COND configuration. Read by Python agent on every evaluation.
split_configs	Regular	wallet, destinations[] (JSONB), percentages[] (JSONB), updated_at	Yield routing rules. Applied at harvest time by Bun.
nav_samples	TimescaleDB hypertable	asset_id, nav, source, ts	Raw NAV samples for TWAP calculation. 30-min rolling window.
compliance_log	Regular	wallet, event_type, data (JSONB), ts	Audit trail for all compliance events. Never deleted.
leaderboard_cache	Regular	wallet, handle, apy_7d, box_id, rank, computed_at	Materialised leaderboard. Recomputed every 15min by Bun cron.

Critical: TimescaleDB Setup
Two tables MUST be created as hypertables — not regular Postgres tables. If you skip this, time-range queries on months of data will time out. Run these in your migration:
SELECT create_hypertable('harvests', 'ts');
SELECT create_hypertable('apy_history', 'ts');
SELECT create_hypertable('nav_samples', 'ts');

Redis Key Schema
Key Pattern	Type	TTL	Value	Used By
conduit:anchor:{wallet}	String	7 days	JSON: {principal, apy_bps, sync_ts}	Stream Service — the V(t) anchor
conduit:ws:{wallet}	Set	Session	Set of WebSocket session IDs	Stream Service — multi-device fan-out
conduit:oracle:nav:{asset}	String	10 min	JSON: {nav, confidence, ts}	Oracle Service, API server
conduit:oracle:twap:{asset}	String	35 min	JSON: {twap, ts}	AMM swap protection
conduit:channel:{addr}:locked	String	30 sec	"1"	Keeper Service — channel account mutex
conduit:ratelimit:{wallet}	String	1 min	Request count integer	API rate limiting middleware
conduit:session:{jwt_id}	String	15 min	wallet address	JWT session validation
conduit:cond:eval:{wallet}	String	4 hours	timestamp of last COND eval	Trigger logic — prevents over-evaluation

Redis Pub/Sub Channels
Channel	Publisher	Subscribers	Message Payload
conduit:events:{wallet}	Indexer (on every on-chain event)	Stream Service (sends WS to user)	JSON: {event_type, data, ts}
conduit:oracle:update	Oracle Service (on NAV change)	Stream Service (APY display update), COND trigger	JSON: {asset_id, old_nav, new_nav, confidence}
conduit:oracle:credit:{issuer}	Indexer (on CreditAlert event)	COND agent subscriber (triggers evaluation)	JSON: {issuer, pd_old, pd_new, action_required}
conduit:leaderboard:update	Indexer (on harvest events)	Leaderboard recompute job in Keeper	JSON: {wallet, new_apy_7d}
conduit:notification:{wallet}	Any service needing push	Notification Service	JSON: {type, title, body, data}

05
Frontend Wiring
How the UI connects to everything

The Counter — Step by Step
This is the most important flow. Understanding exactly how the number on screen gets there is essential for debugging anything that goes wrong.

Step  Actor          Action                       Technical Detail                          Result
1	User	Opens app / page	Browser/RN loads page	Initial render — counter shows "$0.000000" or MMKV cached value

2	Frontend	Calls GET /api/position/:wallet	HTTP → Bun API server	Response: {principal:10000, apy_bps:521, sync_ts:1711234567}

3	Frontend	Stores anchor in MMKV + state	localStorage equivalent	anchor = {P:10000, r:521/10000/365/86400, t0:1711234567}

4	Frontend	Opens WebSocket	wss://api.../ws?token=jwt	Connection established. Bun WS handler fires.

5	Bun WS	Reads Redis anchor	GET conduit:anchor:{wallet}	Sends ANCHOR_UPDATE message immediately

6	Frontend	Receives ANCHOR_UPDATE	WS message arrives	Updates anchor in state. Counter formula restarts from new anchor.

7	Frontend	Starts RAF loop	requestAnimationFrame 100ms	V(t) = P × e^(r × (now - t0)) runs. Counter ticks.

8	User	Taps Harvest	Button click	POST /api/harvest with JWT header

9	Bun API	Builds harvest() tx	stellar-sdk transaction builder	Fee-Bump wraps it. Submits to Horizon.

10	Stellar	Executes harvest()	Contract calculates accrued	Transaction confirmed in ~5 seconds

11	Indexer	Catches HarvestEvent	Horizon SSE stream	Parses XDR. Gets {wallet, accrued, new_sync_ts}.

12	Indexer	Updates Redis anchor	SET conduit:anchor:{wallet}	New anchor: {principal:10000, apy_bps:521, sync_ts:NEW_TS}

13	Indexer	Publishes to Redis	PUBLISH conduit:events:{wallet}	{event_type:"HARVEST", accrued: 14.20, new_sync_ts}

14	Bun WS	Receives pub/sub message	Redis subscriber fires	Sends HARVEST_COMPLETE + new ANCHOR_UPDATE to user WS

15	Frontend	Counter resets	HARVEST_COMPLETE received	Pending yield resets to $0.000000. Counter restarts from new sync_ts.


WebSocket Message Protocol
All messages are JSON. The frontend handles these message types:
Message Type	Direction	Payload Fields	Frontend Action
ANCHOR_UPDATE	Server → Client	principal, apy_bps, sync_ts, wallet	Update counter anchor. Restart V(t) calculation from new values.
HARVEST_COMPLETE	Server → Client	accrued, new_sync_ts, splits_applied[]	Show harvest success toast. Reset pending display. Animate confetti.
COND_ACTION	Server → Client	action_type, rationale, apy_before, apy_after	Show COND notification banner. Update COND activity log.
APY_UPDATE	Server → Client	box_id, old_apy_bps, new_apy_bps	Update APY display. Recalculate rate display. Show delta indicator.
CREDIT_ALERT	Server → Client	issuer, severity, message	Show amber overlay alert. Update bond credit indicator in UI.
RACE_UPDATE	Server → Client	rank, delta, week_apy, prize_pool	Update leaderboard position. Show toast if rank changed.
PING	Server → Client	ts	Client responds with PONG. Keeps connection alive.
AUTH	Client → Server	jwt_token	Sent on connect. Bun validates, maps socket to wallet address.

API Call Patterns from Frontend
Action	HTTP Call	Request Body	Success Response	On Error
Load page	GET /api/position/:wallet	—	anchor: {principal, apy_bps, sync_ts}	Show zero counter, prompt to deposit
Deposit	POST /api/deposit	{box_id, amount, wallet}	tx_hash, new_anchor	Show error toast, keep deposit modal open
Harvest	POST /api/harvest	{wallet}	tx_hash, accrued, new_anchor	If <$0.001 show "nothing to harvest"
Set split	POST /api/split	{destinations[], percentages[]}	ok: true	Validation error shows inline
Get boxes	GET /api/boxes	—	[{id, name, apy_bps, tvl, description}]	Show cached data with stale indicator
Get leaderboard	GET /api/leaderboard?period=7d	—	[{rank, handle, apy, box}]	Show last cached leaderboard
COND mandate	PUT /api/mandate	{min_credit, max_risk, threshold}	ok: true, next_eval: timestamp	Inline validation feedback

State Management (Zustand)
The frontend uses Zustand for global state. Three stores:
Store	State Shape	Updated By
portfolioStore	{anchor, pending_yield, total_earned, last_harvest, apy_bps, box_id}	WS ANCHOR_UPDATE messages + harvest responses
condStore	{status, last_action, mandate, activity_log[], evaluation_ts}	WS COND_ACTION messages + API responses
raceStore	{rank, week_apy, prize_pool, leaderboard[], countdown_ts}	WS RACE_UPDATE messages + GET /api/leaderboard

06
Complete User Flow Walkthroughs
Every major action end-to-end

Flow 1 — New User Onboarding
1	Frontend	User enters email and taps "Create Wallet"	—	stellar-sdk generates keypair locally

2	Frontend	Private key encrypted with device PIN, stored in SecureStore	Expo SecureStore API	Key never leaves device. Bun never sees private key.

3	Bun API	POST /api/register called with wallet address	POST /api/register {wallet}	Bun creates user record in Postgres, screens via Chainalysis

4	Frontend	Persona KYC SDK opens in-app (no redirect)	Persona React Native SDK	User completes selfie + ID in 3 minutes

5	Persona	Sends webhook to POST /compliance/kyc-webhook	HMAC-signed webhook	Bun verifies, calls compliance.rs verify_kyc()

6	Bun	Fee-Bump transaction: compliance.rs.verify_kyc(wallet, hash)	Stellar Futurenet tx	User is now KYC-verified on-chain

7	Frontend	Deposit screen: user enters amount, selects Bond Box	—	POST /api/deposit

8	Bun	Validates compliance, builds deposit() tx, submits	stellar-sdk + Horizon	Tx confirmed in ~5s

9	Bun WS	Sends ANCHOR_UPDATE to newly opened WebSocket	Redis → WS	Counter starts ticking


Flow 2 — COND Agent Takes Action
1	Indexer	Receives CreditDeteriorated event from Stellar	Horizon SSE	German Bund credit_spread increased 40bps

2	Indexer	Publishes to Redis pub/sub	PUBLISH conduit:oracle:credit:BUND_2027	{pd_old:120, pd_new:160, action_required:true}

3	COND	Redis subscriber fires in Python FastAPI	asyncio subscriber	Triggers LangGraph evaluation for all users holding BUND_2027

4	COND OBSERVE	Reads positions, NAV, credit data from Redis + Horizon	Redis GET, Horizon reads	State: {bund_position:20%, new_pd:160bps, usdy_available:true}

5	COND REASON	Calls Claude Sonnet 4.6 with structured prompt	Anthropic API call	Returns: {action:"rotate_to_usdy", allocation:8%, rationale:"...", confidence:0.91}

6	COND VALIDATE	Python mandate check	Local function call	min_credit_rating:AA passes. User allows BBB+. Action approved.

7	COND EXECUTE	POST /internal/tx on Bun with HMAC-signed payload	HTTP to localhost:3001	Bun verifies HMAC signature

8	Bun	Validates mandate in TypeScript (mirrors Python)	TypeScript mandate validator	Second validation layer passes

9	Bun	Builds + submits bond_box.rebalance() transaction	stellar-sdk + Horizon	Tx hash returned to COND

10	COND LOG	Writes full CoT to Postgres + responds to Bun	Postgres INSERT	cond_decisions table updated

11	Indexer	Catches RebalanceEvent from Stellar	Horizon SSE	Publishes conduit:events:{wallet}

12	Bun WS	Sends COND_ACTION + ANCHOR_UPDATE to user	Redis → WS	User sees notification: "COND rotated 8% to USDY +21bps"


07
Deployment & Infrastructure
From localhost to production

Local Development Setup
One command starts everything. No manual setup required after initial install.

version: "3.8"
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    ports: ["5432:5432"]
    environment: { POSTGRES_PASSWORD: conduit, POSTGRES_DB: conduit }
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes

  stellar:
    image: stellar/quickstart:latest
    ports: ["8000:8000"]    # Horizon API + Soroban RPC
    command: --standalone --enable-soroban-rpc

  bun:
    build: ./server
    ports: ["3001:3001"]
    depends_on: [postgres, redis, stellar]
    env_file: .env
    volumes: [./server:/app]  # hot reload

  agent:
    build: ./agent
    ports: ["8001:8001"]
    depends_on: [postgres, redis]
    env_file: .env.python
    volumes: [./agent:/app]

volumes:
  postgres_data:

Environment Variables
Variable	Service	Value Example	Purpose
STELLAR_SECRET_KEY	Bun	S...xxxxx (Stellar keypair)	Operational wallet that signs all user transactions (Fee-Bump)
HORIZON_URL	Bun	http://localhost:8000	Stellar Horizon API endpoint
SOROBAN_RPC_URL	Bun	http://localhost:8000/soroban/rpc	Soroban contract read endpoint
COMPLIANCE_CONTRACT	Bun	C...xxxxx (deployed contract ID)	compliance.rs contract address
STREAM_ROUTER_CONTRACT	Bun	C...xxxxx	stream_router.rs contract address
BOND_BOX_CONTRACT	Bun	C...xxxxx	bond_box.rs contract address
REDIS_URL	Bun + Python	redis://localhost:6379	Redis connection
DATABASE_URL	Bun + Python	postgresql://localhost:5432/conduit	Postgres connection
COND_HMAC_SECRET	Bun + Python	256-bit random hex	Shared secret for COND action signature verification
ANTHROPIC_API_KEY	Python	sk-ant-...	Claude Sonnet 4.6 for COND reasoning
PERSONA_WEBHOOK_SECRET	Bun	whsec_...	Persona webhook HMAC verification
CHAINALYSIS_API_KEY	Bun	api key string	Chainalysis KYT sanctions screening
JWT_SECRET	Bun	256-bit random hex	User session JWT signing

Production Deployment (Railway)
Service	Platform	Cost (launch)	Cost (50K users)
Bun backend	Railway — deploy from GitHub	Free tier	$50/month
Python COND agent	Railway	Free tier	$30/month
PostgreSQL + TimescaleDB	Railway Postgres	$5/month	$25/month
Redis	Railway Redis	Free tier	$10/month
Frontend (Next.js)	Vercel — auto-deploy	Free tier	$20/month
Mobile (React Native)	Expo EAS Build + Stores	Free (30 builds/month)	$29/month
Stellar Futurenet	Free (testnet)	$0	$0
Stellar Mainnet fees	Fee-Bump sponsorship	~$50/month	~$1,050/month
Claude API (COND)	Anthropic pay-per-use	~$50/month	~$1,200/month
Chainalysis KYT	Paid tier required for production	$500/month	$2,000/month
TOTAL	—	~$605/month	~$4,414/month

08
Security Architecture
Every attack surface and its mitigation

Attack Vector	Risk Level	Mitigation
Private key theft	CRITICAL	Keys stored in Bun env vars only. Never in DB, never in logs, never sent over any API. Fee-Bump key is operational only — cannot drain contract funds.
COND unauthorized actions	HIGH	HMAC signature verification on /internal/tx. TypeScript mandate validator as second layer. Rust contract validate_mandate() as third layer. All three must pass.
Oracle manipulation (flash attack)	HIGH	30-min TWAP check before any AMM swap. If spot price deviates >0.5% from TWAP, swap reverts. Dual-source disagreement circuit breaker halts oracle updates.
KYC webhook spoofing	HIGH	Persona HMAC signature verified on every webhook. Unverified webhooks rejected with 401 before any processing.
Double-harvest exploit	MEDIUM	Harvest idempotency: BullMQ deduplication by jobId. Contract sync_ts update is atomic — second call in same block is a no-op.
Reentrancy in harvest()	MEDIUM	Rust ownership model prevents reentrancy by default. Explicit checks-effects-interactions pattern in contract logic.
Sybil attacks on KYC	MEDIUM	Persona biometric deduplication. One real identity = one attestation hash. On-chain attestation is per wallet address.
SQL injection	LOW	All queries via Drizzle ORM parameterised prepared statements. Raw SQL never used.
JWT theft	LOW	15-minute access token TTL. HTTP-only cookie for refresh token. JTI claim stored in Redis for revocation.
Rate limiting bypass	LOW	Redis-backed rate limiter per wallet address. IP-based secondary limit. Cloudflare WAF in production.

Build Order for Fellowship MVP
1. docker-compose up  →  2. compliance.rs  →  3. stream_router.rs  →  4. Bun WS + API  →  5. Frontend wired  →  6. 5 testnet users
COND, bond_box, NFTs, Creator Pools — all post-submission. Get the counter working with real users first.

