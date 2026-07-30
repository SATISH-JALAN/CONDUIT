#![no_std]

//! Conduit COND executor.
//!
//! Bounded, auditable execution layer for the autonomous COND agent. A user
//! sets an on-chain mandate (min/max acceptable APY) and a kill switch. The
//! operator (agent) can only execute a repricing action for a wallet if the
//! box's oracle rate is within that wallet's mandate and the kill switch is off;
//! every execution emits an immutable chain-of-thought (CoT) event. This moves
//! mandate enforcement from an off-chain "trust me" HMAC to on-chain policy.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Env, IntoVal, String, Val, Vec,
};

const MAX_APY_BPS: u32 = 100_000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Mandate {
    pub min_apy_bps: u32,
    pub max_apy_bps: u32,
    pub kill_switch: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Router,
    Oracle,
    Mandate(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum CondError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    MandateNotSet = 3,
    KillSwitchEngaged = 4,
    MandateViolation = 5,
    InvalidBounds = 6,
}

#[contract]
pub struct CondExecutorContract;

fn load_addr(env: &Env, key: &DataKey) -> Address {
    match env.storage().instance().get(key) {
        Some(a) => a,
        None => panic_with_error!(env, CondError::NotInitialized),
    }
}

fn load_mandate(env: &Env, wallet: &Address) -> Mandate {
    match env.storage().persistent().get(&DataKey::Mandate(wallet.clone())) {
        Some(m) => m,
        None => panic_with_error!(env, CondError::MandateNotSet),
    }
}

fn fetch_rate(env: &Env, box_id: &String) -> u32 {
    let oracle = load_addr(env, &DataKey::Oracle);
    let args: Vec<Val> = (box_id.clone(),).into_val(env);
    env.invoke_contract::<u32>(&oracle, &symbol_short!("get_rate"), args)
}

#[contractimpl]
impl CondExecutorContract {
    pub fn initialize(env: Env, admin: Address, router: Address, oracle: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, CondError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Router, &router);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
    }

    /// User sets the APY bounds the agent must respect. Preserves an existing
    /// kill-switch state. Requires the wallet's authorization.
    pub fn set_mandate(env: Env, wallet: Address, min_apy_bps: u32, max_apy_bps: u32) {
        wallet.require_auth();
        if min_apy_bps == 0 || min_apy_bps > max_apy_bps || max_apy_bps > MAX_APY_BPS {
            panic_with_error!(&env, CondError::InvalidBounds);
        }
        let kill = env
            .storage()
            .persistent()
            .get::<_, Mandate>(&DataKey::Mandate(wallet.clone()))
            .map(|m| m.kill_switch)
            .unwrap_or(false);
        let mandate = Mandate {
            min_apy_bps,
            max_apy_bps,
            kill_switch: kill,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Mandate(wallet.clone()), &mandate);
        env.events().publish(
            (symbol_short!("cond"), symbol_short!("mandate"), wallet),
            (min_apy_bps, max_apy_bps),
        );
    }

    /// Pause/resume all autonomous activity for a wallet. Wallet-authorized.
    pub fn set_kill_switch(env: Env, wallet: Address, engaged: bool) {
        wallet.require_auth();
        let mut mandate = load_mandate(&env, &wallet);
        mandate.kill_switch = engaged;
        env.storage()
            .persistent()
            .set(&DataKey::Mandate(wallet.clone()), &mandate);
        env.events().publish(
            (symbol_short!("cond"), symbol_short!("kill"), wallet),
            engaged,
        );
    }

    pub fn get_mandate(env: Env, wallet: Address) -> Mandate {
        load_mandate(&env, &wallet)
    }

    /// Pure check: is an action resulting in `apy_bps` allowed for `wallet`?
    pub fn validate(env: Env, wallet: Address, apy_bps: u32) -> bool {
        let m = match env
            .storage()
            .persistent()
            .get::<_, Mandate>(&DataKey::Mandate(wallet))
        {
            Some(m) => m,
            None => return false,
        };
        !m.kill_switch && apy_bps >= m.min_apy_bps && apy_bps <= m.max_apy_bps
    }

    /// Execute an agent-proposed repricing for `wallet` on `box_id`, but only if
    /// the box's oracle rate is within the wallet's mandate and the kill switch
    /// is off. Emits a CoT event and reprices the position via the stream router.
    /// Operator-only.
    pub fn execute_action(
        env: Env,
        wallet: Address,
        box_id: String,
        reason: String,
        confidence: u32,
    ) -> u32 {
        load_addr(&env, &DataKey::Admin).require_auth();

        let mandate = load_mandate(&env, &wallet);
        if mandate.kill_switch {
            panic_with_error!(&env, CondError::KillSwitchEngaged);
        }

        let rate = fetch_rate(&env, &box_id);
        if rate < mandate.min_apy_bps || rate > mandate.max_apy_bps {
            panic_with_error!(&env, CondError::MandateViolation);
        }

        // Immutable chain-of-thought audit log.
        env.events().publish(
            (symbol_short!("cond"), symbol_short!("cot"), wallet.clone()),
            (box_id.clone(), rate, confidence, reason),
        );

        // Apply the action on-chain: reprice the position to the oracle rate.
        let router = load_addr(&env, &DataKey::Router);
        let args: Vec<Val> = (wallet, box_id).into_val(&env);
        let _: Val = env.invoke_contract(&router, &symbol_short!("sync_apy"), args);

        rate
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{contract, contractimpl};

    #[contract]
    pub struct MockOracle;
    #[contractimpl]
    impl MockOracle {
        pub fn get_rate(_env: Env, _box_id: String) -> u32 {
            500
        }
    }

    // Records that sync_apy was invoked, so we can assert the action applied.
    #[contract]
    pub struct MockRouter;
    #[contractimpl]
    impl MockRouter {
        pub fn sync_apy(env: Env, _wallet: Address, _box_id: String) -> u32 {
            env.storage()
                .instance()
                .set(&symbol_short!("called"), &true);
            0
        }
        pub fn was_called(env: Env) -> bool {
            env.storage()
                .instance()
                .get(&symbol_short!("called"))
                .unwrap_or(false)
        }
    }

    struct Harness<'a> {
        env: Env,
        client: CondExecutorContractClient<'a>,
        router: MockRouterClient<'a>,
        wallet: Address,
        box_id: String,
    }

    fn setup<'a>() -> Harness<'a> {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let wallet = Address::generate(&env);
        let oracle = env.register(MockOracle, ());
        let router_id = env.register(MockRouter, ());

        let id = env.register(CondExecutorContract, ());
        let client = CondExecutorContractClient::new(&env, &id);
        client.initialize(&admin, &router_id, &oracle);

        let router = MockRouterClient::new(&env, &router_id);
        let box_id = String::from_str(&env, "us-treasury-10y");

        Harness {
            env,
            client,
            router,
            wallet,
            box_id,
        }
    }

    #[test]
    fn execute_within_mandate_applies_action() {
        let h = setup();
        h.client.set_mandate(&h.wallet, &100, &1000); // 500 is within
        let applied = h.client.execute_action(
            &h.wallet,
            &h.box_id,
            &String::from_str(&h.env, "rotate to safer box"),
            &88,
        );
        assert_eq!(applied, 500);
        assert!(h.router.was_called());
    }

    #[test]
    #[should_panic]
    fn execute_without_mandate_fails() {
        let h = setup();
        h.client.execute_action(
            &h.wallet,
            &h.box_id,
            &String::from_str(&h.env, "no mandate"),
            &50,
        );
    }

    #[test]
    #[should_panic]
    fn execute_blocked_by_kill_switch() {
        let h = setup();
        h.client.set_mandate(&h.wallet, &100, &1000);
        h.client.set_kill_switch(&h.wallet, &true);
        h.client.execute_action(
            &h.wallet,
            &h.box_id,
            &String::from_str(&h.env, "should be blocked"),
            &99,
        );
    }

    #[test]
    #[should_panic]
    fn execute_out_of_bounds_fails() {
        let h = setup();
        // Cap max below the oracle rate (500) → mandate violation.
        h.client.set_mandate(&h.wallet, &100, &300);
        h.client.execute_action(
            &h.wallet,
            &h.box_id,
            &String::from_str(&h.env, "too risky"),
            &70,
        );
    }

    #[test]
    #[should_panic]
    fn set_mandate_rejects_inverted_bounds() {
        let h = setup();
        h.client.set_mandate(&h.wallet, &900, &100);
    }

    #[test]
    fn validate_reflects_mandate_and_kill_switch() {
        let h = setup();
        h.client.set_mandate(&h.wallet, &100, &1000);
        assert!(h.client.validate(&h.wallet, &500));
        assert!(!h.client.validate(&h.wallet, &50)); // below min
        assert!(!h.client.validate(&h.wallet, &2000)); // above max
        h.client.set_kill_switch(&h.wallet, &true);
        assert!(!h.client.validate(&h.wallet, &500)); // killed
    }
}
