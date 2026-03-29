#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Kyc(Address),
    Sanctioned(Address),
    Accredited(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ComplianceError {
    AdminAlreadySet = 1,
    AdminNotSet = 2,
    WalletNotKyc = 3,
    WalletNotAccredited = 4,
}

#[contract]
pub struct ComplianceContract;

fn load_admin(env: &Env) -> Address {
    match env.storage().persistent().get::<_, Address>(&DataKey::Admin) {
        Some(admin) => admin,
        None => panic_with_error!(env, ComplianceError::AdminNotSet),
    }
}

fn require_admin_auth(env: &Env) {
    let admin = load_admin(env);
    admin.require_auth();
}

#[contractimpl]
impl ComplianceContract {
    pub fn set_admin(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic_with_error!(&env, ComplianceError::AdminAlreadySet);
        }

        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.events().publish(
            (symbol_short!("cmp_v1"), symbol_short!("adm_set"), admin),
            true,
        );
    }

    pub fn rotate_admin(env: Env, new_admin: Address) {
        require_admin_auth(&env);
        new_admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &new_admin);
        env.events().publish(
            (symbol_short!("cmp_v1"), symbol_short!("adm_rot"), new_admin),
            true,
        );
    }

    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Admin)
    }

    pub fn verify_kyc(env: Env, wallet: Address, attestation_hash: BytesN<32>) {
        require_admin_auth(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Kyc(wallet.clone()), &attestation_hash);
        env.events().publish(
            (symbol_short!("cmp_v1"), symbol_short!("kyc_set"), wallet),
            attestation_hash,
        );
    }

    pub fn get_kyc_hash(env: Env, wallet: Address) -> Option<BytesN<32>> {
        env.storage().persistent().get(&DataKey::Kyc(wallet))
    }

    pub fn set_sanctioned(env: Env, wallet: Address, sanctioned: bool) {
        require_admin_auth(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Sanctioned(wallet.clone()), &sanctioned);
        env.events().publish(
            (symbol_short!("cmp_v1"), symbol_short!("sanc_set"), wallet),
            sanctioned,
        );
    }

    pub fn check_sanctions(env: Env, wallet: Address) -> bool {
        env.storage()
            .persistent()
            .get::<_, bool>(&DataKey::Sanctioned(wallet))
            .unwrap_or(false)
    }

    pub fn set_accredited(env: Env, wallet: Address, status: bool) {
        require_admin_auth(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Accredited(wallet.clone()), &status);
        env.events().publish(
            (symbol_short!("cmp_v1"), symbol_short!("accred"), wallet),
            status,
        );
    }

    pub fn check_accredited(env: Env, wallet: Address) -> bool {
        env.storage()
            .persistent()
            .get::<_, bool>(&DataKey::Accredited(wallet))
            .unwrap_or(false)
    }

    pub fn require_kyc(env: Env, wallet: Address) {
        if !env.storage().persistent().has(&DataKey::Kyc(wallet)) {
            panic_with_error!(&env, ComplianceError::WalletNotKyc);
        }
    }

    pub fn require_accredited(env: Env, wallet: Address) {
        let ok = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::Accredited(wallet))
            .unwrap_or(false);
        if !ok {
            panic_with_error!(&env, ComplianceError::WalletNotAccredited);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn verify_kyc_persists_hash_with_admin() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ComplianceContract, ());
        let client = ComplianceContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let wallet = Address::generate(&env);

        client.set_admin(&admin);

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

    #[test]
    #[should_panic]
    fn verify_kyc_requires_admin_setup() {
        let env = Env::default();
        let contract_id = env.register(ComplianceContract, ());
        let client = ComplianceContractClient::new(&env, &contract_id);
        let wallet = Address::generate(&env);
        let hash = BytesN::from_array(&env, &[9u8; 32]);

        client.verify_kyc(&wallet, &hash);
    }

    #[test]
    #[should_panic]
    fn set_admin_is_one_time_initializer() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ComplianceContract, ());
        let client = ComplianceContractClient::new(&env, &contract_id);
        let admin_a = Address::generate(&env);
        let admin_b = Address::generate(&env);

        client.set_admin(&admin_a);
        client.set_admin(&admin_b);
    }

    #[test]
    fn get_admin_returns_initialized_admin() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ComplianceContract, ());
        let client = ComplianceContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);

        client.set_admin(&admin);

        let stored = client.get_admin().unwrap();
        assert_eq!(stored, admin);
    }
}
