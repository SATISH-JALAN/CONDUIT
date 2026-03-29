import * as StellarSdk from "@stellar/stellar-sdk";
import { logger } from "./logger.js";

// ── Config ──

const HORIZON_URL =
  process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const SOROBAN_RPC_URL =
  process.env.SOROBAN_RPC_URL || "http://127.0.0.1:8000/soroban/rpc";
const SOROBAN_RPC_ALLOW_HTTP =
  process.env.SOROBAN_RPC_ALLOW_HTTP === "true" ||
  SOROBAN_RPC_URL.startsWith("http://127.0.0.1") ||
  SOROBAN_RPC_URL.startsWith("http://localhost");
const STREAM_ROUTER_CONTRACT_ID = process.env.STREAM_ROUTER_CONTRACT_ID;
const COMPLIANCE_CONTRACT_ID = process.env.COMPLIANCE_CONTRACT_ID;
const SOROBAN_ENABLED = process.env.SOROBAN_ENABLED === "true";
const SOROBAN_READ_TIMEOUT_MS = parseInt(
  process.env.SOROBAN_READ_TIMEOUT_MS || "1500",
  10,
);
const SOROBAN_SIM_SOURCE = process.env.SOROBAN_SIM_SOURCE;

const server = new StellarSdk.Horizon.Server(HORIZON_URL, { allowHttp: true });
const sorobanRpc = new StellarSdk.rpc.Server(SOROBAN_RPC_URL, {
  allowHttp: SOROBAN_RPC_ALLOW_HTTP,
});

export interface HarvestSplitOperation {
  destination: string;
  amount: number;
  label?: string;
}

export interface SorobanAnchor {
  principal: number;
  apy_bps: number;
  sync_ts: number;
}

export interface SorobanReadResult<T> {
  enabled: boolean;
  ok: boolean;
  method: string;
  contractId: string | null;
  latencyMs: number;
  value: T | null;
  error?: string;
  fallbackReason?: string;
}

// ── Public API ──

/**
 * Build an unsigned deposit transaction.
 * The user signs this client-side with Freighter, then sends back the signed XDR.
 * Uses native XLM on standalone; swap to USDC asset for testnet/mainnet.
 */
export async function buildDepositTx(
  sourceWallet: string,
  amount: number,
  boxId: string,
): Promise<{ xdr: string; networkPassphrase: string }> {
  let sourceAccount;
  try {
    sourceAccount = await server.loadAccount(sourceWallet);
  } catch (err: any) {
    if (err.message === "Not Found" || err?.response?.status === 404) {
      logger.info(
        { sourceWallet },
        "Account not found, attempting auto-funding via Friendbot...",
      );
      const funded = await fundWithFriendbot(sourceWallet);
      if (!funded)
        throw new Error(
          "Account does not exist and friendbot funding failed. Please fund manually.",
        );
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
      }),
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
  boxId: string,
  splits: HarvestSplitOperation[] = [],
): Promise<{ xdr: string; networkPassphrase: string }> {
  // For harvest, the source is the vault paying the user
  // On standalone, we simulate by building a self-payment
  let sourceAccount;
  try {
    sourceAccount = await server.loadAccount(sourceWallet);
  } catch (err: any) {
    if (err.message === "Not Found" || err?.response?.status === 404) {
      logger.info(
        { sourceWallet },
        "Account not found during harvest, attempting auto-funding via Friendbot...",
      );
      const funded = await fundWithFriendbot(sourceWallet);
      if (!funded)
        throw new Error(
          "Account does not exist and friendbot funding failed. Please fund manually.",
        );
      sourceAccount = await server.loadAccount(sourceWallet);
    } else {
      throw err;
    }
  }

  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const ops =
    splits.length > 0 ? splits : [{ destination: sourceWallet, amount }];

  for (const split of ops) {
    txBuilder.addOperation(
      StellarSdk.Operation.payment({
        destination: split.destination,
        asset: StellarSdk.Asset.native(),
        amount: split.amount.toFixed(7),
      }),
    );
  }

  const tx = txBuilder
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
export async function submitSignedTx(
  signedXdr: string,
): Promise<{ txHash: string }> {
  const tx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE,
  );
  const result = await server.submitTransaction(tx);
  logger.info({ hash: result.hash }, "Transaction submitted");
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
      logger.warn(
        { publicKey, status: res.status },
        "Friendbot funding failed",
      );
      return false;
    }
    logger.info({ publicKey }, "Account funded via friendbot");
    return true;
  } catch (err: any) {
    logger.error({ err: err.message }, "Friendbot error");
    return false;
  }
}

function readField(payload: unknown, field: string): unknown {
  if (payload instanceof Map) {
    return payload.get(field);
  }
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    return record[field];
  }
  return undefined;
}

function toFiniteNumber(value: unknown): number | null {
  let n: number;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "bigint") {
    n = Number(value);
  } else if (typeof value === "string") {
    n = Number(value);
  } else {
    return null;
  }

  return Number.isFinite(n) ? n : null;
}

function mapSorobanAnchor(payload: unknown): SorobanAnchor | null {
  const principal = toFiniteNumber(readField(payload, "principal"));
  const apyBps = toFiniteNumber(readField(payload, "apy_bps"));
  const syncTs = toFiniteNumber(readField(payload, "sync_ts"));

  if (principal === null || apyBps === null || syncTs === null) {
    return null;
  }

  return {
    principal,
    apy_bps: apyBps,
    sync_ts: syncTs,
  };
}

function decodeSimulationValue(simulation: unknown): unknown {
  const raw = simulation as {
    result?: { retval?: unknown; results?: Array<{ xdr?: string }> };
    retval?: unknown;
    results?: Array<{ xdr?: string }>;
  };

  const candidate =
    raw?.result?.retval ??
    raw?.retval ??
    raw?.result?.results?.[0]?.xdr ??
    raw?.results?.[0]?.xdr;

  if (!candidate) {
    return null;
  }

  if (typeof candidate === "string") {
    const scVal = StellarSdk.xdr.ScVal.fromXDR(candidate, "base64");
    return StellarSdk.scValToNative(scVal);
  }

  return StellarSdk.scValToNative(candidate as StellarSdk.xdr.ScVal);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Soroban read timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function simulateContractRead(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[] = [],
): Promise<SorobanReadResult<unknown>> {
  const started = Date.now();

  if (!SOROBAN_ENABLED) {
    return {
      enabled: false,
      ok: false,
      method,
      contractId,
      latencyMs: 0,
      value: null,
      fallbackReason: "soroban_disabled",
    };
  }

  try {
    const sourceAddress =
      SOROBAN_SIM_SOURCE || StellarSdk.Keypair.random().publicKey();
    const source = new StellarSdk.Account(sourceAddress, "0");

    const tx = new StellarSdk.TransactionBuilder(source, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(new StellarSdk.Contract(contractId).call(method, ...args))
      .setTimeout(30)
      .build();

    const simulation = await withTimeout(
      sorobanRpc.simulateTransaction(tx),
      SOROBAN_READ_TIMEOUT_MS,
    );
    const value = decodeSimulationValue(simulation);

    return {
      enabled: true,
      ok: true,
      method,
      contractId,
      latencyMs: Date.now() - started,
      value,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.warn({ err: message, method, contractId }, "Soroban read failed");
    return {
      enabled: true,
      ok: false,
      method,
      contractId,
      latencyMs: Date.now() - started,
      value: null,
      error: message,
      fallbackReason: "rpc_error",
    };
  }
}

export function isSorobanReadEnabled(): boolean {
  return SOROBAN_ENABLED;
}

export async function readOnChainAccrued(
  wallet: string,
): Promise<SorobanReadResult<number>> {
  if (!STREAM_ROUTER_CONTRACT_ID) {
    return {
      enabled: SOROBAN_ENABLED,
      ok: false,
      method: "get_accrued",
      contractId: null,
      latencyMs: 0,
      value: null,
      fallbackReason: "missing_stream_router_contract_id",
    };
  }

  let walletArg: StellarSdk.xdr.ScVal;
  try {
    walletArg = StellarSdk.Address.fromString(wallet).toScVal();
  } catch {
    return {
      enabled: SOROBAN_ENABLED,
      ok: false,
      method: "get_accrued",
      contractId: STREAM_ROUTER_CONTRACT_ID,
      latencyMs: 0,
      value: null,
      fallbackReason: "invalid_wallet_address",
    };
  }

  const response = await simulateContractRead(
    STREAM_ROUTER_CONTRACT_ID,
    "get_accrued",
    [walletArg],
  );

  const mapped = toFiniteNumber(response.value);
  if (response.ok && mapped === null) {
    return {
      ...response,
      ok: false,
      value: null,
      fallbackReason: "invalid_read_shape",
    };
  }

  return {
    ...response,
    value: mapped,
  };
}

export async function readOnChainAnchor(
  wallet: string,
): Promise<SorobanReadResult<SorobanAnchor>> {
  if (!STREAM_ROUTER_CONTRACT_ID) {
    return {
      enabled: SOROBAN_ENABLED,
      ok: false,
      method: "get_anchor",
      contractId: null,
      latencyMs: 0,
      value: null,
      fallbackReason: "missing_stream_router_contract_id",
    };
  }

  let walletArg: StellarSdk.xdr.ScVal;
  try {
    walletArg = StellarSdk.Address.fromString(wallet).toScVal();
  } catch {
    return {
      enabled: SOROBAN_ENABLED,
      ok: false,
      method: "get_anchor",
      contractId: STREAM_ROUTER_CONTRACT_ID,
      latencyMs: 0,
      value: null,
      fallbackReason: "invalid_wallet_address",
    };
  }

  const response = await simulateContractRead(
    STREAM_ROUTER_CONTRACT_ID,
    "get_anchor",
    [walletArg],
  );

  if (!response.ok || response.value === null) {
    return {
      ...response,
      value: null,
    };
  }

  const mapped = mapSorobanAnchor(response.value);
  if (!mapped) {
    return {
      ...response,
      ok: false,
      value: null,
      fallbackReason: "invalid_read_shape",
    };
  }

  return {
    ...response,
    value: mapped,
  };
}

export async function readWalletSanctionStatus(
  wallet: string,
): Promise<SorobanReadResult<boolean>> {
  if (!COMPLIANCE_CONTRACT_ID) {
    return {
      enabled: SOROBAN_ENABLED,
      ok: false,
      method: "check_sanctions",
      contractId: null,
      latencyMs: 0,
      value: null,
      fallbackReason: "missing_compliance_contract_id",
    };
  }

  let walletArg: StellarSdk.xdr.ScVal;
  try {
    walletArg = StellarSdk.Address.fromString(wallet).toScVal();
  } catch {
    return {
      enabled: SOROBAN_ENABLED,
      ok: false,
      method: "check_sanctions",
      contractId: COMPLIANCE_CONTRACT_ID,
      latencyMs: 0,
      value: null,
      fallbackReason: "invalid_wallet_address",
    };
  }

  const response = await simulateContractRead(
    COMPLIANCE_CONTRACT_ID,
    "check_sanctions",
    [walletArg],
  );

  const isBool = typeof response.value === "boolean";
  const ok = response.ok && isBool;

  return {
    ...response,
    value: isBool ? (response.value as boolean) : null,
    ok,
    fallbackReason: ok
      ? response.fallbackReason
      : response.ok
        ? "invalid_read_shape"
        : response.fallbackReason,
  };
}

export async function readWalletAccreditationStatus(
  wallet: string,
): Promise<SorobanReadResult<boolean>> {
  if (!COMPLIANCE_CONTRACT_ID) {
    return {
      enabled: SOROBAN_ENABLED,
      ok: false,
      method: "check_accredited",
      contractId: null,
      latencyMs: 0,
      value: null,
      fallbackReason: "missing_compliance_contract_id",
    };
  }

  let walletArg: StellarSdk.xdr.ScVal;
  try {
    walletArg = StellarSdk.Address.fromString(wallet).toScVal();
  } catch {
    return {
      enabled: SOROBAN_ENABLED,
      ok: false,
      method: "check_accredited",
      contractId: COMPLIANCE_CONTRACT_ID,
      latencyMs: 0,
      value: null,
      fallbackReason: "invalid_wallet_address",
    };
  }

  const response = await simulateContractRead(
    COMPLIANCE_CONTRACT_ID,
    "check_accredited",
    [walletArg],
  );

  const isBool = typeof response.value === "boolean";
  const ok = response.ok && isBool;

  return {
    ...response,
    value: isBool ? (response.value as boolean) : null,
    ok,
    fallbackReason: ok
      ? response.fallbackReason
      : response.ok
        ? "invalid_read_shape"
        : response.fallbackReason,
  };
}

export { NETWORK_PASSPHRASE, server as horizonServer };
