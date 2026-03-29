#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Env,
};

const BPS_SCALE: i128 = 10_000;
const SECONDS_PER_YEAR: i128 = 31_536_000;
const MAX_APY_BPS: u32 = 100_000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Anchor {
    pub principal: i128,
    pub apy_bps: u32,
    pub sync_ts: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Anchor(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum StreamRouterError {
    AmountMustBePositive = 1,
    ApyOutOfRange = 2,
    NoActivePosition = 3,
    AmountExceedsAvailableBalance = 4,
}

#[contract]
pub struct StreamRouterContract;

fn now(env: &Env) -> u64 {
    env.ledger().timestamp()
}

fn load_anchor(env: &Env, wallet: &Address) -> Option<Anchor> {
    env.storage()
        .persistent()
        .get(&DataKey::Anchor(wallet.clone()))
}

fn save_anchor(env: &Env, wallet: &Address, anchor: &Anchor) {
    env.storage()
        .persistent()
        .set(&DataKey::Anchor(wallet.clone()), anchor);
}

fn accrued(anchor: &Anchor, ts: u64) -> i128 {
    if anchor.principal <= 0 || ts <= anchor.sync_ts {
        return 0;
    }

    let elapsed = (ts - anchor.sync_ts) as i128;

    anchor
        .principal
        .saturating_mul(anchor.apy_bps as i128)
        .saturating_mul(elapsed)
        / (BPS_SCALE * SECONDS_PER_YEAR)
}

fn validate_apy(env: &Env, apy_bps: u32) {
    if apy_bps == 0 || apy_bps > MAX_APY_BPS {
        panic_with_error!(env, StreamRouterError::ApyOutOfRange);
    }
}

#[contractimpl]
impl StreamRouterContract {
    pub fn deposit(env: Env, wallet: Address, amount: i128, apy_bps: u32) -> Anchor {
        wallet.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, StreamRouterError::AmountMustBePositive);
        }
        validate_apy(&env, apy_bps);

        let ts = now(&env);
        let key_wallet = wallet.clone();

        let next = match load_anchor(&env, &key_wallet) {
            Some(current) => {
                let pending = accrued(&current, ts);
                Anchor {
                    principal: current.principal.saturating_add(amount).saturating_add(pending),
                    apy_bps,
                    sync_ts: ts,
                }
            }
            None => Anchor {
                principal: amount,
                apy_bps,
                sync_ts: ts,
            },
        };

        save_anchor(&env, &key_wallet, &next);
        env.events().publish(
            (symbol_short!("srt_v1"), symbol_short!("deposit"), wallet),
            (amount, apy_bps, ts),
        );

        next
    }

    pub fn get_anchor(env: Env, wallet: Address) -> Option<Anchor> {
        load_anchor(&env, &wallet)
    }

    pub fn get_accrued(env: Env, wallet: Address) -> i128 {
        let ts = now(&env);
        load_anchor(&env, &wallet)
            .map(|entry| accrued(&entry, ts))
            .unwrap_or(0)
    }

    pub fn harvest(env: Env, wallet: Address) -> i128 {
        wallet.require_auth();

        let ts = now(&env);
        let mut current = match load_anchor(&env, &wallet) {
            Some(anchor) => anchor,
            None => panic_with_error!(&env, StreamRouterError::NoActivePosition),
        };
        let pending = accrued(&current, ts);

        current.sync_ts = ts;
        save_anchor(&env, &wallet, &current);

        env.events().publish(
            (symbol_short!("srt_v1"), symbol_short!("harvest"), wallet),
            (pending, ts),
        );

        pending
    }

    pub fn withdraw(env: Env, wallet: Address, amount: i128) -> Anchor {
        wallet.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, StreamRouterError::AmountMustBePositive);
        }

        let ts = now(&env);
        let mut current = match load_anchor(&env, &wallet) {
            Some(anchor) => anchor,
            None => panic_with_error!(&env, StreamRouterError::NoActivePosition),
        };
        let pending = accrued(&current, ts);
        let total = current.principal.saturating_add(pending);

        if amount > total {
            panic_with_error!(&env, StreamRouterError::AmountExceedsAvailableBalance);
        }

        current.principal = total.saturating_sub(amount);
        current.sync_ts = ts;
        save_anchor(&env, &wallet, &current);

        env.events().publish(
            (symbol_short!("srt_v1"), symbol_short!("withdraw"), wallet),
            (amount, ts),
        );

        current
    }

    pub fn update_apy(env: Env, wallet: Address, new_bps: u32) -> Anchor {
        wallet.require_auth();

        validate_apy(&env, new_bps);

        let ts = now(&env);
        let mut current = match load_anchor(&env, &wallet) {
            Some(anchor) => anchor,
            None => panic_with_error!(&env, StreamRouterError::NoActivePosition),
        };
        let pending = accrued(&current, ts);

        current.principal = current.principal.saturating_add(pending);
        current.apy_bps = new_bps;
        current.sync_ts = ts;
        save_anchor(&env, &wallet, &current);

        env.events().publish(
            (symbol_short!("srt_v1"), symbol_short!("apy_upd"), wallet),
            (new_bps, ts),
        );

        current
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn accrual_increases_over_time() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);

        env.ledger().with_mut(|ledger| {
            ledger.timestamp = 1;
        });

        let deposited = client.deposit(&wallet, &100_000_000, &1000);
        assert_eq!(deposited.principal, 100_000_000);

        env.ledger().with_mut(|ledger| {
            ledger.timestamp = 31_536_001;
        });

        let pending = client.get_accrued(&wallet);
        assert_eq!(pending, 10_000_000);
    }

    #[test]
    fn harvest_resets_pending_yield() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);

        env.ledger().with_mut(|ledger| {
            ledger.timestamp = 10;
        });

        client.deposit(&wallet, &50_000_000, &500);

        env.ledger().with_mut(|ledger| {
            ledger.timestamp = 31_536_010;
        });

        let harvested = client.harvest(&wallet);
        assert!(harvested > 0);

        let pending_after = client.get_accrued(&wallet);
        assert_eq!(pending_after, 0);
    }

    #[test]
    #[should_panic]
    fn deposit_rejects_zero_apy() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);

        client.deposit(&wallet, &100_000, &0);
    }

    #[test]
    #[should_panic]
    fn deposit_rejects_apy_above_limit() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);

        client.deposit(&wallet, &100_000, &(MAX_APY_BPS + 1));
    }

    #[test]
    #[should_panic]
    fn withdraw_rejects_amount_above_total() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);

        env.ledger().with_mut(|ledger| {
            ledger.timestamp = 100;
        });
        client.deposit(&wallet, &1_000_000, &500);

        client.withdraw(&wallet, &9_999_999);
    }
}
