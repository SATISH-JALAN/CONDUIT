#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Kyc(Address),
    Sanctioned(Address),
    Accredited(Address),
}

#[contract]
pub struct ComplianceContract;

#[contractimpl]
impl ComplianceContract {
    pub fn verify_kyc(env: Env, wallet: Address, attestation_hash: BytesN<32>) {
        wallet.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Kyc(wallet.clone()), &attestation_hash);
        env.events()
            .publish((symbol_short!("kyc"), wallet), attestation_hash);
    }

    pub fn get_kyc_hash(env: Env, wallet: Address) -> Option<BytesN<32>> {
        env.storage().persistent().get(&DataKey::Kyc(wallet))
    }

    pub fn set_sanctioned(env: Env, wallet: Address, sanctioned: bool) {
        wallet.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Sanctioned(wallet.clone()), &sanctioned);
        let topic: Symbol = if sanctioned {
            symbol_short!("sanc_on")
        } else {
            symbol_short!("sanc_off")
        };
        env.events().publish((topic, wallet), sanctioned);
    }

    pub fn check_sanctions(env: Env, wallet: Address) -> bool {
        env.storage()
            .persistent()
            .get::<_, bool>(&DataKey::Sanctioned(wallet))
            .unwrap_or(false)
    }

    pub fn set_accredited(env: Env, wallet: Address, status: bool) {
        wallet.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Accredited(wallet.clone()), &status);
        env.events()
            .publish((symbol_short!("accred"), wallet), status);
    }

    pub fn require_kyc(env: Env, wallet: Address) {
        if !env.storage().persistent().has(&DataKey::Kyc(wallet)) {
            panic!("wallet is not KYC verified");
        }
    }

    pub fn require_accredited(env: Env, wallet: Address) {
        let ok = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::Accredited(wallet))
            .unwrap_or(false);
        if !ok {
            panic!("wallet is not accredited");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn verify_kyc_persists_hash() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ComplianceContract, ());
        let client = ComplianceContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);

        let hash = BytesN::from_array(&env, &[7u8; 32]);
        client.verify_kyc(&wallet, &hash);

        let loaded = client.get_kyc_hash(&wallet).unwrap();
        assert_eq!(loaded, hash);
    }

    #[test]
    fn sanctions_default_false() {
        let env = Env::default();
        let contract_id = env.register(ComplianceContract, ());
        let client = ComplianceContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);
        let result = client.check_sanctions(&wallet);
        assert!(!result);
    }
}
