PART 01
The Product
What Conduit is — unchanged from v5.0

The One-Paragraph Pitch
Conduit lets anyone deposit money into tokenized government bonds and watch a live counter tick up every second — earned yield, accruing continuously. Split that stream to multiple wallets simultaneously. Package future yield as a tradeable NFT. Copy the portfolios of top earners. Let an AI agent called COND autonomously manage your portfolio. The counter is client-side math running on the V(t) = P × e^(r × Δt) formula. Settlement is lazy and on-chain. The money is real.

$140T
Global Bond Market
Total addressable	$1B+
Stellar RWA TVL
Q1 2026	5.2%
Bond Box APY
vs 0.5% savings	$0.00001
Stellar Payment Fee
Soroban calls higher	3
Languages Required
TS · Python · Rust

The 7 Features
#	Feature	What It Does	Who	Build Phase
1	Yield Counter + Bond Boxes	Live ticking balance via V(t) client math. Lazy on-chain settlement.	Everyone	Core — first
2	Stream Splitting	Route harvested yield to N destinations simultaneously.	Power users	Phase 2
3	COND AI Agent	Autonomous portfolio manager. Rule-based first, LangGraph second.	Active investors	Phase 3
4	Yield NFTs	Time-bounded yield strips as tradeable NFTs. Accredited investors only.	Yield traders	Phase 4 (gated)
5	Social Layer	Yield Races, pseudonymous leaderboards, copy portfolios, badges.	Community	Phase 4
6	Creator Pools	Fans deposit; creator earns yield share. COND-managed autonomously.	Creators	Phase 5 (EU first)
7	Spend Mode	Virtual debit card funded by yield stream. Principal untouched.	All users	Phase 5

PART 02
Complete Tech Stack (Corrected)
All version pins and citations fixed

Layer 1 — Blockchain & Smart Contracts
⚠  Fee Clarification (v5.0 was inconsistent)
Simple Stellar payments: 100 stroops = 0.00001 XLM ≈ $0.000003. Soroban smart contract calls: resource fees on top of base fee, typically $0.0001–$0.001 per call depending on CPU/disk usage. The "$35/day at 50K users" figure in the cost table assumes Soroban-level fees for contract interactions. This is plausible but check soroban resource estimator per contract before committing to the number.

Smart Contracts — Full List
Contract	Purpose	Key Functions	Est. Lines
stream_router.rs	Core virtual streaming. Stores principal, APY, sync_ts. No per-ledger writes. All yield calculated from formula at interaction time.	deposit(), withdraw(), harvest(), get_accrued()	~600
bond_box.rs	Multi-asset vault. Holds interface to BENJI + USDY token contracts. Issues LP shares using CAP-46-6 token standard (not SEP-0056 — that does not exist).	deposit_box(), rebalance(), get_nav(), withdraw_box()	~900
split_config.rs	Routes harvested yield to N destinations at harvest time.	set_split(), apply_split(), update_destination()	~400
yield_nft.rs	Time-bounded yield strips as transferable tokens. Accreditation check via compliance.rs before mint.	mint_stream_pack(), redeem(), transfer(), get_npv()	~800
cond_executor.rs	Receives signed action payloads from Bun server (not directly from Python). Validates mandate bounds. Writes CoT event.	execute_action(), validate_mandate(), log_cot()	~700
creator_pool.rs	Creator yield-share pools. COND-managed via cond_executor.rs. ART classification — creator does NOT manage investments.	create_pool(), fan_deposit(), distribute_yield()	~600
compliance.rs	KYC attestation hash store, sanctions flag store, accreditation attestation. All written by Bun compliance service.	verify_kyc(), check_sanctions(), require_accredited()	~500
credit_oracle.rs	Stores PD/LGD per bond issuer. Written by Oracle Service. COND reads this to decide rotations.	update_credit(), get_credit_score(), trigger_event()	~500
core_amm.rs	Multi-asset Stableswap for in-box bond swaps. Newton-Raphson invariant solver. Hardest contract to write correctly.	swap(), add_liquidity(), remove_liquidity(), get_price()	~1200

Stellar Primitives
✓  CAP-46-6 — Not SEP-0056
Bond Box LP tokens are issued as standard Soroban fungible tokens following the CAP-46-6 token interface (the official Soroban token standard). SEP-0056 was incorrectly cited in v5.0 as a finalized standard — it does not exist. Any Stellar-native wallet that supports Soroban tokens will be compatible via CAP-46-6.

Primitive	What It Does	Why It Matters
Fee-Bump Transactions	Bun server wraps user transactions and pays all fees from its operational wallet.	Users pay zero XLM. Entire onboarding cost to Conduit: ~$0.001 per user per day at typical interaction rates.
Muxed Accounts	One G-address hosts millions of virtual sub-accounts via unique muxed IDs.	Track individual user positions inside a Bond Box pool without separate storage per user. Critical for creator pools with thousands of fans.
Channel Accounts	Multiple auxiliary wallets submit transactions in parallel.	When 10,000 users harvest simultaneously, channel accounts prevent sequential bottleneck from one wallet's sequence number.
Horizon SSE Streaming	Server-sent event stream from Stellar's Horizon API layer.	Bun Indexer subscribes once and receives all contract events (deposits, harvests, oracle updates) in real-time without polling.
Soroban Events (CAP-0046-6)	Smart contracts emit structured events readable by Horizon.	Single event parsing path in the Indexer. No separate handling for classic vs smart contract operations.

Layer 2 — Mobile Application
Package	Version	Use in Conduit	Why
react-native	Current stable	App shell, navigation, screens	Use current stable — do not pin to 0.74, it will be outdated before you build
expo	Current stable SDK	Build, OTA updates, device APIs	Free tier sufficient for launch. EAS Build for App Store.
react-native-reanimated	3.x	Yield counter animation (60fps), stream bar animations	Runs on UI thread via worklets — zero JS bridge lag for the counter
@shopify/react-native-skia	Latest	Stream bar canvas, animated arcs, custom visualizations	GPU-accelerated canvas — only library that handles smooth custom curves on mobile
victory-native-xl	Latest	Portfolio charts, APY history, Bond Box performance	Built on Skia — 60fps charts, not SVG-based like recharts
react-native-mmkv	2.x	Virtual balance anchor cache (principal + apy + ts)	50x faster than AsyncStorage — critical for counter hydration on app open
zustand	4.x	Global state: wallet, portfolio, COND status	Minimal boilerplate. Works identically on React Native and Next.js web.
@tanstack/react-query	5.x	Server state, Horizon API caching, background refetch	stale-while-revalidate pattern prevents loading spinners on navigation
react-navigation	7.x	Tab navigator, stack navigator, modals	v7 is current. v6 API is different — do not mix them.
@gorhom/bottom-sheet	4.x	Deposit flow, harvest confirm, split config, NFT mint sheets	Gesture-driven — better UX than Modal for financial flows
lottie-react-native	Latest	Onboarding animations, COND "thinking" state, success states	JSON animations from LottieFiles — no After Effects required
react-native-haptic-feedback	Latest	Ledger tick pulse, harvest thump, race rank change	Makes the counter feel physical — underrated retention driver
@stellar/freighter-api	Latest	External wallet connect for power users	Official Stellar wallet browser extension API
@stellar/stellar-sdk	Current stable	Build transactions, Horizon queries, event parsing	Official SDK. Verify current version on npm before starting.

Layer 3 — Web Application
Package	Use	Notes
next (App Router)	Institutional portal, landing page, internal API routes	API routes handle COND webhook callbacks and Horizon event forwarding
tailwindcss v4	All styling — dark dashboard, Bond Box cards, leaderboard	v4 uses CSS-first config — no PostCSS, no tailwind.config.js
framer-motion	Web yield counter, page transitions, chart entry animations	Framer Motion 11 has a new API — check migration guide if upgrading from 10
shadcn/ui	Data tables, command palette, dialogs, institutional portfolio view	Copy-paste library over Radix UI — no package version to track
recharts	Desktop APY charts, TVL history, allocation pie	SVG-based — fine for desktop. Not suitable for mobile (use Skia there).
@tanstack/react-table	Bond performance table, trade history, institutional view	Headless — full rendering control
next-auth	Institutional email + wallet signature login	JWT sessions. Wallet signature flow needs custom credential provider.

Layer 4 — Backend Services (All Bun, All TypeScript)
All services run on Bun. All TypeScript. One language for the entire backend. The Compliance service was on Node.js 20 in v5.0 — changed to Bun. The Indexer was Rust in v5.0 — changed to Bun. Rust stays for smart contracts only. Python stays for COND agent only.

🔁  COND Architecture Correction
v5.0 showed COND (Python) signing and submitting Stellar transactions directly. This is wrong — it means Python holds a private key and has direct chain access. The correct flow: COND reasons and proposes → calls POST /internal/tx on Bun server → Bun validates + builds tx + signs with stored keypair + submits to Horizon. Python never holds keys. Stellar SDK logic lives entirely in TypeScript.

Service	Runtime	Purpose
Stream Service	Bun + Hono + native WS	Virtual balance anchor cache in Redis. WebSocket feed to mobile app. ANCHOR_UPDATE messages on every harvest/deposit.
Oracle Service	Bun + Hono + setInterval	Polls Benji API + Reflector every 60s. Computes TWAP. Writes NAV to credit_oracle.rs if deviation > 0.01%. Confidence score per source.
Keeper Service	Bun + Hono + BullMQ	Monitors harvest thresholds. Queues compound jobs. Rotates through channel accounts. Emits Stellar txs via stellar-sdk.
COND Orchestrator	Python 3.12 + FastAPI + LangGraph	AI agent loop. Observe → Reason → Propose → calls Bun /internal/tx. CoT logs written to cond_executor.rs via Bun. Holds NO keys.
Notification Service	Bun + Hono + Expo Push API	Push notifications: milestone, COND action, Yield Race rank change, credit alert. Subscribes to internal event bus.
Compliance Service	Bun + Hono + Chainalysis REST	Persona KYC webhook handler. Chainalysis KYT calls. Writes KYC hash to compliance.rs. DAC8 export endpoint.
Indexer	Bun + Hono + Horizon SSE	Streams Horizon SSE. Parses contract events. Writes to TimescaleDB via Drizzle. Exposes REST/GraphQL API over indexed data.

Layer 5 — Data
Store	What Lives Here	Why
PostgreSQL 16	User accounts, KYC status, Bond Box configs, COND mandates, NFT listings, creator pools, split configs	ACID compliance required for financial data. Row-level security for multi-tenant isolation.
TimescaleDB (extension on Postgres)	APY history per box, portfolio value over time, yield earned per day, oracle NAV history, TVL metrics	Hypertable auto-partitioning. 10x compression vs plain Postgres for time-series. Sub-10ms chart queries.
Redis 7	Virtual balance anchors (principal+apy+ts per user), BullMQ queues, WebSocket session registry, rate limiting	Sub-millisecond anchor reads for counter sync. BullMQ needs Redis. WS session data for reconnection.
Drizzle ORM	All Postgres queries from all Bun services	TypeScript-first, no runtime overhead, schema migrations tracked in files. Better Bun compatibility than Prisma.

Layer 6 — Real-Time
Component	Technology	How It Works
WebSocket Server	Bun native WS (Bun.serve with websocket handler)	One WS connection per active user. On harvest or deposit, Stream Service sends ANCHOR_UPDATE {principal, apy, ts}. Client recalculates V(t) from new anchor.
Ledger Event Feed	Horizon SSE — /accounts/{contract}/operations	Indexer subscribes once. Receives all contract events in real-time. Parses, writes to TimescaleDB, fans out to internal event bus.
Oracle Feed	setInterval(60000) in Oracle Service	Polls Benji API and Reflector. Detects staleness. Publishes on-chain only on deviation. Triggers COND evaluation cycle.
Internal Event Bus	Redis pub/sub between Bun services	Oracle event → Notification Service listens → sends push. Harvest event → Stream Service listens → sends WS update. Keeps services decoupled.
Push Notifications	Expo Push API → APNs / FCM	Notification Service receives events from Redis pub/sub. Sends pushes with Expo token stored at KYC time.
Client Sync Messages	Custom JSON over WebSocket	ANCHOR_UPDATE {principal, apy, ts} / HARVEST_COMPLETE {amount, new_anchor} / COND_ACTION {type, detail} / RACE_UPDATE {rank, delta}

Layer 7 — Auth & Wallet
Flow	Technology	Correct Architecture
Retail Wallet	stellar-sdk + Expo SecureStore	App generates keypair on first launch. Private key encrypted and stored in device secure enclave. Never leaves device except on user-initiated export.
KYC	Persona SDK (in-app, no redirect)	Selfie + ID → Persona returns attestation ID → Bun Compliance Service calls Persona API to verify → hashes result → writes to compliance.rs on-chain.
Accreditation	Parallel Markets API	Called once only for Yield NFT access. Bun Compliance Service calls Parallel Markets → stores attestation on-chain via compliance.rs require_accredited().
Sanctions Screening	Chainalysis KYT REST API	Every new wallet address screened by Bun Compliance Service on registration. Re-screened on transactions above $1,000.
Power User Wallet	Freighter browser extension API	@stellar/freighter-api. Signs transactions externally. Compliance.rs KYC attestation still required.
Session	JWT (15min) + refresh token (30 days) in HTTP-only cookie	JWT issued on wallet signature verification in Bun Stream Service. Refresh tokens stored in Postgres.

Layer 8 — Oracle Infrastructure
Oracle	Source	Frequency	Usage	Failure Mode
Benji NAV	Franklin Templeton API (requires partnership agreement — not public)	60 seconds	Bond Box virtual balance calculation, AMM pricing	If FT API goes down: freeze AMM swaps, use Reflector as fallback for streaming calc only. Alert COND.
USDY NAV	Ondo Finance API + on-chain rebasing events from Horizon	60 seconds	Bond Box pricing, yield counter APY feed	Ondo USDY rebases on-chain — Horizon SSE catches it. API is secondary confirmation.
Reflector Oracle	Decentralized Stellar oracle network	Every ~5 seconds (each ledger)	Secondary NAV confirmation, anomaly detection	Single point of failure if Reflector goes offline — this is why Benji API + Reflector dual-source matters.
CDS Spread Data	Refinitiv/Bloomberg aggregated feed via broker API	Every 4 hours	Credit Oracle — detects deterioration before rating agencies	Most expensive dependency. Free alternative: track bond ETF prices as a proxy until you can afford Bloomberg.
TWAP (30-min)	Computed from Horizon event history in TimescaleDB	Continuous	Anti-manipulation protection for AMM swaps	Not a data source — computed internally. Only fails if TimescaleDB indexer falls behind.

Layer 9 — COND Agent (Corrected Architecture)
⚠  LangGraph Version Warning
v5.0 pinned LangGraph to 0.1. The API changed significantly between 0.1 and current versions. Do not pin. Install current stable at build time. The concepts (stateful graph, checkpointer, HOTL) are stable — the API surface is not.

Component	Technology	Function	Key Correction from v5.0
Agent Framework	LangGraph current stable (Python)	Stateful graph: Observe → Reason → Propose → Validate → Execute	No change to concept. Remove version pin.
LLM — Primary	Claude Sonnet 4.6 (model: claude-sonnet-4-6)	Reasoning step. CoT generation. Structured JSON action proposal.	Updated from "Claude 3.5 Sonnet" — use the correct model string in API calls.
LLM — Fallback	GPT-4o (OpenAI API)	Failover if Anthropic API unavailable	No change.
LLM — Chat	Claude Haiku (latest) via Anthropic API	COND chat Q&A from CoT log. Cheap, fast inference.	No change to concept.
Tx Submission	POST /internal/tx on Bun server	COND sends signed action payload → Bun builds stellar tx → Bun submits	CRITICAL FIX: Python never holds Stellar private keys. All chain interaction via Bun.
Mandate Validator	Typescript in Bun (not Rust library)	Validates COND payload against user mandate before submitting tx	Simplified from v5.0 "custom Rust library" — same logic, no extra Rust binary needed solo.
CoT Logger	cond_executor.rs Soroban events	Every COND decision written on-chain with reason + confidence	No change.
Memory	PostgreSQL LangGraph Checkpointer	Persists graph state across sessions	No change.
Kill Switch	App → Bun REST → Redis flag → COND checks flag	mandate_paused flag checked at start of every COND evaluation cycle	No change.

Layers 10-12 — Infrastructure, Testing, Cross-Chain
Unchanged from v5.0 except: Rust-based Indexer/Router services removed (merged into Bun monolith). All other infrastructure, testing strategy, and cross-chain plan identical.

💡  Solo Dev Infrastructure Rule
Run one Bun process locally. All services are folders inside server/. Docker Compose starts Postgres + TimescaleDB + Redis + Stellar Quickstart (local Stellar node) + one Bun process + one Python process (COND). That is 6 containers. Single command: docker-compose up. Do not split into separate Bun processes until a measured performance problem forces it.

PART 03
AI Tools
Development tools + product AI + UX AI

Category A — AI Tools for Building Conduit
Tool	Category	Use Case	What It Does	Cost
Claude Sonnet 4.6	Code Generation	Smart Contracts	Write Soroban Rust, review logic, explain Stellar SDK. Best for complex financial math and security review.	API
GPT-4o	Code Generation	Bun Services	TypeScript service boilerplate, API routes, test stubs.	Paid
GitHub Copilot	Inline Completion	All layers	Autocompletes Rust, TypeScript, Python. Learns your codebase.	$10/mo
v0 by Vercel	UI Generation	Next.js web	Prompt → React component. "Bond Box card dark theme APY counter" → working JSX.	Free tier
Cursor IDE	AI Editor	Full codebase	AI sees your entire project, not one file. Best for cross-service refactoring.	$20/mo
CodiumAI	Test Generation	All layers	Give it a function → generates edge case tests automatically.	Free
Mintlify	Docs Generation	API Docs	Auto-generates API documentation from code comments.	Free
Snyk Code	Security Scan	Soroban Contracts	Static analysis for reentrancy, overflow, oracle manipulation in Rust.	Free tier

Category B — AI Embedded in Conduit
Feature	Model	What It Does	Phase
COND Agent	Claude Sonnet 4.6 (claude-sonnet-4-6)	Autonomous portfolio manager. LangGraph stateful graph. CoT logged on-chain.	Phase 3
COND Chat	Claude Haiku (latest)	Answers user questions from its own CoT log. "Why did you sell that bond?"	Phase 3
APY Forecast	Custom LSTM (PyTorch)	7-day APY forecast per Bond Box. Trained on Horizon historical data.	Phase 4
Weekly Report	Claude Sonnet 4.6	Plain-English weekly summary. "COND made 3 moves. You beat 78% of users."	Phase 3
Sentiment Monitor	NewsAPI + simple NLP classifier	Monitors issuer news. Flags risk: "News risk: Apple Corp bonds."	Phase 4
Anomaly Alerts	Isolation Forest (scikit-learn)	Detects unusual APY drops or credit events. Push notification.	Phase 3

PART 04
UX Design System
Unchanged from v5.0 — summarised here

8 Core Principles (summary)
#	Principle	Key Implementation
01	Counter First	After deposit confirms, animate directly to ticking counter. Never a success/confirmation page first.
02	Complexity One Tap Away	Bond Box shows name + APY + risk. "Advanced" reveals assets, oracles, contract address.
03	Haptics Make Money Physical	Ledger tick: ImpactLight. Harvest: NotificationSuccess. Race rank change: ImpactMedium.
04	COND Is a Character	Every action explained in plain English. "I rotated 8% to USDY. Credit risk increased 0.4bps."
05	Honest Labels	Counter labeled "Virtual Accrual". Settlement called "Harvest". Tooltip shows the formula.
06	Social Proof Always Visible	Bond Box: "12,847 users earning here." Home: "You're in the top 23%."
07	3-Screen Onboarding	Demo counter (no login) → Pick Bond Box → KYC + Deposit. Under 5 minutes.
08	Dark Mode Default	Electric teal on OLED black. Counter glows. Light mode exists but is secondary.

Design Tokens
Token	Dark Value	Light Value	Usage
--color-surge	#00C896	#007A5E	Counter, CTA buttons, positive values, active states
--color-sky	#38BDF8	#0EA5E9	COND agent, info states, secondary actions
--color-gold	#F59E0B	#D97706	Yield Race, badges, premium, warnings
--color-rose	#E11D48	#BE123C	Alerts, credit events, negative delta, kill switch
--color-bg-primary	#0D0F1A	#FAFBFC	App background
--color-bg-card	#141620	#FFFFFF	Card surfaces
--color-text-primary	#F9FAFB	#0D0F1A	All primary text
--color-text-muted	#6B7280	#475569	Labels, captions, secondary info
--font-display	Sora	Sora	Counter, large numbers, headlines
--font-body	Inter	Inter	Body text, descriptions, labels
--font-mono	JetBrains Mono	JetBrains Mono	Addresses, hashes, technical values, amounts

PART 05
Backend Development Breakdown
Priority order · Service dependencies · Where you will actually get stuck · How to test

How to Read This Section
This section exists because "build the backend" is not a useful instruction. The backend has 7 services, 9 contracts, 4 data stores, and a Python agent with a dependency on an external LLM API. Each component has specific prerequisites, specific failure modes, and specific things that look simple but are not.

Status labels: BLOCKER = nothing else works until this is done. HIGH = major features depend on it. MEDIUM = can parallel-track. LOW = can skip for months.

🔴  The Most Important Rule for Solo Backend Development
Build one thing at a time. Test it end-to-end before moving to the next service. If you have half-built versions of 4 services, you will spend 80% of your time debugging cross-service issues where the problem could be in any of the 4. Finish each service to the point where you have a working test that proves it works, then move on.

The Dependency Graph
Before building anything, understand what depends on what. Getting this wrong means you build something that cannot be tested because its dependencies do not exist yet.

Service / Contract	Hard Dependencies (must exist first)	Soft Dependencies (can stub)
compliance.rs	Stellar local node (Quickstart)	Nothing — first contract to build
stream_router.rs	compliance.rs deployed	Oracle NAV values (stub with hardcoded APY)
bond_box.rs	stream_router.rs, compliance.rs	BENJI token contract address (use test token)
Bun Stream Service	Redis running, compliance.rs + stream_router.rs deployed	WebSocket clients (test with wscat)
Bun Oracle Service	Reflector testnet endpoint, Redis running	Benji API (stub with fixed NAV during dev)
Bun Keeper Service	BullMQ (Redis), stream_router.rs, channel accounts set up	Nothing else — runs independently
Bun Compliance Service	compliance.rs deployed, Postgres running	Persona (use sandbox), Chainalysis (use sandbox)
Bun Indexer	Horizon SSE endpoint, TimescaleDB running, all contracts deployed	Nothing — just listens
split_config.rs	stream_router.rs (split applies on harvest)	Nothing else
credit_oracle.rs	Bun Oracle Service (writes to it)	COND (can test oracle separately)
cond_executor.rs	compliance.rs (mandate check), credit_oracle.rs	COND backend (can test with mock payloads)
Python COND Orchestrator	Bun Stream Service /internal/tx endpoint, credit_oracle.rs readable, Redis (for kill switch flag)	LLM API (use rule-based Phase 1 first)
core_amm.rs	bond_box.rs, credit_oracle.rs (for NAV pricing)	Nothing else — can test AMM math in isolation
yield_nft.rs	compliance.rs (accreditation check), stream_router.rs (yield position)	NFT marketplace UI
Bun Notification Service	Expo push token stored in Postgres, Redis pub/sub running	Everything else (push last)

Priority List — Strict Build Order

P1  Local Environment + Stellar Quickstart   2–3 days   [BLOCKER]
Before writing a single line of application code, get the local environment working. This sounds boring. It is boring. It is also the difference between debugging your actual code and debugging your environment for the next 6 months.
If you skip this and start writing code against the live testnet, every iteration takes 5–10 seconds for network round-trips instead of milliseconds locally. Over a full build, this costs weeks.
•	docker-compose.yml: Postgres 16 + TimescaleDB extension, Redis 7, Stellar Quickstart (stellar/quickstart:latest --standalone --enable-soroban-rpc)
•	Verify soroban-cli can deploy to localhost:8000. Run: soroban contract deploy --wasm hello_world.wasm --source <key> --rpc-url http://localhost:8000/soroban/rpc
•	Verify stellar-sdk (TypeScript) can submit a payment to the local node. One test tx.
•	Verify Drizzle can run migrations against local Postgres.
•	Verify BullMQ can enqueue and process a job using local Redis.
•	All 5 verifications passing = environment is ready. Do not proceed until all 5 work.

P2  compliance.rs   3–5 days   [BLOCKER]
This is the first contract. Everything that involves user identity gates on it. Build it first so it is deployed before you need it.
The functions you need for Phase 1: verify_kyc(wallet, attestation_hash) → writes a KYC attestation record. check_sanctions(wallet) → returns bool. require_kyc(wallet) → callable by other contracts as a guard.
•	Soroban's storage model for attestation records. Use persistent storage (instance storage is wrong here — it gets archived).
•	Testing the contract locally: soroban contract invoke --id <deployed-id> --fn verify_kyc -- --wallet <address> --hash <bytes32>
•	The attestation hash format: SHA-256 of Persona's attestation ID + timestamp. Must be deterministic so the Bun service and the contract agree on the value.
•	When adding require_kyc as a cross-contract call in stream_router.rs — Soroban cross-contract calls have their own resource cost. Budget for it.

P3  stream_router.rs   5–7 days   [BLOCKER]
This is the core product. Everything the user actually sees — the counter, the harvest, the balance — originates here. Get this right before building anything else.
The contract stores three values per position: principal (i128), apy_bps (u32, basis points — NOT floating point), last_sync_ledger (u32). The V(t) calculation happens off-chain. The contract only computes accrued yield at interaction time using integer math.
Do not use floating point anywhere in Rust contracts. Stellar Soroban has no float support by design. All yield math uses fixed-point arithmetic with basis points.
•	Fixed-point arithmetic for yield: if APY is 5.21%, store as 521 basis points. Compute accrual as: principal * bps * elapsed_ledgers / (10000 * ledgers_per_year). Off-by-one in the denominator is a real money error.
•	The harvest function must be atomic: calculate accrued → mint or transfer to user → update sync_ts → emit event. If any step fails, the whole tx reverts. Test this explicitly.
•	Edge case: user deposits more capital before harvesting. New principal = old_principal + accrued_so_far + new_deposit. The sync_ts resets. The client must handle the ANCHOR_UPDATE message correctly or the counter jumps.
•	Soroban instruction limit: your harvest function must stay under 100 million CPU instructions. Profile with soroban-cli estimate before deploying.

P4  Bun Stream Service   4–6 days   [BLOCKER]
This service owns two things: the Redis cache of virtual balance anchors, and the WebSocket connection to the mobile app. Without this, there is no counter.
The Redis key per user: conduit:anchor:{walletAddress} → JSON {principal, apy_bps, sync_ts, sync_ledger}. This is written on every harvest/deposit event received from the Indexer, and read on every WebSocket connect.
The WebSocket lifecycle: client connects → server reads anchor from Redis → sends ANCHOR_UPDATE → client starts V(t) calculation → on harvest, tx submits, Indexer catches event, Stream Service updates Redis → sends new ANCHOR_UPDATE → client resets counter from new anchor.
•	The reconnect race condition: phone switches from WiFi to 4G mid-harvest. WebSocket drops. Harvest lands on-chain. Client reconnects using stale MMKV anchor. Counter shows wrong number until next ANCHOR_UPDATE. Fix: on every WS connect, always send current anchor from Redis (which has been updated by Indexer). Never trust the client's stored anchor as canonical.
•	Multiple devices: same wallet, two phones. Both connected. One harvests. Indexer updates Redis. Stream Service must push to BOTH WebSocket sessions. Store sessions as: conduit:ws:{walletAddress} → Set of session IDs. Fan out to all.
•	Redis key expiry: set TTL on anchor keys (7 days). If a user hasn't opened the app in 7 days, rebuild anchor from chain state on their next connect.
•	Load test this before anything else touches it. Use k6 to simulate 1000 concurrent WebSocket connections before the full system is built.

P5  Bun Oracle Service   4–6 days   [HIGH]
Without live NAV data, the APY in every anchor is hardcoded. You can stub this for development by hardcoding APY values in the Stream Service. But you need real oracle data before any real money goes in.
The Benji API is not public. You need a partnership agreement with Franklin Templeton to get API access. This is a business problem, not a technical one. While you wait for access, use Reflector for BENJI pricing (it lists BENJI on Stellar's DEX) and treat Benji API as a Phase 2 upgrade.
•	Reflector integration: Reflector is a decentralized price oracle on Stellar. Query via its smart contract interface. Returns XLM-denominated prices. You need a USD conversion step (XLM/USD) which is also available on Reflector.
•	Staleness detection: if the last NAV update is more than 5 minutes old, set confidence_score = 0 and do NOT publish to credit_oracle.rs. Alert via notification service. Do NOT let stale NAV reach the AMM.
•	Dual-source disagreement: if Benji API NAV and Reflector NAV disagree by more than 0.5%, do NOT publish either. Flag for manual review. This is the circuit breaker.
•	TWAP computation: store 30 minutes of NAV samples in TimescaleDB. TWAP query: SELECT AVG(nav) FROM nav_samples WHERE bond_id = $1 AND ts > NOW() - INTERVAL '30 minutes'. This is used by core_amm.rs to resist flash loan manipulation.
•	The CDS spread data (credit signals) from Bloomberg/Refinitiv costs $1,000–5,000/month. Use a free proxy for development: track the relevant bond ETF prices on Yahoo Finance via unofficial APIs. It is directionally correct and costs nothing.

P6  bond_box.rs   5–7 days   [HIGH]
Bond Boxes are the investment vehicles users actually pick. The contract is a vault that holds allocation configurations and interfaces with BENJI and USDY token contracts.
Critical distinction: bond_box.rs does NOT literally hold tokens inside itself. It holds user LP positions (shares of the box) and the allocation percentages. The actual BENJI and USDY tokens are in their issuer contracts on Stellar. bond_box.rs records that "user X has 40% of their box in BENJI" — it does not custodize BENJI tokens directly.
LP shares use the CAP-46-6 standard fungible token interface. This means they are standard Soroban tokens, compatible with any Stellar wallet.
•	LP share minting math: when a user deposits $1,000 into a box with $100,000 TVL and 100,000 existing shares, they get 1,000 new shares (1% of the box). Simple proportional math. The edge case is first deposit (zero TVL) — set initial share price to 1 USDC = 1 share.
•	Rebalancing is off-chain logic. The bond_box.rs contract stores target allocation percentages. The actual rebalancing (swapping BENJI for USDY) happens via core_amm.rs swap() calls triggered by the Keeper Service when the actual allocation drifts more than 2% from target.
•	get_nav() must be deterministic and fast. It reads from credit_oracle.rs (which has current NAV per asset) and multiplies by allocation weights. Under Soroban instruction limits.
•	Test the full cycle: deposit → verify LP shares minted → oracle updates NAV → verify get_nav() reflects new price → withdraw → verify LP shares burned, correct USDC returned.

P7  Bun Compliance Service + Persona KYC   5–8 days   [HIGH]
KYC is a gate for all financial features. You need it working before real users can deposit real money. Persona has a sandbox environment — use it throughout development.
The flow: mobile app opens Persona SDK in-app → user completes selfie + ID → Persona sends webhook to your Bun Compliance Service → Bun verifies webhook signature → calls Persona API to confirm status → hashes attestation ID → calls compliance.rs verify_kyc() → writes result to Postgres user record.
•	Webhook verification: Persona signs webhooks with HMAC-SHA256. If you do not verify the signature, anyone can fake a KYC approval. This is a critical security step. Persona's documentation covers this. Do not skip it.
•	The failure case no one thinks about: Persona webhook arrives → Bun processes it → tx submitting to compliance.rs times out (Stellar congestion) → user is verified in Persona but NOT on-chain. You need a retry queue (BullMQ job) that retries the on-chain write up to 5 times before alerting. This queue must be idempotent — double-writing the same attestation must be harmless.
•	Geo-restriction: some jurisdictions cannot use yield products (OFAC sanctioned countries, some EU countries pre-MiCA compliance). compliance.rs must store an approved_countries list. Check IP at registration. Check again at first deposit.
•	Chainalysis KYT sandbox: register at app.chainalysis.com. Sandbox API is free. Real API requires a paid contract. For development, use sandbox for wallet screening and stub the response for known-good test wallets.

P8  Bun Keeper Service   4–5 days   [HIGH]
The Keeper runs the scheduled financial operations: auto-compound, rebalance triggers, and harvest-on-threshold. It is the operational heartbeat of the protocol.
BullMQ job types you need: HARVEST_CHECK (runs every 15 minutes per user — checks if pending yield exceeds compound threshold → if yes, queues HARVEST_EXECUTE), REBALANCE_CHECK (runs every hour per box — checks if allocation drift > 2% → if yes, queues REBALANCE_EXECUTE), CREDIT_CHECK (runs every 4 hours — checks credit scores → if PD spike → queues COND_EVALUATION).
•	Channel account rotation: you need 10–20 pre-funded channel accounts to submit parallel transactions. Each channel account has its own sequence number. The Keeper must track which channel accounts are available (not mid-transaction) and assign them to jobs. Build a simple availability map in Redis: conduit:channel:{address}:locked → bool with TTL.
•	BullMQ job failures: if a HARVEST_EXECUTE job fails (Stellar tx rejected, network timeout), BullMQ retries automatically with exponential backoff. But you must check: did the tx land on-chain even though BullMQ got an error? Check Horizon before retrying — this prevents double-harvests.
•	Rate limiting: Stellar Quickstart and testnet have rate limits. Your Keeper can overwhelm them during load tests. Implement a token bucket rate limiter around your stellar-sdk submit calls.
•	Job deduplication: if a user manually triggers a harvest while a scheduled harvest is already queued, deduplicate by job key = "harvest:{walletAddress}". BullMQ supports this natively.

P9  Bun Indexer   3–4 days   [HIGH]
The Indexer is a single responsibility service: subscribe to Horizon SSE, parse events, write to TimescaleDB. Simple in concept. The complexity is in parsing Soroban contract events correctly.
Soroban events have a type (contract), a contract_id, and a body (XDR-encoded). You parse the body using stellar-sdk's XDR deserializer. Each of your contracts emits different event shapes — you need a parser per event type.
•	XDR parsing: Soroban events encode their topics and values as XDR ScVals. stellar-sdk provides xdr.ScVal. Parsing a complex event (like a harvest with multiple fields) requires knowing the exact structure your Rust contract emitted. Write the event schema in Rust first, then mirror it in TypeScript. If they diverge, you will parse garbage silently.
•	TimescaleDB hypertable setup: your APY history and portfolio value tables MUST be created as hypertables (SELECT create_hypertable('apy_history', 'ts')). If you create them as regular Postgres tables and query months of data later, queries will time out. Do this in the initial Drizzle migration.
•	Cursor/checkpoint: if the Indexer restarts, it needs to resume from where it left off, not from genesis. Store last_processed_ledger in Postgres. On startup, call Horizon SSE with ?cursor={last_ledger} to resume.
•	The Indexer must be the single writer to TimescaleDB for chain data. No other service should write chain events directly. This is an architectural rule that prevents duplicate events.

P10  credit_oracle.rs + Oracle Service integration   3–4 days   [HIGH]
Credit oracle data is what COND watches. Without it, COND can only react to APY changes, not credit deterioration — which is its most important capability.
credit_oracle.rs stores per-issuer records: {issuer_id, pd_bps, lgd_bps, credit_spread_bps, last_updated}. The Bun Oracle Service writes these records every 4 hours from CDS data. COND reads them via horizon events.
•	Access control on update_credit(): only your Oracle Service wallet can call this. Implement an admin whitelist in the contract — one allowed updater address. If anyone else calls update_credit(), it reverts.
•	Triggering COND: when credit_oracle.rs emits a CreditDeteriorated event (PD increased by more than threshold), the Indexer catches it → publishes to Redis pub/sub → COND's Observe node picks it up → triggers out-of-cycle evaluation. This is the most time-sensitive path in the whole system.
•	CDS proxy for development: track iShares bond ETF prices (LQD for IG corp, HYG for HY) via Yahoo Finance unofficial API. Price drops = credit stress signal. Not precise but directionally correct for testing COND logic.

P11  COND v1 — Rule-Based (No LLM)   5–7 days   [HIGH]
Build COND as a pure rule-based Python system first. No LangGraph. No Anthropic API. Just: read oracle data → apply rules → call Bun /internal/tx if action needed. This is faster to build, easier to test, and safe to deploy to real users.
Rules for COND v1: (1) If any bond in user's allocation has PD increased by >20bps since last check → propose rotation to higher-rated alternative. (2) If a Bond Box offers APY >25bps better than user's current box and user mandate allows → propose migration. (3) If accumulated yield > compound_threshold in mandate → propose harvest + reinvest. (4) If user's allocation has drifted >3% from mandate target → propose rebalance.
•	The /internal/tx endpoint in Bun: POST with {user_wallet, action_type, params, cond_signature}. Bun validates the cond_signature (HMAC with a shared secret between Bun and Python). Validates against user mandate in Postgres. If valid, builds and submits stellar tx. If invalid, returns rejection reason to COND for logging.
•	Mandate validation in TypeScript: replicate the same logic as cond_executor.rs Rust validation. If they disagree, you will have a COND that proposes actions that the Rust contract rejects. Write a single test that sends the same payload to both and verifies they agree.
•	COND v1 runs as a FastAPI background task on a schedule (APScheduler every 60s). No graph, no LLM, no complexity. A for loop over active users, apply rules, submit actions via HTTP.
•	Write a test mode: COND v1 in dry_run=True logs what it WOULD do without submitting. Run this for a week on testnet before enabling live submissions.

P12  core_amm.rs (Stableswap)   7–10 days   [MEDIUM]
This is the hardest contract to write. It implements the Stableswap invariant — the same math used by Curve Finance — adapted for bond NAV pricing on Soroban in Rust with no floating point.
The invariant: An^n * sum(x_i) + D = An^n * D + D^(n+1) / (n^n * prod(x_i)). Solving for D given current pool balances requires Newton-Raphson iteration. In Rust with i128 fixed-point arithmetic, without exceeding Soroban's 100M CPU instruction limit.
Do NOT derive this from scratch. Port the Curve v1 vyper implementation. Curve's math is audited and battle-tested. Your job is to translate it to Rust fixed-point, not to invent new AMM math.
•	Fixed-point precision: use 1e7 precision (all amounts multiplied by 10^7). This gives 7 decimal places without overflow on i128 up to ~170 trillion. Verify no overflow at your maximum expected TVL.
•	Newton-Raphson convergence: set a maximum of 255 iterations (same as Curve). If it has not converged after 255 iterations, the invariant is misconfigured — revert the transaction. Test this with extreme inputs (near-zero liquidity, single-asset pool).
•	Oracle-adjusted pricing: before using raw pool balances in the invariant, multiply each asset balance by its NAV weight from credit_oracle.rs. This is how the AMM "knows" that $1 of BENJI and $1 of German Bunds have the same credit quality.
•	Sandwich attack protection: TWAP from TimescaleDB (queried by bond_box.rs before calling the AMM) must show that the spot price and 30-min TWAP agree within 0.5%. If they diverge, the swap is during a manipulation attempt — revert.
•	Test plan: unit test each sub-function (compute_D, compute_y, swap) separately before integrating. Then test: initial liquidity add → swap → verify slippage matches Curve formula → large swap → verify slippage increases as expected → test at Soroban instruction limits.

P13  split_config.rs + Stream Splitting UI   3–4 days   [MEDIUM]
Split config is straightforward relative to everything above. The contract stores destination wallets and percentages per user. The actual split happens inside stream_router.rs's harvest() function: calculate total yield → iterate over split config → transfer each portion.
The UI complexity is higher than the contract complexity. The bottom sheet must show live $/day projections per destination, allow drag-to-reorder, and handle the sum-to-100% validation gracefully.
•	Sum validation: percentages must sum to exactly 100. Handle the floating point UI rounding issue — if user sets 33% + 33% + 33%, that is 99%. Add rounding logic that adjusts the last destination to make it exactly 100. Do this silently, not with an error.
•	Cross-wallet transfer: if a destination is an external Stellar address (not a Conduit wallet), the split triggers a Stellar payment operation inside the harvest tx. Make sure the destination address is valid Stellar format before storing it in split_config.rs.

P14  COND v2 — LangGraph + Claude Sonnet 4.6   10–14 days   [MEDIUM]
Upgrading COND from rule-based to LangGraph with real LLM reasoning. This is where the product becomes genuinely impressive. It is also where the most can go wrong.
LangGraph graph structure: 5 nodes. Observe (read Redis + credit_oracle.rs via Horizon). Reason (Claude Sonnet 4.6 call with structured tool use, returns action JSON + CoT text). Propose (validate against mandate in Python, build action payload). Execute (call Bun /internal/tx). Log (write CoT to cond_executor.rs via Bun).
•	LangGraph checkpointer: use PostgresSaver (LangGraph built-in). Requires asyncpg. Each user gets a thread_id = their wallet address. The graph state persists across evaluations — COND "remembers" what it did last time.
•	Structured output from Claude: use tool use (not text parsing) to get the action JSON. Define a submit_action tool with a strict schema. Claude will call this tool instead of free-texting the action. This eliminates JSON parsing failures.
•	The Python-Rust mandate disagreement problem: your Python mandate validator in LangGraph and your Rust mandate validator in cond_executor.rs must agree. Write a test that sends 50 randomized action payloads to both and compares results. Fix any divergence before going live.
•	CoT token costs: Claude Sonnet 4.6 at $3/MTok input, $15/MTok output. A typical COND reasoning call is ~2K input tokens + ~500 output tokens = $0.0135. At 40,000 users, one COND evaluation per user per hour = 960,000 calls/day = $12,960/day. You cannot run hourly evaluations for all users at launch. Run evaluations only when triggered (credit event, APY change > threshold, user opens app). Target: avg 3 evaluations/user/day = $0.04/user/day. COND Pro subscription at $9.99/month = $0.33/user/day. Margin exists.
•	HOTL implementation: add a confidence_threshold to COND's Propose node. If Claude's confidence in the action is below 0.85 (scored by Claude itself in the output JSON), route to a WAITING_APPROVAL state. Notify user via push: "COND wants to act but needs your approval." User approves or rejects in app.

P15  yield_nft.rs + NFT Marketplace   6–8 days   [MEDIUM]
Stream NFTs are a Phase 4 feature. Build them after everything else is working and you have real users. Do not let this distract from the core product.
The math is clear: NPV = sum over ledgers of (yield_per_ledger / (1 + r)^t). The challenge is the discount rate r. It must reflect the credit risk of the specific bond position being packaged. Read credit_oracle.rs's credit_spread_bps for the underlying bond. Use that as r.
•	Accreditation gate: compliance.rs require_accredited() must return true before yield_nft.rs allows minting. Hard gate. No bypass. This is a legal requirement.
•	NFT marketplace is off-chain order book. yield_nft.rs is the settlement layer only — it transfers the stream when a buyer calls redeem(nft_id). The order matching happens in Postgres (buy/sell orders) and is settled by the Keeper when a match is found.
•	The yield position during NFT ownership: stream_router.rs must recognize that the yield for ledgers N through N+duration belongs to the NFT holder, not the original depositor. This requires stream_router.rs to know about outstanding NFTs. One approach: stream_router.rs queries yield_nft.rs for active NFTs on a position before distributing yield.

P16  Social Layer   4–6 days   [MEDIUM]
Leaderboard, Yield Races, copy portfolios. Mostly backend queries against TimescaleDB. Less contract work than almost anything else on this list.
Leaderboard query: SELECT wallet_address, handle, (sum_yield_7d / avg_portfolio_value_7d) as apy_7d FROM portfolio_snapshots WHERE ts > NOW() - INTERVAL '7 days' GROUP BY wallet_address, handle ORDER BY apy_7d DESC LIMIT 100. TimescaleDB handles this efficiently with time partitioning.
•	Copy portfolio implementation: when user A copies user B, store in Postgres: copy_relationships (follower=A, leader=B). On each COND evaluation for A, read B's current allocation and set A's target allocation to match. COND then proposes rebalancing trades to match. Do NOT copy blindly — COND still validates the copied allocation against A's own mandate.
•	Pseudonymous by default: leaderboard returns handles, never names or wallet addresses. Wallet addresses are only linkable to real identity by compliance.rs — and that data never leaves the compliance layer.
•	Yield Race mechanics: prize pool is funded by entry fees (optional $5 USDC from participants who want to compete for prizes). 80% to prize pool, 20% to protocol. Weekly snapshot determines winners based on 7-day portfolio APY. All users appear on the leaderboard whether they paid the entry fee or not — entry fee only gates prize eligibility.

P17  Creator Pools   5–7 days   [LOW]
EU-first. Do not build until legal structure is confirmed. The code is straightforward — it is mostly bond_box.rs with a yield split going to the creator wallet. The legal work (ART classification, MiCA compliance, creator agreement) takes longer than the code.
The key legal point: creator_pool.rs must make clear on-chain that the creator does NOT control investment decisions. The mandate is set at pool creation and cannot be changed by the creator — only by the platform governance process. This is the factual basis for "not an investment scheme managed by the creator."
•	creator_pool.rs is bond_box.rs with one addition: distribute_yield() takes 10% of yield and transfers to creator_wallet before distributing the rest to fan LP holders.
•	Fans deposit USDC, receive pool LP tokens. LP tokens are redeemable for USDC at any time. No lock-up. This is critical for legal classification.
•	Creator dashboard requires Indexer data: TVL over time (TimescaleDB query), monthly yield earned (aggregation), fan count (unique depositor wallets). All reads from Postgres/TimescaleDB — no new contract functions needed.

P18  Spend Mode   4–6 days   [LOW]
Requires an anchor partnership. An anchor is a Stellar ecosystem participant that provides USDC ↔ fiat conversion and links to payment networks (cards, bank transfers). Circle, MoneyGram, and PayPal all run anchors on Stellar.
The virtual debit card is NOT issued by Conduit. It is issued by the anchor partner. Conduit triggers USDC transfers to the card's Stellar address, which the anchor converts to fiat for card spending.
•	Stellar anchor integration uses SEP-24 (interactive anchor flow). The user links their card account once via the SEP-24 flow. After that, Conduit can send USDC to their anchor account and the anchor handles the card side.
•	Spend trigger: user sets a "spend budget" in their mandate — e.g., $10/day from yield. Keeper Service checks daily: if accumulated yield > spend_budget, triggers harvest of exactly that amount, routes via split_config.rs to the anchor address.
•	Do not build a card issuance system. Do not build a payment processor. You are a yield protocol. The anchor handles payments. Your job is: USDC transfer to anchor address on schedule.

The Real Time Estimates
⚠  About These Estimates
These are realistic estimates assuming you know TypeScript and Rust basics, but have NOT built on Soroban before and have NOT built a production WebSocket service before. If you are already Soroban-fluent, cut Rust estimates by 40%. If you have never written a Soroban contract at all, add 50% to all Rust estimates for environment and debugging overhead.

Phase	Components	Realistic Time	What Will Slow You Down
1 — Foundation	Local env + compliance.rs + stream_router.rs	3–4 weeks	Soroban toolchain. Fixed-point arithmetic. Cross-contract calls. Testnet deploy cycle.
2 — Core Backend	Bun Stream Service + Oracle Service + Indexer + bond_box.rs	4–6 weeks	WebSocket reconnect edge cases. XDR event parsing. Horizon SSE reliability. Oracle dual-source logic.
3 — Working Product	Bun Keeper + Compliance Service + React Native mobile app basic	5–7 weeks	Persona SDK in Expo (native module friction). BullMQ reliability. Channel account management. React Native performance.
4 — COND v1	Rule-based Python agent + /internal/tx endpoint + mandate validation	2–3 weeks	Python-TypeScript boundary. Mandate validator parity. Dry-run testing.
5 — AMM + Splits	core_amm.rs + split_config.rs + UI	3–5 weeks	Stableswap math. Fixed-point invariant solver. Instruction limit profiling.
6 — COND v2	LangGraph + Claude Sonnet 4.6 + CoT logging	3–5 weeks	LangGraph API changes. Token cost management. HOTL flow. Mandate validator parity.
7 — Social + NFTs	Yield Races + leaderboard + copy portfolios + yield_nft.rs	3–4 weeks	TimescaleDB query optimization. NPV pricing. Accreditation gating.
8 — Creator + Spend	creator_pool.rs + anchor integration	3–4 weeks	Legal structure. Anchor partnership agreement. SEP-24 flow.
9 — Production	Mainnet deploy + monitoring + MiCA compliance + institutional portal	4–6 weeks	Mainnet key management. Chainalysis paid tier. MiCA reporting format.
TOTAL	Everything above	31–48 weeks	~8-12 months of focused solo development. Honest.

Common Failure Patterns to Avoid

⚠  WARNING — Building features before the foundation
The single most common mistake: starting on the mobile app before stream_router.rs is working end-to-end. You will build an app with no backend to connect to, then discover the backend does not behave as assumed, and rewrite parts of both. Order: contracts → Bun services → mobile app. Non-negotiable.

⚠  WARNING — Not testing the WebSocket edge cases early
The reconnect race condition (stale anchor after network switch) will not appear in normal testing. It appears when a real user is on a train. Write an explicit test: simulate WS disconnect during a harvest, then reconnect, verify the counter shows the correct post-harvest value. Do this before the mobile app is built, not after.

⚠  WARNING — Using floating point in Soroban contracts
Soroban Rust does not support f32/f64. If you try to use them, the contract will fail to compile. All yield math uses i128 with explicit precision multipliers (basis points for APY, 10^7 for amounts). Design your math before writing the contract.

⚠  WARNING — Forgetting about Soroban resource fees in cost estimates
v5.0 estimated fees based on simple Stellar payment costs. Every Soroban contract call has resource fees on top of the base fee, depending on CPU instructions, disk reads/writes, RAM, and transaction size. Run soroban contract estimate on each function before finalizing cost projections. A complex harvest() might cost 10x more than a simple payment.

⚠  WARNING — Running COND evaluations for all users on a schedule
Triggering Claude Sonnet 4.6 evaluations for every user every hour would cost ~$13,000/day before you have $1 of revenue. COND must be event-driven: evaluate only when something changes (oracle update, credit event, user opens app, compound threshold reached). Cap at maximum 3 evaluations/user/day.

⚠  WARNING — Skipping dry-run mode for COND
Deploy COND v1 in dry_run=True on testnet for at least 1 week before enabling live submissions. Log everything it would have done. Review the logs. Make sure it never proposes violating a user's mandate. If it does, fix the mandate validator before going live. Real money is on the line.

PART 06
Build Roadmap
Honest phases with no external deadlines

Phase	What Ships	Contracts Live	Key Proof of Working
Alpha — Local	Full local env, testnet contracts, basic mobile counter, deposit+harvest	compliance.rs, stream_router.rs, bond_box.rs	Counter ticks on testnet. Deposit 10 XLM. Watch it grow. Harvest it.
Closed Beta	Mainnet deploy, 50–100 invited users, BENJI+USDY live, Compliance+KYC	+ credit_oracle.rs, split_config.rs	First real user earns first real yield on mainnet.
COND v1 Live	Rule-based agent live for all users. Keeper auto-compound. Oracle live.	+ cond_executor.rs	COND makes its first autonomous rotation on mainnet. CoT logged.
AMM Live	core_amm.rs deployed. In-box bond swaps enabled. Bond Box rebalancing automated.	+ core_amm.rs	First AMM swap executed. Rebalancing trigger fires correctly.
COND v2	LangGraph + Claude Sonnet 4.6. HOTL active. COND Pro subscription live.	No new contracts	COND explains a rotation in plain English. User approves via app.
Social Launch	Yield Races live. Leaderboard. Copy portfolios. Badges. Share cards.	No new contracts	First Yield Race completed. First share card shared externally.
Yield NFTs	yield_nft.rs. Parallel Markets accreditation. NFT marketplace.	+ yield_nft.rs	First Stream Pack sold. Buyer receives yield for duration.
Creator Pools	creator_pool.rs. ART classification. EU users only.	+ creator_pool.rs	First creator earns monthly yield income from fan pool.
Spend Mode	Anchor partnership. Spend budget in mandate. Virtual card.	No new contracts	First coffee paid with bond yield.
Institutional	Web portal. Multi-sig. MiCA reporting. DAC8. Institutional API.	No new contracts	First institutional client deposits. MiCA report auto-generated.
Cross-Chain	Ondo Bridge. Wormhole. BlackRock BUIDL accessible.	Bridge adapter contracts	First Ethereum RWA (BUIDL) deposited into a Bond Box.

Cost Breakdown (Corrected)
Item	Dev Cost	Monthly at Launch	Monthly at 50K users
Stellar Testnet	Free	N/A	N/A
Stellar Mainnet — payments	N/A	~$5 (simple payments)	~$50 (simple payments only)
Stellar Mainnet — Soroban calls	N/A	~$50–100 (Fee-Bump, contract calls)	~$1,000–2,000 (verify with soroban estimate)
Railway — backend	Free (local Docker)	Free tier	$50/month
Vercel — web	Free	Free tier	$20/month
PostgreSQL + TimescaleDB	Free (Docker)	$5/month (Railway)	$25/month
Redis	Free (Docker)	Free tier	$10/month
Persona KYC	$0 (sandbox)	$1–3 per verification (1-time at signup)	~$1,000/month (new signups only)
Chainalysis KYT	$0 (sandbox)	~$500/month (paid tier required for mainnet)	~$2,000/month
Claude API (COND + chat)	$0 (Anthropic free tier)	~$50/month (event-driven, ~3 calls/user/day at launch)	~$1,200/month (40K COND Pro users × 3 calls/day)
Expo EAS Build	Free (30 builds/month)	Free tier	$29/month
Bloomberg/Refinitiv CDS data	Proxy free alternative during dev	$0 (use ETF proxy)	$1,000–5,000/month (real data when you can afford it)
TOTAL (conservative)	$0	~$600–800/month	~$5,000–8,000/month

Revenue Model
Stream	Model	Year 1	Year 2	Year 3	Notes
COND Pro ($9.99/mo)	Subscription	$216K	$1.44M	$4.32M	40K subs Year 3
COND Institutional ($299/mo)	Subscription	$0	$432K	$2.16M	600 clients Year 3
Bond Box Mgmt Fee (0.05% AUM/yr)	AUM fee	$25K	$300K	$1.8M	Based on TVL targets
AMM Protocol Fee (15% of swap fee)	Transaction fee	$40K	$360K	$1.8M	On in-box swaps
Stream NFT Marketplace (2.5%)	Transaction fee	$0	$120K	$840K	Accredited investors only
Creator Pool Fee (1% of yield)	Revenue share	$0	$80K	$480K	EU-first
Yield Race Entry Fees	Optional $5 entry	$12K	$96K	$360K	Prize pool funded by entries
Institutional API ($2K–10K/mo)	License	$0	$180K	$960K	Institutional portal data
Fee Sponsorship (cost)	(Operational cost)	($13K)	($84K)	($525K)	Soroban call sponsorship
NET TOTAL		$280K	$2.9M	$12.2M	~88% gross margin

v6.0 — Errors corrected. Architecture fixed. Build order realistic.
Stellar · Soroban · Bun · React Native · Python · LangGraph · Claude Sonnet 4.6
Start with the local environment. Build compliance.rs. Build stream_router.rs. Prove the counter works. Then everything else.

