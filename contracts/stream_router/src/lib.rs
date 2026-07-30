#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env,
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
    /// One-time admin/operator that initializes the vault.
    Admin,
    /// Address of the yield asset (a Stellar Asset Contract / SAC token).
    Token,
    /// Per-wallet streaming anchor.
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
    AlreadyInitialized = 5,
    NotInitialized = 6,
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

fn load_token(env: &Env) -> Address {
    match env.storage().instance().get(&DataKey::Token) {
        Some(token) => token,
        None => panic_with_error!(env, StreamRouterError::NotInitialized),
    }
}

/// Token client for the configured yield asset, used to move real tokens
/// between the user and this contract's own address.
fn token_client(env: &Env) -> token::TokenClient<'_> {
    token::TokenClient::new(env, &load_token(env))
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
    /// One-time setup: records the operator and the yield asset (SAC token)
    /// the vault custodies. Must be called before any deposit.
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, StreamRouterError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
    }

    /// The asset this vault custodies.
    pub fn get_token(env: Env) -> Address {
        load_token(&env)
    }

    pub fn deposit(env: Env, wallet: Address, amount: i128, apy_bps: u32) -> Anchor {
        wallet.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, StreamRouterError::AmountMustBePositive);
        }
        validate_apy(&env, apy_bps);

        // Real custody: pull `amount` of the yield asset from the user into the
        // vault. This is the transfer that was missing — deposits now move tokens.
        token_client(&env).transfer(&wallet, &env.current_contract_address(), &amount);

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

        // Real settlement: pay accrued yield out of the vault's reserve to the
        // user. The vault must hold enough of the yield asset (seeded reserve).
        if pending > 0 {
            token_client(&env).transfer(&env.current_contract_address(), &wallet, &pending);
        }

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

        // Real settlement: return withdrawn principal (+ any harvested yield in
        // the requested amount) from the vault to the user.
        token_client(&env).transfer(&env.current_contract_address(), &wallet, &amount);

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
    use soroban_sdk::token::StellarAssetClient;

    /// Test harness: deploys the vault + a fresh SAC token, funds a user and the
    /// vault reserve, and returns clients for driving real token flows.
    struct Harness<'a> {
        env: Env,
        client: StreamRouterContractClient<'a>,
        token: token::TokenClient<'a>,
        vault: Address,
        wallet: Address,
    }

    fn setup<'a>() -> Harness<'a> {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let wallet = Address::generate(&env);

        // Deploy a Stellar Asset Contract to act as the yield asset.
        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        let token_address = sac.address();
        let sac_admin = StellarAssetClient::new(&env, &token_address);
        let token = token::TokenClient::new(&env, &token_address);

        // Deploy + initialize the vault.
        let contract_id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &contract_id);
        client.initialize(&admin, &token_address);

        // Fund the user (to deposit) and the vault reserve (to pay yield).
        sac_admin.mint(&wallet, &1_000_000_000);
        sac_admin.mint(&contract_id, &1_000_000_000);

        Harness {
            env,
            client,
            token,
            vault: contract_id,
            wallet,
        }
    }

    #[test]
    fn deposit_moves_tokens_into_vault() {
        let h = setup();
        let user_before = h.token.balance(&h.wallet);
        let vault_before = h.token.balance(&h.vault);

        h.env.ledger().with_mut(|l| l.timestamp = 1);
        let anchor = h.client.deposit(&h.wallet, &100_000_000, &1000);

        assert_eq!(anchor.principal, 100_000_000);
        // User balance decreased, vault balance increased by exactly the deposit.
        assert_eq!(h.token.balance(&h.wallet), user_before - 100_000_000);
        assert_eq!(h.token.balance(&h.vault), vault_before + 100_000_000);
    }

    #[test]
    fn accrual_increases_over_time() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 1);
        h.client.deposit(&h.wallet, &100_000_000, &1000);

        h.env.ledger().with_mut(|l| l.timestamp = 31_536_001);
        assert_eq!(h.client.get_accrued(&h.wallet), 10_000_000);
    }

    #[test]
    fn harvest_pays_real_tokens_and_resets_yield() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 10);
        h.client.deposit(&h.wallet, &50_000_000, &500);

        let after_deposit = h.token.balance(&h.wallet);

        h.env.ledger().with_mut(|l| l.timestamp = 31_536_010);
        let harvested = h.client.harvest(&h.wallet);
        assert!(harvested > 0);

        // The harvested yield actually landed in the user's wallet.
        assert_eq!(h.token.balance(&h.wallet), after_deposit + harvested);
        // Pending resets after harvest.
        assert_eq!(h.client.get_accrued(&h.wallet), 0);
    }

    #[test]
    fn withdraw_returns_tokens_to_user() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 100);
        h.client.deposit(&h.wallet, &10_000_000, &500);

        let after_deposit = h.token.balance(&h.wallet);
        h.client.withdraw(&h.wallet, &4_000_000);

        assert_eq!(h.token.balance(&h.wallet), after_deposit + 4_000_000);
    }

    #[test]
    #[should_panic]
    fn deposit_rejects_zero_apy() {
        let h = setup();
        h.client.deposit(&h.wallet, &100_000, &0);
    }

    #[test]
    #[should_panic]
    fn deposit_rejects_apy_above_limit() {
        let h = setup();
        h.client.deposit(&h.wallet, &100_000, &(MAX_APY_BPS + 1));
    }

    #[test]
    #[should_panic]
    fn withdraw_rejects_amount_above_total() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 100);
        h.client.deposit(&h.wallet, &1_000_000, &500);
        h.client.withdraw(&h.wallet, &9_999_999);
    }

    #[test]
    #[should_panic]
    fn deposit_before_initialize_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);
        // No initialize(), no token configured → NotInitialized.
        client.deposit(&wallet, &100_000, &500);
    }
}
