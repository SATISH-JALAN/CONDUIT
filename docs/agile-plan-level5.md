# 🔵 Conduit — Level 5 Upgrade Plan: *From Simulation to Real On-Chain Protocol*

> **Status:** Active · **Owner:** SATISH-JALAN · **Theme:** Turn Conduit from a simulated yield
> counter into a **real, token-backed, oracle-priced Stellar/Soroban protocol** — then deepen the idea.
> **Output:** **12 major engineering commits** across **5 phases**.
>
> *User onboarding, feedback forms, and growth logistics are intentionally deferred to a later phase —
> this plan is about upgrading the product and the idea itself so it genuinely qualifies.*

---

## 1. The Honest Starting Point (why "it's a basic project")

Conduit today is **elaborate but simulated**. The presentation layer is rich; the protocol underneath is fake.
This was verified by reading the source, not the README:

| Claim | Reality in code | File |
|:---|:---|:---|
| On-chain yield vault | `stream_router.rs` only stores `{principal, apy_bps, sync_ts}` and does math — **transfers zero tokens** | `contracts/stream_router/src/lib.rs` |
| Deposit into the contract | Builds a **native XLM payment**; falls back to **paying yourself** if no vault env set; never invokes the contract | `server/src/shared/stellar.ts:60` |
| Harvest pays real yield | Commented *"we simulate by building a self-payment"* — yield is invented in Postgres/Redis | `server/src/shared/stellar.ts:114` |
| Real bond APY | Static number; the contract lets the **depositor choose their own APY** (`deposit(wallet, amount, apy_bps)`) | `contracts/stream_router/src/lib.rs:77` |
| 10 contracts (systemarch) | Only **2 exist** (stream_router, compliance); the rest are DB tables | `contracts/` |
| NFTs / races / creators / splits | All **off-chain Postgres rows**, no on-chain backing | `server/src/routes/*` |

**Conclusion.** The idea is sound, but nothing is real: no token custody, no real yield source, and the
deployed contract isn't even in the transaction path. **Upgrading = making the core real, then adding
genuinely novel on-chain mechanics.** Every step below is a *major* commit because it changes real
protocol behavior — not styling.

### What "major commit" means here
A commit that changes **on-chain behavior, token flows, or protocol correctness** — verifiable by a
changing token balance, a contract event, or a passing integration test against a live Soroban network.

---

## 2. Phase Map

```
Phase 1 ── Make the Core Real          (Commits 1–3)  ← highest priority; everything depends on it
Phase 2 ── Real Yield Source           (Commits 4–5)
Phase 3 ── Deepen the Idea             (Commits 6–8)  ← the differentiated, "advanced" features
Phase 4 ── Harden & Prove              (Commits 9–11)
Phase 5 ── Tell the Truth (docs)       (Commit 12)
```

**Minimum bar to qualify:** Phases 1–2 alone (5 commits) already transform Conduit from simulation to a
real token-backed, oracle-priced protocol. Phases 3–4 are what make it *impressive*. Phase 5 realigns
the docs with reality.

---

## 3. Phases in Detail

### 🟦 Phase 1 — Make the Core Real

**Goal:** Real token custody and real settlement. After this phase, depositing actually moves tokens
into the contract, and harvesting actually pays real yield out — verifiable on Stellar Expert.

#### Commit 1 — `feat(contract): add SAC token custody to stream_router (real deposit/harvest transfers)`
- **Why:** Today the contract moves no tokens — it's a ledger of numbers.
- **Scope:** Add an `initialize(admin, token: Address)` entry storing the yield asset (a test-USDC
  Stellar Asset Contract). In `deposit`, call `token.transfer(user, contract_address, amount)` via the
  SAC token client (CPI) after `require_auth`. In `harvest`/`withdraw`, transfer accrued/principal from
  the contract back to the user. Track contract token balance; guard against over-withdraw.
- **Files:** `contracts/stream_router/src/lib.rs`, new `token` client usage, unit tests.
- **Done when:** A unit test shows the user's token balance decreasing on deposit and increasing on harvest by the exact accrued amount.

#### Commit 2 — `feat(server): invoke stream_router on-chain instead of native self-payment`
- **Why:** The backend currently builds a native XLM payment (sometimes to yourself) and never calls the contract.
- **Scope:** Replace `buildDepositTx`/`buildHarvestTx` with real Soroban `InvokeHostFunction` builders:
  build → `simulate` → `assemble` → return XDR for `deposit`/`harvest`/`withdraw`. Read `get_accrued`
  from chain (not Redis) to determine payout. Keep Redis purely as a *cache* of the on-chain anchor.
- **Files:** `server/src/shared/stellar.ts`, `server/src/routes/deposit.ts`, `harvest.ts`, `position.ts`.
- **Done when:** A deposit produces a real contract-invoke tx hash on testnet; harvest amount equals the contract's `get_accrued`.

#### Commit 3 — `feat(infra): token mint + deploy script and redeploy stream_router to testnet`
- **Why:** New token-backed contract must be deployed and wired; IDs updated.
- **Scope:** Script to deploy a test-USDC SAC (or use an existing testnet asset), mint to a faucet,
  deploy the upgraded `stream_router`, run `initialize`. Update contract IDs in env + README.
  Add a `pnpm faucet` to fund test wallets with the yield asset.
- **Files:** `scripts/deploy-testnet.ts` (new), `contracts` build, env docs.
- **Done when:** Fresh testnet deploy; a documented wallet completes deposit → accrue → harvest with real token balances changing on Stellar Expert.

---

### 🟦 Phase 2 — Real Yield Source (no more invented APY)

**Goal:** Yield rates come from an authorized on-chain oracle, not from a static number a user can pick.

#### Commit 4 — `feat(contract): add rate_oracle contract; stream_router reads APY from oracle`
- **Why:** APY is currently attacker-controllable and unbacked.
- **Scope:** New `rate_oracle` contract storing `apy_bps` per box/asset, writable only by an authorized
  oracle key (`require_auth` + admin rotation). Refactor `stream_router.deposit` to **fetch APY from the
  oracle** (cross-contract call) keyed by `box_id` instead of trusting the caller's `apy_bps`. Bound + event on every rate change.
- **Files:** `contracts/rate_oracle/src/lib.rs` (new), `stream_router` cross-contract call, tests.
- **Done when:** Depositing ignores any client-supplied APY and uses the oracle value; changing the oracle updates new deposits.

#### Commit 5 — `feat(keeper): oracle service writes real reference rates on-chain + records apy_history`
- **Why:** The oracle needs a credible, provenanced feed.
- **Scope:** Backend keeper that periodically pulls a reference rate (e.g., Reflector oracle on Stellar,
  or a documented public rate source per box strategy), applies each box's spread, and writes to
  `rate_oracle` on-chain. Persist every write to `apy_history` with source + timestamp for auditability.
- **Files:** `server/src/oracle/rates.ts` (new), cron script in `scripts/`, `apy_history` writes.
- **Done when:** `apy_history` fills with real, sourced rate points; on-chain oracle reflects the latest write.

---

### 🟦 Phase 3 — Deepen the Idea (the differentiated features)

**Goal:** Add genuinely novel, on-chain mechanics that make Conduit more than a savings counter. These
are the "advanced feature" evidence and the story that separates it from a demo.

#### Commit 6 — `feat(contract): trustless on-chain yield splitting at harvest`
- **Why:** Splits today are just multiple off-chain payments driven by a DB config — not trustless.
- **Scope:** `split_config` on-chain state (N destinations + basis-point weights, sum-to-10000 invariant).
  `harvest` routes accrued yield atomically to all destinations **inside the contract**, so routing is
  guaranteed and auditable. Frontend split editor writes on-chain config.
- **Files:** `contracts/stream_router` (or new `split` module), `server/src/routes/split.ts`, client editor.
- **Done when:** A harvest with a 60/40 split lands correct amounts at two addresses in one atomic tx.

#### Commit 7 — `feat(contract): real tokenized Yield NFTs (mint = on-chain claim, redeem = settle)`
- **Why:** NFTs are currently Postgres rows with no on-chain existence.
- **Scope:** `yield_nft` contract implementing a Soroban token/NFT that represents a **time-bounded claim
  on a position's future yield**. Mint locks a slice of the streaming anchor; transfer moves the claim;
  redeem burns the NFT and settles accrued yield to the holder. Accreditation-gated via `compliance`.
- **Files:** `contracts/yield_nft/src/lib.rs` (new), `server/src/routes/nfts.ts`, client NFT flow.
- **Done when:** Mint → transfer to a second wallet → redeem settles yield to the new holder on-chain.

#### Commit 8 — `feat(agent): bounded on-chain COND executor with mandate enforcement + CoT log`
- **Why:** The AI agent's "account abstraction" is HMAC off-chain with no on-chain guarantee.
- **Scope:** `cond_executor` contract that validates a proposed action against on-chain **mandate bounds**
  (min credit rating, max risk, kill-switch) before executing a rotation/harvest, and logs a
  chain-of-thought event for auditability. Backend submits Gemini-approved proposals through it.
- **Files:** `contracts/cond_executor/src/lib.rs` (new), `server/src/routes/internalTx.ts`, `agent.ts`.
- **Done when:** An approved proposal executes only if within on-chain mandate; an out-of-bounds action reverts.

---

### 🟦 Phase 4 — Harden & Prove

**Goal:** Make the now-real protocol trustworthy and reconciled — the difference between "works once" and "production."

#### Commit 9 — `feat(indexer): real Horizon/RPC event indexer reconciling on-chain events to DB`
- **Why:** Positions are written from the submit handler, not from chain — DB can drift from truth.
- **Scope:** Subscribe to the RPC/Horizon event stream, parse `stream_router`/`yield_nft`/`split` Soroban
  events, and write canonical state to Postgres (TimescaleDB). DB becomes a *projection* of chain, so it self-heals.
- **Files:** `server/src/indexer/*` (new), schema for indexed events.
- **Done when:** Killing the API mid-deposit still results in correct DB state once the indexer catches the event.

#### Commit 10 — `test: end-to-end integration + contract fuzz against local Soroban network`
- **Scope:** Spin up local Soroban (docker), run full deposit → accrue → harvest → split → withdraw with
  real balances asserted; add contract edge/fuzz tests (overflow, rounding drift, unauthorized-caller,
  double-harvest). Wire into CI.
- **Files:** `server/test/e2e/*` (new), `contracts/*/src` test modules, `.github/workflows/ci-cd.yml`.
- **Done when:** CI runs the E2E suite green against a live local network; money-path coverage is real.

#### Commit 11 — `fix(security): remove self-payment fallback & client-trusted APY; add invariants + audits`
- **Scope:** Delete the `|| sourceWallet` self-payment fallback; forbid client-supplied APY end-to-end;
  add rounding/conservation invariants (contract can never pay more than it holds); contract upgrade
  authorization; rate limits on money paths; `cargo audit` + `pnpm audit` gates in CI.
- **Files:** `server/src/shared/stellar.ts`, contracts, CI.
- **Done when:** No path can drain the vault or fabricate yield; audits pass in CI.

---

### 🟦 Phase 5 — Tell the Truth

#### Commit 12 — `docs: rewrite systemarch + README to match the real protocol`
- **Why:** Current docs describe 10 aspirational contracts and simulated flows — the biggest credibility risk in review.
- **Scope:** Rewrite `docs/systemarch.md` and `README.md` to reflect what is now actually built:
  real token custody, oracle-priced APY, on-chain splits/NFTs/executor, the indexer, and accurate tx
  flow diagrams. Remove vaporware; mark anything still future as "Roadmap." Fix the Level 6/Level 5
  mismatch and the placeholder Twitter link. Update contract addresses.
- **Files:** `README.md`, `docs/systemarch.md`, `docs/backendarch.md`, diagrams.
- **Done when:** Every capability the README claims is backed by a commit and a live contract/endpoint.

---

## 4. Traceability: Commit → Upgrade Delivered

| # | Commit | Phase | Turns this from → into |
|:---:|:---|:---:|:---|
| 1 | SAC token custody in contract | 1 | number-ledger → real vault |
| 2 | server invokes contract on-chain | 1 | native self-payment → real contract tx |
| 3 | token mint + testnet redeploy | 1 | mock deploy → working token-backed deploy |
| 4 | rate_oracle + contract reads APY | 2 | user-chosen APY → authorized on-chain rate |
| 5 | keeper writes real rates | 2 | invented yield → sourced yield feed |
| 6 | on-chain yield splitting | 3 | off-chain payments → trustless atomic routing |
| 7 | real tokenized yield NFTs | 3 | DB rows → on-chain transferable claims |
| 8 | bounded on-chain COND executor | 3 | HMAC trust-me → on-chain mandate enforcement |
| 9 | real event indexer | 4 | handler-written DB → chain-reconciled projection |
| 10 | E2E + contract fuzz tests | 4 | "works in demo" → verified invariants |
| 11 | security hardening | 4 | drainable/fakeable → conservation-guaranteed |
| 12 | truthful docs rewrite | 5 | aspirational README → accurate protocol docs |

**Result:** 12 major commits, each changing real protocol behavior → clears "20+ meaningful commits"
with the existing history, and every one is defensible as *major*.

---

## 5. Sequencing & Risk

| Priority | Commits | Rationale |
|:---|:---|:---|
| **Must** (qualifies) | 1–5 | Makes the core real + credible yield — the actual fix for "basic project" |
| **Should** (impresses) | 6–8 | Differentiated on-chain features; the "advanced feature" evidence |
| **Should** (credibility) | 9–11 | Trust, reconciliation, security |
| **Must** (before submit) | 12 | Docs must match reality or review fails on inspection |

| Risk | Mitigation |
|:---|:---|
| Soroban token CPI / cross-contract calls are non-trivial | Land Commit 1 as a thin slice first; prove one real transfer before building on it |
| Scope per commit balloons | Each commit is one vertical protocol change; push extras to a backlog |
| Testnet instability during demo | Record proofs right after each phase against a known-good deploy |
| Oracle feed availability | Fall back to a documented admin-set reference rate; provenance still on-chain |

---

## 6. Definition of Done (per commit)
- [ ] Changes **on-chain behavior / token flow / correctness** (not styling).
- [ ] Proven by a changing balance, a contract event, or a passing integration test.
- [ ] `cargo test` + `pnpm --filter server test` green in CI.
- [ ] Conventional-commit message describing the protocol change.
- [ ] Docs/diagrams updated if behavior changed.

---

## 7. Deferred to a Later Phase (not this plan)
User onboarding funnel, in-app feedback/NPS capture, referral growth loop, Google-Form→Excel wiring,
pitch deck, and demo video. These matter for the submission checklist but are **separate from upgrading
the product**. Tackle them once Phases 1–3 make the product worth onboarding users into.

---

*Kept alongside `docs/systemarch.md` and `docs/backendarch.md`. Tick boxes and paste commit hashes as
each slice ships — this file doubles as the engineering-process evidence for the review.*
