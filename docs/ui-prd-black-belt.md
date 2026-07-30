# Conduit Black Belt UI Product Requirements Document

## 1) Document Control

- Product: Conduit
- Document Type: UI Product Requirements Document (PRD)
- Version: 1.0
- Status: Ready for Execution
- Date: 2026-04-23
- Owner: Product + Design + Frontend Engineering
- Stakeholders: Founder, Frontend Lead, Backend Lead, QA, Demo Day Reviewers

## 2) Executive Summary

Conduit already demonstrates strong technical depth, but review feedback indicates the user interface is perceived as unchanged. This PRD defines a full UI upgrade that makes the product feel materially new through a clearer information architecture, a stronger first-time user journey, explicit transaction trust states, and mobile-first interaction improvements.

The goal is not cosmetic redesign alone. The goal is measurable improvement in user clarity, confidence, and completion across the core yield workflow.

## 3) Problem Statement

### 3.1 Current Problems

- Reviewers repeatedly report that the UI looks and feels similar to previous submissions.
- Core user flow lacks a visible step-by-step system state during high-trust actions.
- Critical financial actions do not always provide enough confidence cues (status, confirmation, auditability).
- Mobile adaptation exists, but mobile-first task completion can still be improved.
- Screenshots and demo narrative do not clearly show what changed between versions.

### 3.2 User Impact

- First-time users are less certain about what to do next.
- Users do not always understand deposit and harvest lifecycle states.
- Perceived product maturity is lower than actual technical maturity.

## 4) Goals and Success Metrics

### 4.1 Primary Goals

- Deliver a visibly new UI experience across the core journey.
- Increase first-session completion from wallet connect to first deposit.
- Improve trust and clarity during all transaction states.
- Create clear visual proof for Black Belt resubmission.

### 4.2 Measurable Success Criteria

- +25% onboarding completion (connect wallet to dashboard arrival).
- +20% first-deposit completion rate.
- +20% harvest completion rate for users with claimable yield.
- <5% drop-off between transaction build and transaction submit states.
- 100% of critical transaction screens include status, fallback, and explorer link.
- Lighthouse mobile performance score >= 85 on key screens.

## 4.3 Black Belt Syllabus Alignment (Must-Have)

This PRD is aligned to Level 6 Black Belt requirements and intentionally focuses on UI work that improves acceptance evidence quality.

Required outcomes supported by this PRD:

- 30+ active users: improved onboarding and conversion UX.
- Metrics dashboard live: clearer metrics visibility and analytics instrumentation.
- Security checklist completed: transaction trust states and secure UX messaging.
- Monitoring active: in-app system health visibility and status patterns.
- Data indexing implemented: indexed views surfaced in user-facing flows.
- Full documentation: formal PRD + README evidence references.
- 1 advanced feature implemented: stronger COND feature usability and proof.

## 4.4 Optional Stretch Items (Do Not Block Submission)

The following items are quality upgrades, not mandatory for Black Belt compliance. If timeline is tight, these should be deprioritized after all must-haves are complete:

- Bond compare tray and advanced compare interactions.
- Mobile bottom tab navigation redesign.
- Before/after impact simulation for every COND proposal.
- Lighthouse optimization target improvements beyond stable baseline.

## 5) Scope

### 5.1 In Scope

- UX and visual redesign of core product journey.
- New navigation and flow aids for onboarding, deposit, dashboard, and harvest.
- Shared transaction lifecycle component.
- Empty, loading, and error states for all key routes.
- Mobile-first layout improvements.
- Accessibility and trust UX pass.
- Analytics instrumentation for key conversion and confidence events.

Priority tags:

- P0 (submission-critical): onboarding clarity, deposit/harvest lifecycle clarity, trust states, mobile core-flow usability, state coverage, evidence screenshots.
- P1 (high-value): compare interactions, richer secondary page hierarchy, advanced in-app health widgets.
- P2 (stretch): deeper simulations and polish tasks not required for acceptance.

### 5.2 Out of Scope

- Smart contract logic changes.
- Major backend architecture rewrites.
- New custody model.
- Full multilingual implementation (only design hooks in this phase).

## 6) Personas and Jobs To Be Done

### 6.1 Persona A: New Yield User

- Goal: Start earning quickly with minimal confusion.
- Needs: Guided steps, plain language, visible progress.

### 6.2 Persona B: Active Yield Optimizer

- Goal: Monitor APY and harvest efficiently.
- Needs: Real-time data clarity, fast actions, confidence in outcomes.

### 6.3 Persona C: Power User / Strategy User

- Goal: Use COND agent proposals and optimize allocations.
- Needs: Proposal confidence, before/after impact, execution audit trail.

### 6.4 Jobs To Be Done

- When I connect my wallet, I want immediate guidance so I can complete first value action fast.
- When I deposit, I want clear transaction steps so I trust each state.
- When I harvest, I want certainty about net result and destination routing.
- When I use the agent, I want understandable reasoning before approval.

## 7) Experience Principles

- Clarity over decoration: every screen answers "what happened" and "what next".
- Trust by default: high-risk actions always show system status and proof.
- Progressive disclosure: start simple, reveal advanced controls as needed.
- Mobile-first completion: all core actions must be easy on mobile.
- Observable product: users should see health, state, and outcomes clearly.

## 8) Information Architecture

### 8.1 Primary Navigation

- Stream (Dashboard)
- Bonds
- COND Agent
- Race
- Docs
- NFTs
- Creators

### 8.2 Navigation Model

- Desktop: left sidebar with persistent state and quick portfolio summary.
- Mobile: bottom tab bar for top 4 frequent tasks (Stream, Bonds, Agent, Docs) plus hamburger for secondary routes.

### 8.3 Route-Level Intent

- Home: value proposition + proof + conversion to onboarding/bonds.
- Onboarding: wallet readiness and guided setup.
- Bonds: discovery and comparison.
- Bond Detail: decision and deposit confidence.
- Dashboard: live monitoring, split health, harvest action.
- Agent: proposal generation, confidence, approval path.

## 9) End-to-End User Flow

### 9.1 Core Flow

1. Land on Home.
2. Start guided onboarding.
3. Connect wallet and complete readiness checks.
4. Browse bonds and compare candidates.
5. Deposit via explicit transaction lifecycle.
6. Monitor real-time yield with state-rich dashboard.
7. Configure split and validate 100% allocation.
8. Harvest with clear net outcome and explorer confirmation.
9. Optional: review COND proposals and approve/deny.

### 9.2 Required Flow Guards

- If wallet disconnected, all transactional routes redirect to onboarding with context message.
- If no positions, dashboard shows guided empty state with CTA to bonds.
- If split invalid, harvest CTA remains visible but gated with fix guidance.

## 10) Functional UI Requirements By Screen

## 10.1 Home

### Objective

Convert visitors to first action and establish trust quickly.

### Required Modules

- Hero with primary CTA and secondary walkthrough CTA.
- Start in 60 seconds guidance block (3-4 steps).
- Live proof strip (users, tx count, APY range, network state).
- Social trust and infrastructure proof row.

### Acceptance Criteria

- Hero includes exactly one primary action and one secondary action.
- Live proof strip loads without blocking first paint.
- Mobile hero CTA remains visible above fold on common viewport sizes.

## 10.2 Onboarding

### Objective

Reduce setup friction and make wallet status obvious.

### Required Modules

- Step wizard: Wallet check, connect, verification.
- Wallet troubleshooting drawer for common failures.
- Security reassurance panel (non-custodial, signed transactions).

### Acceptance Criteria

- Step status badges (pending, active, complete) are visible at all times.
- Users see explicit next action on failure.
- Successful connection auto-transitions with visible confirmation.

## 10.3 Bonds

### Objective

Improve decision quality and reduce guesswork.

### Required Modules

- Search + sort + compare selection (up to 3 products).
- Risk/return visual indicator and filter chips.
- Rich empty state with reset controls.

### Acceptance Criteria

- Compare tray supports add/remove without navigation loss.
- Risk labels include tooltip definitions.
- No-results state includes one-click reset.

## 10.4 Bond Detail

### Objective

Make deposit decision and execution high-confidence.

### Required Modules

- Sticky invest summary (amount, APY, projected outcomes).
- Transaction lifecycle panel (build, sign, submit, confirm).
- Explorer confirmation card after success.

### Acceptance Criteria

- Invalid amount and below-minimum states show inline fixes.
- Lifecycle panel reflects current state in real time.
- Success state includes transaction hash and explorer link.

## 10.5 Dashboard

### Objective

Provide actionable live monitoring and fast harvest clarity.

### Required Modules

- Live total balance and yield rate panel.
- Position timeline and daily delta card.
- Split health validator (must total 100%).
- Harvest CTA with full transaction lifecycle feedback.

### Acceptance Criteria

- Dashboard clearly shows what changed in the last 24h.
- Split validity status updates instantly on edit.
- Harvest errors include actionable user-safe message.

## 10.6 COND Agent

### Objective

Make advanced feature understandable and reviewable.

### Required Modules

- Proposal queue with confidence tier badges.
- Proposal detail with reasoning tags.
- Before/after impact preview.
- Approve/deny actions with audit status feedback.

### Acceptance Criteria

- Each proposal displays confidence and reasoning.
- Approve/deny actions update UI state without full reload.
- Agent event stream appears in timeline/chat panel.

## 10.7 Race, NFTs, Docs

### Objective

Ensure consistency and complete state coverage.

### Required Modules

- Consistent loading and empty state patterns.
- Better action hierarchy for secondary screens.
- Mobile readability and table alternatives.

### Acceptance Criteria

- Race tables remain usable on mobile via stacked card fallback.
- NFT mint/redeem/transfer states provide full feedback.
- Docs navigation includes search and clear reading progress.

## 11) Shared Components and State Spec

### 11.1 Shared Components (Must Exist)

- TransactionLifecyclePanel
- TrustInfoCard
- StatusBadge
- DeltaStatCard
- SplitHealthBar
- EmptyState (standardized variant set)
- ErrorInline with remediation action

### 11.2 State Standards

Every key screen must define and render:

- Loading state
- Empty state
- Success state
- Recoverable error state
- Unrecoverable error state

## 12) Visual Design System Requirements

### 12.1 Typography

- Keep existing brand families and hierarchy.
- Enforce minimum readable sizes on mobile.
- Display text reserved for high-value metrics and headings.

### 12.2 Color and Semantics

- Success: surge palette
- Warning: amber palette
- Error: rose palette
- Info: sky palette
- Avoid relying on color alone for critical status.

### 12.3 Spacing and Layout

- 8-point spacing system.
- Consistent card rhythm and vertical spacing across routes.
- Max readable content width for text-heavy sections.

### 12.4 Motion

- Motion must communicate state change or hierarchy only.
- Respect reduced motion preference.
- No blocking animations on core actions.

## 13) Accessibility and Inclusion Requirements

- WCAG AA contrast minimum for text and controls.
- Keyboard access for all controls and dialogs.
- Visible focus ring on all interactive elements.
- Semantic labels for icon-only actions.
- Screen-reader friendly status announcements for transaction changes.

## 14) Performance Requirements

- Initial route render under 2.5s on standard broadband.
- Avoid layout shift for loading components.
- Defer non-critical animations and heavy effects.
- Maintain smooth interaction at 60fps target on common devices.

## 15) Trust and Security UX Requirements

- All transaction screens show explicit status progression.
- Every signed action shows hash and explorer path.
- Error messages avoid exposing sensitive internals.
- Security cues remain user-readable and non-technical where possible.

## 16) Analytics and Instrumentation Plan

### 16.1 Key Events

- ui_home_primary_cta_clicked
- ui_onboarding_step_completed
- ui_wallet_connected
- ui_bond_compare_used
- ui_deposit_built
- ui_deposit_signed
- ui_deposit_submitted
- ui_deposit_confirmed
- ui_harvest_initiated
- ui_harvest_confirmed
- ui_agent_proposal_viewed
- ui_agent_proposal_approved
- ui_agent_proposal_denied

### 16.2 Funnel Tracking

- Landing to connect
- Connect to first deposit
- Deposit to first harvest
- Agent proposal exposure to approval

## 17) Content and Microcopy Guidelines

- Use action-first language: "Sign transaction" vs "Continue".
- Prefer plain language over protocol jargon.
- Include one-line explanation under complex controls.
- Use consistent terminology for deposit, stream, harvest, proposal.

## 18) QA and UAT Plan

### 18.1 QA Checklist

- Verify all state variants on each core route.
- Verify mobile breakpoints and touch targets.
- Verify keyboard-only path for connect, deposit, harvest.
- Verify explorer links and transaction hash visibility.

### 18.2 UAT Scenarios

1. First-time user completes connect to deposit.
2. Returning user harvests pending yield successfully.
3. User with invalid split receives clear remediation.
4. User reviews and approves one COND proposal.

## 19) Phased Delivery Plan

This section divides execution into concrete phases with entry goals, implementation scope, and exit gates.

## 19.1 Phase 0 - Baseline and Planning (2-3 days)

### Objective

Lock the current baseline and align implementation order to Black Belt submission-critical outcomes.

### Scope

- Freeze baseline screenshots for key routes.
- Define P0, P1, P2 backlog labels in issue tracker.
- Confirm analytics event naming and owner per event.

### Deliverables

- Baseline screenshot pack (Home, Onboarding, Bonds, Bond Detail, Dashboard, Agent).
- Prioritized implementation board mapped to this PRD.
- Risk register (timeline, dependencies, fallback plan).

### Exit Criteria

- Baseline artifacts approved.
- Team agreement on phase sequence and ownership.

## 19.2 Phase 1 - Foundation and Trust UX (Week 1)

### Objective

Ship the reusable components and transaction trust system used by all critical flows.

### Scope

- Implement shared components listed in section 11.1.
- Implement unified state standards listed in section 11.2.
- Ship onboarding wizard + transaction lifecycle panel.

### Deliverables

- TransactionLifecyclePanel in core transactional screens.
- Standardized EmptyState and ErrorInline variants.
- Onboarding with explicit step states and troubleshooting guidance.

### Exit Criteria

- Connect-to-ready onboarding flow passes QA and UAT scenario 1.
- Deposit and harvest UI both expose build/sign/submit/confirm states.

## 19.3 Phase 2 - Core Journey Redesign (Week 2)

### Objective

Make the user-facing experience clearly new and improve first value completion.

### Scope

- Home conversion-focused restructure.
- Bonds and Bond Detail decision clarity improvements.
- Dashboard live monitoring and split health improvements.

### Deliverables

- Home "start in 60 seconds" guided module.
- Bond decision UX improvements (risk clarity, empty states, invest summary).
- Dashboard daily delta and split validation feedback.

### Exit Criteria

- Core flow from Home to first deposit is fully usable on mobile.
- UAT scenarios 1, 2, and 3 pass.

## 19.4 Phase 3 - Advanced Feature UX Proof (Week 3)

### Objective

Strengthen the COND advanced feature experience to improve Black Belt proof quality.

### Scope

- Proposal confidence tiers and reasoning presentation.
- Approval/denial UX with explicit post-action feedback.
- Race/NFTs/Docs consistency pass.

### Deliverables

- Agent proposal queue with confidence and reasoning tags.
- Improved proposal action feedback and activity timeline quality.
- Consistent loading/empty/error states in secondary routes.

### Exit Criteria

- UAT scenario 4 passes.
- Advanced feature is demonstrably understandable in screen recording.

## 19.5 Phase 4 - Hardening and Compliance UX (Week 4)

### Objective

Raise production readiness perception through accessibility, performance, and reliability polish.

### Scope

- Accessibility pass (keyboard, labels, contrast, focus states).
- Performance pass (load, animation, layout stability).
- Security/trust microcopy consistency in all critical flows.

### Deliverables

- Accessibility QA checklist completion.
- Performance snapshots on key routes.
- Finalized transaction/error copy and trust cues.

### Exit Criteria

- Critical routes meet section 13, 14, and 15 requirements.
- No blocking QA defects remain in P0 scope.

## 19.6 Phase 5 - Submission Evidence and Story Packaging (2-3 days)

### Objective

Prepare reviewer-facing evidence so UI improvements are obvious and verifiable.

### Scope

- Capture before/after visual comparisons.
- Prepare demo walkthrough script and recording sequence.
- Update README with UI changes, links, and commit evidence.

### Deliverables

- Before vs after image set (same viewport and route order).
- 60-90 second demo script showing upgraded core journey.
- README UI evidence section with commit links.

### Exit Criteria

- Submission package is complete and internally review-ready.
- Black Belt checklist items have direct evidence mapping.

## 19.7 Compression Plan (If Deadline Is Tight)

If schedule compresses, complete phases in this strict order:

1. Phase 1 (Foundation and Trust UX)
2. Phase 2 (Core Journey Redesign)
3. Phase 4 (Hardening and Compliance UX)
4. Phase 5 (Submission Evidence)

Phase 3 can be reduced to minimum viable advanced-feature polish if required.

## 20) Definition of Done

UI work is complete when all are true:

- All in-scope routes pass acceptance criteria in this PRD.
- All critical transaction actions show full lifecycle states.
- Mobile-first flows are validated across key device sizes.
- Analytics events are emitted for all critical funnel actions.
- Before/after visual evidence is prepared for submission.

## 21) Black Belt Submission Evidence Mapping

This UI PRD directly supports Black Belt acceptance by creating visible proof in the product and README:

- New UX flow and visual hierarchy for production readiness.
- Metrics and monitoring surfaced in user experience.
- Security and trust cues integrated in critical actions.
- Advanced feature clarity for COND agent workflows.
- Documentation quality elevated with formal PRD and acceptance criteria.

## 22) Implementation File Map

Primary files expected to change during implementation:

- client/src/pages/Home.tsx
- client/src/pages/Onboarding.tsx
- client/src/pages/Bonds.tsx
- client/src/pages/BondDetail.tsx
- client/src/pages/Dashboard.tsx
- client/src/pages/Agent.tsx
- client/src/components/layout/AppLayout.tsx
- client/src/components/ui/EmptyState.tsx
- client/src/index.css

## 23) Open Questions

- Which analytics provider will be used for event tracking in production?
- Should compare mode decisions persist in local storage?
- What is the final order of priority if timeline compresses before deadline?

## 24) Approval Sign-Off

- Product Owner: Pending
- Design Lead: Pending
- Engineering Lead: Pending
- QA Lead: Pending
