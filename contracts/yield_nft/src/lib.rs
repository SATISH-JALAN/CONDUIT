#![no_std]

//! Conduit yield NFTs.
//!
//! A yield NFT tokenizes a fixed-term claim on future yield. Minting locks
//! `principal` of the yield asset and fixes the term's yield at the oracle rate
//! for the chosen box. The NFT is transferable; at maturity the holder redeems
//! it for principal + the full term's yield, paid from the contract (locked
//! principal + a seeded reserve). Minting is gated to accredited investors.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, IntoVal, String, Val, Vec,
};

const BPS_SCALE: i128 = 10_000;
const SECONDS_PER_YEAR: i128 = 31_536_000;
const MAX_APY_BPS: u32 = 100_000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct YieldNft {
    pub owner: Address,
    pub principal: i128,
    pub apy_bps: u32,
    pub start_ts: u64,
    pub maturity_ts: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Oracle,
    NextId,
    Nft(u64),
    Accredited(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum YieldNftError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAccredited = 3,
    AmountMustBePositive = 4,
    ApyOutOfRange = 5,
    NftNotFound = 6,
    NotOwner = 7,
    NotMatured = 8,
    InvalidTerm = 9,
}

#[contract]
pub struct YieldNftContract;

fn now(env: &Env) -> u64 {
    env.ledger().timestamp()
}

fn load_addr(env: &Env, key: &DataKey) -> Address {
    match env.storage().instance().get(key) {
        Some(a) => a,
        None => panic_with_error!(env, YieldNftError::NotInitialized),
    }
}

fn token_client(env: &Env) -> token::TokenClient<'_> {
    token::TokenClient::new(env, &load_addr(env, &DataKey::Token))
}

/// Fetch the authorized APY (bps) for a box from the rate oracle.
fn fetch_rate(env: &Env, box_id: &String) -> u32 {
    let oracle = load_addr(env, &DataKey::Oracle);
    let args: Vec<Val> = (box_id.clone(),).into_val(env);
    env.invoke_contract::<u32>(&oracle, &symbol_short!("get_rate"), args)
}

fn load_nft(env: &Env, id: u64) -> YieldNft {
    match env.storage().persistent().get(&DataKey::Nft(id)) {
        Some(nft) => nft,
        None => panic_with_error!(env, YieldNftError::NftNotFound),
    }
}

/// Fixed yield locked in at mint: principal x apy x term / (bps x year).
fn term_yield(nft: &YieldNft) -> i128 {
    let term = (nft.maturity_ts - nft.start_ts) as i128;
    nft.principal
        .saturating_mul(nft.apy_bps as i128)
        .saturating_mul(term)
        / (BPS_SCALE * SECONDS_PER_YEAR)
}

#[contractimpl]
impl YieldNftContract {
    pub fn initialize(env: Env, admin: Address, token: Address, oracle: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, YieldNftError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::NextId, &1u64);
    }

    /// Accreditation registry (admin-managed). In production this would delegate
    /// to the compliance contract; kept internal here to stay self-contained.
    pub fn set_accredited(env: Env, wallet: Address, status: bool) {
        load_addr(&env, &DataKey::Admin).require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Accredited(wallet), &status);
    }

    pub fn is_accredited(env: Env, wallet: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Accredited(wallet))
            .unwrap_or(false)
    }

    /// Mint a yield NFT: lock `principal` and fix the term's yield at the box's
    /// oracle rate. Only accredited wallets may mint.
    pub fn mint(
        env: Env,
        minter: Address,
        principal: i128,
        box_id: String,
        term_seconds: u64,
    ) -> u64 {
        minter.require_auth();

        if !Self::is_accredited(env.clone(), minter.clone()) {
            panic_with_error!(&env, YieldNftError::NotAccredited);
        }
        if principal <= 0 {
            panic_with_error!(&env, YieldNftError::AmountMustBePositive);
        }
        if term_seconds == 0 {
            panic_with_error!(&env, YieldNftError::InvalidTerm);
        }

        let apy_bps = fetch_rate(&env, &box_id);
        if apy_bps == 0 || apy_bps > MAX_APY_BPS {
            panic_with_error!(&env, YieldNftError::ApyOutOfRange);
        }

        // Lock the principal in the contract.
        token_client(&env).transfer(&minter, &env.current_contract_address(), &principal);

        let start = now(&env);
        let id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(1);
        let nft = YieldNft {
            owner: minter.clone(),
            principal,
            apy_bps,
            start_ts: start,
            maturity_ts: start + term_seconds,
        };
        env.storage().persistent().set(&DataKey::Nft(id), &nft);
        env.storage().instance().set(&DataKey::NextId, &(id + 1));

        env.events().publish(
            (symbol_short!("ynft"), symbol_short!("mint"), minter),
            (id, principal, apy_bps, nft.maturity_ts),
        );
        id
    }

    pub fn get_nft(env: Env, id: u64) -> YieldNft {
        load_nft(&env, id)
    }

    pub fn owner_of(env: Env, id: u64) -> Address {
        load_nft(&env, id).owner
    }

    /// The NFT's yield locked in at mint (full term).
    pub fn term_value(env: Env, id: u64) -> i128 {
        let nft = load_nft(&env, id);
        nft.principal.saturating_add(term_yield(&nft))
    }

    /// Transfer ownership of the NFT. Current owner must authorize.
    pub fn transfer(env: Env, id: u64, to: Address) {
        let mut nft = load_nft(&env, id);
        nft.owner.require_auth();
        let from = nft.owner.clone();
        nft.owner = to.clone();
        env.storage().persistent().set(&DataKey::Nft(id), &nft);
        env.events().publish(
            (symbol_short!("ynft"), symbol_short!("transfer"), from),
            (id, to),
        );
    }

    /// Redeem a matured NFT for principal + the full term's yield, then burn it.
    pub fn redeem(env: Env, id: u64) -> i128 {
        let nft = load_nft(&env, id);
        nft.owner.require_auth();

        if now(&env) < nft.maturity_ts {
            panic_with_error!(&env, YieldNftError::NotMatured);
        }

        let payout = nft.principal.saturating_add(term_yield(&nft));
        token_client(&env).transfer(&env.current_contract_address(), &nft.owner, &payout);
        env.storage().persistent().remove(&DataKey::Nft(id));

        env.events().publish(
            (symbol_short!("ynft"), symbol_short!("redeem"), nft.owner),
            (id, payout),
        );
        payout
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::token::StellarAssetClient;
    use soroban_sdk::{contract, contractimpl};

    #[contract]
    pub struct MockOracle;
    #[contractimpl]
    impl MockOracle {
        pub fn get_rate(_env: Env, _box_id: String) -> u32 {
            500
        }
    }

    struct Harness<'a> {
        env: Env,
        client: YieldNftContractClient<'a>,
        token: token::TokenClient<'a>,
        vault: Address,
        minter: Address,
        box_id: String,
    }

    fn setup<'a>() -> Harness<'a> {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let minter = Address::generate(&env);
        let oracle = env.register(MockOracle, ());

        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        let token_address = sac.address();
        let sac_admin = StellarAssetClient::new(&env, &token_address);
        let token = token::TokenClient::new(&env, &token_address);

        let id = env.register(YieldNftContract, ());
        let client = YieldNftContractClient::new(&env, &id);
        client.initialize(&admin, &token_address, &oracle);

        sac_admin.mint(&minter, &1_000_000_000);
        sac_admin.mint(&id, &1_000_000_000); // yield reserve

        let box_id = String::from_str(&env, "us-treasury-10y");

        Harness {
            env,
            client,
            token,
            vault: id,
            minter,
            box_id,
        }
    }

    #[test]
    #[should_panic]
    fn mint_requires_accreditation() {
        let h = setup();
        // minter is not accredited → mint must reject.
        h.client
            .mint(&h.minter, &100_000_000, &h.box_id, &31_536_000);
    }

    #[test]
    fn mint_locks_principal() {
        let h = setup();
        h.client.set_accredited(&h.minter, &true);

        let minter_before = h.token.balance(&h.minter);
        let vault_before = h.token.balance(&h.vault);

        let id = h
            .client
            .mint(&h.minter, &100_000_000, &h.box_id, &31_536_000);
        assert_eq!(id, 1);
        assert_eq!(h.token.balance(&h.minter), minter_before - 100_000_000);
        assert_eq!(h.token.balance(&h.vault), vault_before + 100_000_000);

        let nft = h.client.get_nft(&1);
        assert_eq!(nft.principal, 100_000_000);
        assert_eq!(nft.apy_bps, 500);
    }

    #[test]
    fn transfer_moves_ownership() {
        let h = setup();
        h.client.set_accredited(&h.minter, &true);
        let id = h
            .client
            .mint(&h.minter, &50_000_000, &h.box_id, &31_536_000);

        let holder = Address::generate(&h.env);
        h.client.transfer(&id, &holder);
        assert_eq!(h.client.owner_of(&id), holder);
    }

    #[test]
    #[should_panic]
    fn redeem_before_maturity_fails() {
        let h = setup();
        h.client.set_accredited(&h.minter, &true);
        h.env.ledger().with_mut(|l| l.timestamp = 100);
        let id = h
            .client
            .mint(&h.minter, &50_000_000, &h.box_id, &31_536_000);
        h.client.redeem(&id); // still at ts=100, not matured
    }

    #[test]
    fn redeem_pays_principal_plus_yield_to_holder() {
        let h = setup();
        h.client.set_accredited(&h.minter, &true);
        h.env.ledger().with_mut(|l| l.timestamp = 1);
        let id = h
            .client
            .mint(&h.minter, &100_000_000, &h.box_id, &31_536_000);

        // Sell the strip to a new holder.
        let holder = Address::generate(&h.env);
        h.client.transfer(&id, &holder);
        let holder_before = h.token.balance(&holder);

        // Advance past maturity and redeem.
        h.env.ledger().with_mut(|l| l.timestamp = 31_536_002);
        let payout = h.client.redeem(&id);

        // 100_000_000 @ 500 bps for one year = 5_000_000 yield → 105_000_000.
        assert_eq!(payout, 105_000_000);
        assert_eq!(h.token.balance(&holder), holder_before + 105_000_000);
    }

    #[test]
    #[should_panic]
    fn redeemed_nft_is_burned() {
        let h = setup();
        h.client.set_accredited(&h.minter, &true);
        h.env.ledger().with_mut(|l| l.timestamp = 1);
        let id = h.client.mint(&h.minter, &10_000_000, &h.box_id, &10);
        h.env.ledger().with_mut(|l| l.timestamp = 100);
        h.client.redeem(&id);
        // Burned → get_nft panics with NftNotFound.
        h.client.get_nft(&id);
    }
}
