#![no_std]

//! Conduit rate oracle.
//!
//! Stores the authorized APY (basis points) for each bond box on-chain. Only the
//! oracle admin may write rates; the stream_router reads them at deposit time so
//! yield rates can no longer be chosen by the depositor.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Env, String,
};

const MAX_APY_BPS: u32 = 100_000;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The authority allowed to write rates.
    Admin,
    /// Per-box APY in basis points, keyed by the box id string.
    Rate(String),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RateOracleError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    RateNotSet = 3,
    ApyOutOfRange = 4,
}

#[contract]
pub struct RateOracleContract;

fn load_admin(env: &Env) -> Address {
    match env.storage().instance().get(&DataKey::Admin) {
        Some(admin) => admin,
        None => panic_with_error!(env, RateOracleError::NotInitialized),
    }
}

#[contractimpl]
impl RateOracleContract {
    /// One-time setup: records the rate-writing authority.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, RateOracleError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Set the APY (bps) for a box. Admin-only; bounds-checked.
    pub fn set_rate(env: Env, box_id: String, apy_bps: u32) {
        let admin = load_admin(&env);
        admin.require_auth();

        if apy_bps == 0 || apy_bps > MAX_APY_BPS {
            panic_with_error!(&env, RateOracleError::ApyOutOfRange);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Rate(box_id.clone()), &apy_bps);

        env.events().publish(
            (symbol_short!("rate_v1"), symbol_short!("set_rate")),
            (box_id, apy_bps),
        );
    }

    /// Read the APY (bps) for a box. Panics if the rate was never set.
    pub fn get_rate(env: Env, box_id: String) -> u32 {
        match env.storage().persistent().get(&DataKey::Rate(box_id)) {
            Some(rate) => rate,
            None => panic_with_error!(&env, RateOracleError::RateNotSet),
        }
    }

    /// Rotate the rate-writing authority. Current admin must authorize.
    pub fn rotate_admin(env: Env, new_admin: Address) {
        let admin = load_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    pub fn get_admin(env: Env) -> Address {
        load_admin(&env)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup<'a>() -> (Env, RateOracleContractClient<'a>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let id = env.register(RateOracleContract, ());
        let client = RateOracleContractClient::new(&env, &id);
        client.initialize(&admin);
        (env, client)
    }

    #[test]
    fn set_and_get_rate() {
        let (env, client) = setup();
        let box_id = String::from_str(&env, "us-treasury-10y");
        client.set_rate(&box_id, &420);
        assert_eq!(client.get_rate(&box_id), 420);
    }

    #[test]
    fn rates_are_per_box() {
        let (env, client) = setup();
        let a = String::from_str(&env, "corporate-bond-a");
        let b = String::from_str(&env, "emerging-market-b");
        client.set_rate(&a, &650);
        client.set_rate(&b, &1200);
        assert_eq!(client.get_rate(&a), 650);
        assert_eq!(client.get_rate(&b), 1200);
    }

    #[test]
    #[should_panic]
    fn get_unset_rate_panics() {
        let (env, client) = setup();
        client.get_rate(&String::from_str(&env, "missing-box"));
    }

    #[test]
    #[should_panic]
    fn set_rate_rejects_zero() {
        let (env, client) = setup();
        client.set_rate(&String::from_str(&env, "b"), &0);
    }

    #[test]
    #[should_panic]
    fn set_rate_rejects_above_limit() {
        let (env, client) = setup();
        client.set_rate(&String::from_str(&env, "b"), &(MAX_APY_BPS + 1));
    }

    #[test]
    fn rotate_admin_changes_authority() {
        let (env, client) = setup();
        let new_admin = Address::generate(&env);
        client.rotate_admin(&new_admin);
        assert_eq!(client.get_admin(), new_admin);
    }
}
