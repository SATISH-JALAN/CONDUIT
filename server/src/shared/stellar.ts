import * as StellarSdk from '@stellar/stellar-sdk';
import { logger } from './logger.js';

// ── Config ──

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

const server = new StellarSdk.Horizon.Server(HORIZON_URL, { allowHttp: true });

// ── Public API ──

/**
 * Build an unsigned deposit transaction.
 * The user signs this client-side with Freighter, then sends back the signed XDR.
 * Uses native XLM on standalone; swap to USDC asset for testnet/mainnet.
 */
export async function buildDepositTx(
  sourceWallet: string,
  amount: number,
  boxId: string
): Promise<{ xdr: string; networkPassphrase: string }> {
  let sourceAccount;
  try {
    sourceAccount = await server.loadAccount(sourceWallet);
  } catch (err: any) {
    if (err.message === 'Not Found' || err?.response?.status === 404) {
      logger.info({ sourceWallet }, 'Account not found, attempting auto-funding via Friendbot...');
      const funded = await fundWithFriendbot(sourceWallet);
      if (!funded) throw new Error('Account does not exist and friendbot funding failed. Please fund manually.');
      sourceAccount = await server.loadAccount(sourceWallet);
    } else {
      throw err;
    }
  }

  // Destination = operational account (the protocol vault)
  // In production this would be the bond_box contract address
  const vaultAddress = process.env.STELLAR_VAULT_ADDRESS || sourceWallet;

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: vaultAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount.toFixed(7),
      })
    )
    .addMemo(StellarSdk.Memo.text(`deposit:${boxId}`.slice(0, 28)))
    .setTimeout(120)
    .build();

  return {
    xdr: tx.toXDR(),
    networkPassphrase: NETWORK_PASSPHRASE,
  };
}

/**
 * Build an unsigned harvest transaction.
 * Sends accrued yield from the vault back to the user's wallet.
 */
export async function buildHarvestTx(
  sourceWallet: string,
  amount: number,
  boxId: string
): Promise<{ xdr: string; networkPassphrase: string }> {
  // For harvest, the source is the vault paying the user
  // On standalone, we simulate by building a self-payment
  let sourceAccount;
  try {
    sourceAccount = await server.loadAccount(sourceWallet);
  } catch (err: any) {
    if (err.message === 'Not Found' || err?.response?.status === 404) {
      logger.info({ sourceWallet }, 'Account not found during harvest, attempting auto-funding via Friendbot...');
      const funded = await fundWithFriendbot(sourceWallet);
      if (!funded) throw new Error('Account does not exist and friendbot funding failed. Please fund manually.');
      sourceAccount = await server.loadAccount(sourceWallet);
    } else {
      throw err;
    }
  }

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: sourceWallet,
        asset: StellarSdk.Asset.native(),
        amount: amount.toFixed(7),
      })
    )
    .addMemo(StellarSdk.Memo.text(`harvest:${boxId}`.slice(0, 28)))
    .setTimeout(120)
    .build();

  return {
    xdr: tx.toXDR(),
    networkPassphrase: NETWORK_PASSPHRASE,
  };
}

/**
 * Submit a signed XDR to the Stellar network.
 */
export async function submitSignedTx(signedXdr: string): Promise<{ txHash: string }> {
  const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.submitTransaction(tx);
  logger.info({ hash: result.hash }, 'Transaction submitted');
  return { txHash: result.hash };
}

/**
 * Fund an account with friendbot on standalone network (dev only).
 */
export async function fundWithFriendbot(publicKey: string): Promise<boolean> {
  try {
    const url = `https://friendbot.stellar.org/?addr=${publicKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn({ publicKey, status: res.status }, 'Friendbot funding failed');
      return false;
    }
    logger.info({ publicKey }, 'Account funded via friendbot');
    return true;
  } catch (err: any) {
    logger.error({ err: err.message }, 'Friendbot error');
    return false;
  }
}

export { NETWORK_PASSPHRASE, server as horizonServer };
