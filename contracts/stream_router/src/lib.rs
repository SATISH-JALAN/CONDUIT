#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, IntoVal, String, Val, Vec,
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

/// One destination of a harvest yield split, weighted in basis points.
#[contracttype]
#[derive(Clone)]
pub struct SplitEntry {
    pub dest: Address,
    pub bps: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// One-time admin/operator that initializes the vault.
    Admin,
    /// Address of the yield asset (a Stellar Asset Contract / SAC token).
    Token,
    /// Address of the rate oracle that authorizes per-box APYs.
    Oracle,
    /// Per-wallet streaming anchor.
    Anchor(Address),
    /// Per-wallet harvest split routing (destinations + weights).
    Split(Address),
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
    InvalidSplit = 7,
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

fn load_admin(env: &Env) -> Address {
    match env.storage().instance().get(&DataKey::Admin) {
        Some(admin) => admin,
        None => panic_with_error!(env, StreamRouterError::NotInitialized),
    }
}

fn load_token(env: &Env) -> Address {
    match env.storage().instance().get(&DataKey::Token) {
        Some(token) => token,
        None => panic_with_error!(env, StreamRouterError::NotInitialized),
    }
}

fn load_oracle(env: &Env) -> Address {
    match env.storage().instance().get(&DataKey::Oracle) {
        Some(oracle) => oracle,
        None => panic_with_error!(env, StreamRouterError::NotInitialized),
    }
}

fn load_split(env: &Env, wallet: &Address) -> Vec<SplitEntry> {
    env.storage()
        .persistent()
        .get(&DataKey::Split(wallet.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

/// Token client for the configured yield asset, used to move real tokens
/// between the user and this contract's own address.
fn token_client(env: &Env) -> token::TokenClient<'_> {
    token::TokenClient::new(env, &load_token(env))
}

/// Fetch the authorized APY (bps) for a box from the rate oracle via a
/// cross-contract call. The rate can no longer be supplied by the depositor.
fn fetch_rate(env: &Env, box_id: &String) -> u32 {
    let oracle = load_oracle(env);
    let args: Vec<Val> = (box_id.clone(),).into_val(env);
    env.invoke_contract::<u32>(&oracle, &symbol_short!("get_rate"), args)
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
    /// One-time setup: records the operator, the yield asset (SAC token) the
    /// vault custodies, and the rate oracle that authorizes per-box APYs.
    pub fn initialize(env: Env, admin: Address, token: Address, oracle: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, StreamRouterError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
    }

    /// The asset this vault custodies.
    pub fn get_token(env: Env) -> Address {
        load_token(&env)
    }

    /// The rate oracle this vault reads APYs from.
    pub fn get_oracle(env: Env) -> Address {
        load_oracle(&env)
    }

    /// Deposit into the box identified by `box_id`. The APY is read from the
    /// oracle — the depositor cannot choose their own rate.
    pub fn deposit(env: Env, wallet: Address, amount: i128, box_id: String) -> Anchor {
        wallet.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, StreamRouterError::AmountMustBePositive);
        }

        // Authorized rate comes from the oracle, not the caller.
        let apy_bps = fetch_rate(&env, &box_id);
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

        // Real settlement: pay accrued yield out of the vault's reserve. If the
        // user configured a split, route it atomically across destinations
        // inside the contract (trustless); otherwise pay it all to the user.
        if pending > 0 {
            let splits = load_split(&env, &wallet);
            let client = token_client(&env);
            let vault = env.current_contract_address();

            if splits.is_empty() {
                client.transfer(&vault, &wallet, &pending);
            } else {
                let n = splits.len();
                let mut distributed: i128 = 0;
                for i in 0..n {
                    let entry = splits.get(i).unwrap();
                    // Last destination absorbs the rounding remainder so the
                    // full accrued amount is always paid out exactly.
                    let amount = if i == n - 1 {
                        pending - distributed
                    } else {
                        pending.saturating_mul(entry.bps as i128) / BPS_SCALE
                    };
                    distributed = distributed.saturating_add(amount);
                    if amount > 0 {
                        client.transfer(&vault, &entry.dest, &amount);
                    }
                }
            }
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

    /// Configure how harvested yield is routed. Weights are basis points and
    /// must sum to exactly 10000 (100%). Requires the wallet's authorization.
    pub fn set_split(env: Env, wallet: Address, splits: Vec<SplitEntry>) {
        wallet.require_auth();

        let n = splits.len();
        if n == 0 {
            panic_with_error!(&env, StreamRouterError::InvalidSplit);
        }

        let mut total: u32 = 0;
        for i in 0..n {
            let entry = splits.get(i).unwrap();
            if entry.bps == 0 {
                panic_with_error!(&env, StreamRouterError::InvalidSplit);
            }
            total = total.saturating_add(entry.bps);
        }
        if total != 10_000 {
            panic_with_error!(&env, StreamRouterError::InvalidSplit);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Split(wallet.clone()), &splits);
        env.events().publish(
            (symbol_short!("srt_v1"), symbol_short!("split_set"), wallet),
            n,
        );
    }

    /// Read a wallet's harvest split (empty = pay 100% to the wallet).
    pub fn get_split(env: Env, wallet: Address) -> Vec<SplitEntry> {
        load_split(&env, &wallet)
    }

    /// Remove a wallet's split so harvest pays it directly again.
    pub fn clear_split(env: Env, wallet: Address) {
        wallet.require_auth();
        env.storage().persistent().remove(&DataKey::Split(wallet));
    }

    /// Re-price a position to the box's current oracle rate, settling accrued
    /// yield into principal first. Operator/keeper only — this is how oracle
    /// rate changes propagate to open positions. The depositor cannot call it.
    pub fn sync_apy(env: Env, wallet: Address, box_id: String) -> Anchor {
        let admin = load_admin(&env);
        admin.require_auth();

        let new_bps = fetch_rate(&env, &box_id);
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
    use soroban_sdk::{contract, contractimpl, vec};

    // Minimal in-test oracle returning a fixed rate, so the stream_router tests
    // can exercise the cross-contract read without depending on the oracle crate.
    #[contract]
    pub struct MockOracle;
    #[contractimpl]
    impl MockOracle {
        pub fn get_rate(_env: Env, _box_id: String) -> u32 {
            500
        }
    }

    // Oracle returning an invalid (zero) rate, to prove defense-in-depth.
    #[contract]
    pub struct ZeroOracle;
    #[contractimpl]
    impl ZeroOracle {
        pub fn get_rate(_env: Env, _box_id: String) -> u32 {
            0
        }
    }

    struct Harness<'a> {
        env: Env,
        client: StreamRouterContractClient<'a>,
        token: token::TokenClient<'a>,
        vault: Address,
        wallet: Address,
        box_id: String,
    }

    fn setup<'a>() -> Harness<'a> {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let wallet = Address::generate(&env);
        let oracle = env.register(MockOracle, ());

        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        let token_address = sac.address();
        let sac_admin = StellarAssetClient::new(&env, &token_address);
        let token = token::TokenClient::new(&env, &token_address);

        let contract_id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &contract_id);
        client.initialize(&admin, &token_address, &oracle);

        sac_admin.mint(&wallet, &1_000_000_000);
        sac_admin.mint(&contract_id, &1_000_000_000);

        let box_id = String::from_str(&env, "us-treasury-10y");

        Harness {
            env,
            client,
            token,
            vault: contract_id,
            wallet,
            box_id,
        }
    }

    #[test]
    fn deposit_uses_oracle_rate_not_caller() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 1);
        let anchor = h.client.deposit(&h.wallet, &100_000_000, &h.box_id);
        // Rate came from the oracle (500), regardless of any caller preference.
        assert_eq!(anchor.apy_bps, 500);
    }

    #[test]
    fn deposit_moves_tokens_into_vault() {
        let h = setup();
        let user_before = h.token.balance(&h.wallet);
        let vault_before = h.token.balance(&h.vault);

        h.env.ledger().with_mut(|l| l.timestamp = 1);
        let anchor = h.client.deposit(&h.wallet, &100_000_000, &h.box_id);

        assert_eq!(anchor.principal, 100_000_000);
        assert_eq!(h.token.balance(&h.wallet), user_before - 100_000_000);
        assert_eq!(h.token.balance(&h.vault), vault_before + 100_000_000);
    }

    #[test]
    fn accrual_increases_over_time() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 1);
        h.client.deposit(&h.wallet, &100_000_000, &h.box_id);

        h.env.ledger().with_mut(|l| l.timestamp = 31_536_001);
        // 100_000_000 @ 500 bps for one year = 5_000_000.
        assert_eq!(h.client.get_accrued(&h.wallet), 5_000_000);
    }

    #[test]
    fn harvest_pays_real_tokens_and_resets_yield() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 10);
        h.client.deposit(&h.wallet, &50_000_000, &h.box_id);

        let after_deposit = h.token.balance(&h.wallet);

        h.env.ledger().with_mut(|l| l.timestamp = 31_536_010);
        let harvested = h.client.harvest(&h.wallet);
        assert!(harvested > 0);

        assert_eq!(h.token.balance(&h.wallet), after_deposit + harvested);
        assert_eq!(h.client.get_accrued(&h.wallet), 0);
    }

    #[test]
    fn withdraw_returns_tokens_to_user() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 100);
        h.client.deposit(&h.wallet, &10_000_000, &h.box_id);

        let after_deposit = h.token.balance(&h.wallet);
        h.client.withdraw(&h.wallet, &4_000_000);

        assert_eq!(h.token.balance(&h.wallet), after_deposit + 4_000_000);
    }

    #[test]
    #[should_panic]
    fn deposit_rejects_invalid_oracle_rate() {
        // Oracle returns 0 → validate_apy rejects it (defense in depth).
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let wallet = Address::generate(&env);
        let bad_oracle = env.register(ZeroOracle, ());
        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        let token_address = sac.address();
        StellarAssetClient::new(&env, &token_address).mint(&wallet, &1_000_000_000);
        let id = env.register(StreamRouterContract, ());
        let client = StreamRouterContractClient::new(&env, &id);
        client.initialize(&admin, &token_address, &bad_oracle);
        client.deposit(&wallet, &1_000_000, &String::from_str(&env, "any-box"));
    }

    #[test]
    fn harvest_distributes_across_split() {
        let h = setup();
        let d0 = Address::generate(&h.env);
        let d1 = Address::generate(&h.env);
        let splits = vec![
            &h.env,
            SplitEntry { dest: d0.clone(), bps: 6000 },
            SplitEntry { dest: d1.clone(), bps: 4000 },
        ];
        h.client.set_split(&h.wallet, &splits);

        h.env.ledger().with_mut(|l| l.timestamp = 1);
        h.client.deposit(&h.wallet, &100_000_000, &h.box_id);
        h.env.ledger().with_mut(|l| l.timestamp = 31_536_001);

        // 100_000_000 @ 500 bps for one year = 5_000_000 accrued, split 60/40.
        let harvested = h.client.harvest(&h.wallet);
        assert_eq!(harvested, 5_000_000);
        assert_eq!(h.token.balance(&d0), 3_000_000);
        assert_eq!(h.token.balance(&d1), 2_000_000);
    }

    #[test]
    #[should_panic]
    fn set_split_rejects_bad_total() {
        let h = setup();
        let d0 = Address::generate(&h.env);
        // Only 50% allocated → must reject.
        let splits = vec![&h.env, SplitEntry { dest: d0, bps: 5000 }];
        h.client.set_split(&h.wallet, &splits);
    }

    #[test]
    fn clear_split_reverts_to_direct_payout() {
        let h = setup();
        let d0 = Address::generate(&h.env);
        let splits = vec![&h.env, SplitEntry { dest: d0, bps: 10_000 }];
        h.client.set_split(&h.wallet, &splits);
        assert_eq!(h.client.get_split(&h.wallet).len(), 1);

        h.client.clear_split(&h.wallet);
        assert_eq!(h.client.get_split(&h.wallet).len(), 0);

        // With no split, harvest pays the wallet directly again.
        h.env.ledger().with_mut(|l| l.timestamp = 1);
        h.client.deposit(&h.wallet, &50_000_000, &h.box_id);
        h.env.ledger().with_mut(|l| l.timestamp = 31_536_001);
        let before = h.token.balance(&h.wallet);
        let harvested = h.client.harvest(&h.wallet);
        assert_eq!(h.token.balance(&h.wallet), before + harvested);
    }

    #[test]
    #[should_panic]
    fn withdraw_rejects_amount_above_total() {
        let h = setup();
        h.env.ledger().with_mut(|l| l.timestamp = 100);
        h.client.deposit(&h.wallet, &1_000_000, &h.box_id);
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
        client.deposit(&wallet, &100_000, &String::from_str(&env, "b"));
    }
}
