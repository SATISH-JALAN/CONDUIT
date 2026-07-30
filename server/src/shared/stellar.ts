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
const RATE_ORACLE_CONTRACT_ID = process.env.RATE_ORACLE_CONTRACT_ID;
const YIELD_NFT_CONTRACT_ID = process.env.YIELD_NFT_CONTRACT_ID;
const COND_EXECUTOR_CONTRACT_ID = process.env.COND_EXECUTOR_CONTRACT_ID;
const COMPLIANCE_CONTRACT_ID = process.env.COMPLIANCE_CONTRACT_ID;
// Secret key of the oracle admin / operator. Only the keeper (server-side) uses
// it to sign authorized rate writes — never exposed to clients.
const STELLAR_OPERATIONAL_SECRET = process.env.STELLAR_OPERATIONAL_SECRET;
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

// Real on-chain invocation of stream_router is enabled only when Soroban is on
// AND a deployed contract id is configured. Otherwise we fall back to the legacy
// native-payment path so local dev without a deployed contract still works.
const STREAM_ROUTER_INVOKE_ENABLED =
  SOROBAN_ENABLED && !!STREAM_ROUTER_CONTRACT_ID;
// Decimals of the custodied yield asset (SAC). Amounts scale to i128 base units.
const YIELD_ASSET_DECIMALS = parseInt(
  process.env.YIELD_ASSET_DECIMALS || "7",
  10,
);
// Inclusion fee (stroops) for Soroban txs; prepareTransaction adds resource fee.
const SOROBAN_INCLUSION_FEE = process.env.SOROBAN_INCLUSION_FEE || "1000000";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export function isStreamRouterInvokeEnabled(): boolean {
  return STREAM_ROUTER_INVOKE_ENABLED;
}

/** Scale a human amount (e.g. dollars) to the yield asset's i128 base units. */
function toI128ScVal(amount: number): StellarSdk.xdr.ScVal {
  const base = BigInt(Math.round(amount * 10 ** YIELD_ASSET_DECIMALS));
  return StellarSdk.nativeToScVal(base, { type: "i128" });
}

/** Load the source account, auto-funding via friendbot on first use. */
async function loadOrFundSource(
  sourceWallet: string,
): Promise<StellarSdk.Account> {
  try {
    return await sorobanRpc.getAccount(sourceWallet);
  } catch {
    logger.info(
      { sourceWallet },
      "Source account not found, funding via friendbot...",
    );
    const funded = await fundWithFriendbot(sourceWallet);
    if (!funded) {
      throw new Error(
        "Account does not exist and friendbot funding failed. Please fund manually.",
      );
    }
    return await sorobanRpc.getAccount(sourceWallet);
  }
}

/**
 * Build an unsigned stream_router contract invocation, prepared (footprint +
 * auth + resource fees) via RPC simulation. The user's wallet is the tx source,
 * so require_auth() and the SAC token transfer auth are covered by the envelope
 * signature — no separate authorization entries are needed.
 */
async function buildStreamRouterInvokeTx(
  sourceWallet: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
): Promise<{ xdr: string; networkPassphrase: string }> {
  if (!STREAM_ROUTER_CONTRACT_ID) {
    throw new Error("STREAM_ROUTER_CONTRACT_ID is not configured");
  }

  const source = await loadOrFundSource(sourceWallet);
  const contract = new StellarSdk.Contract(STREAM_ROUTER_CONTRACT_ID);

  const tx = new StellarSdk.TransactionBuilder(source, {
    fee: SOROBAN_INCLUSION_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(120)
    .build();

  const prepared = await sorobanRpc.prepareTransaction(tx);
  return { xdr: prepared.toXDR(), networkPassphrase: NETWORK_PASSPHRASE };
}

export function isYieldNftEnabled(): boolean {
  return !!(SOROBAN_ENABLED && YIELD_NFT_CONTRACT_ID);
}

/** Build an unsigned yield_nft contract invocation (prepared via RPC). */
async function buildYieldNftInvokeTx(
  sourceWallet: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
): Promise<{ xdr: string; networkPassphrase: string }> {
  if (!YIELD_NFT_CONTRACT_ID) {
    throw new Error("YIELD_NFT_CONTRACT_ID is not configured");
  }
  const source = await loadOrFundSource(sourceWallet);
  const contract = new StellarSdk.Contract(YIELD_NFT_CONTRACT_ID);
  const tx = new StellarSdk.TransactionBuilder(source, {
    fee: SOROBAN_INCLUSION_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(120)
    .build();
  const prepared = await sorobanRpc.prepareTransaction(tx);
  return { xdr: prepared.toXDR(), networkPassphrase: NETWORK_PASSPHRASE };
}

/**
 * Build an unsigned mint transaction for a yield NFT. Locks `principal` of the
 * yield asset; the term's APY is read on-chain from the oracle for `boxId`.
 */
export async function buildMintNftTx(
  sourceWallet: string,
  principal: number,
  boxId: string,
  termSeconds: number,
): Promise<{ xdr: string; networkPassphrase: string }> {
  const args = [
    StellarSdk.Address.fromString(sourceWallet).toScVal(),
    toI128ScVal(principal),
    StellarSdk.nativeToScVal(boxId, { type: "string" }),
    StellarSdk.nativeToScVal(termSeconds, { type: "u64" }),
  ];
  return buildYieldNftInvokeTx(sourceWallet, "mint", args);
}

/** Build an unsigned transfer of yield NFT `id` from the owner to `to`. */
export async function buildTransferNftTx(
  sourceWallet: string,
  id: number,
  to: string,
): Promise<{ xdr: string; networkPassphrase: string }> {
  const args = [
    StellarSdk.nativeToScVal(id, { type: "u64" }),
    StellarSdk.Address.fromString(to).toScVal(),
  ];
  return buildYieldNftInvokeTx(sourceWallet, "transfer", args);
}

/** Build an unsigned redeem of a matured yield NFT `id`. */
export async function buildRedeemNftTx(
  sourceWallet: string,
  id: number,
): Promise<{ xdr: string; networkPassphrase: string }> {
  const args = [StellarSdk.nativeToScVal(id, { type: "u64" })];
  return buildYieldNftInvokeTx(sourceWallet, "redeem", args);
}

/**
 * Build an unsigned set_split transaction. The user signs it to configure how
 * harvested yield is routed on-chain. Percentages must sum to 100; the last
 * destination absorbs any rounding so weights sum to exactly 10000 bps.
 */
export async function buildSetSplitTx(
  sourceWallet: string,
  splits: Array<{ destination: string; percentage: number }>,
): Promise<{ xdr: string; networkPassphrase: string }> {
  if (!STREAM_ROUTER_INVOKE_ENABLED) {
    throw new Error(
      "On-chain splits require SOROBAN_ENABLED and a deployed stream_router",
    );
  }
  if (splits.length === 0) {
    throw new Error("At least one split destination is required");
  }
  const total = splits.reduce((s, x) => s + x.percentage, 0);
  if (Math.round(total) !== 100) {
    throw new Error("Split percentages must sum to 100");
  }

  let assigned = 0;
  const entries = splits.map((s, i) => {
    const bps =
      i === splits.length - 1
        ? 10_000 - assigned
        : Math.round(s.percentage * 100);
    assigned += bps;
    // Soroban struct = ScMap with keys sorted ascending ("bps" < "dest").
    return StellarSdk.xdr.ScVal.scvMap([
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.nativeToScVal("bps", { type: "symbol" }),
        val: StellarSdk.nativeToScVal(bps, { type: "u32" }),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.nativeToScVal("dest", { type: "symbol" }),
        val: StellarSdk.Address.fromString(s.destination).toScVal(),
      }),
    ]);
  });

  const args = [
    StellarSdk.Address.fromString(sourceWallet).toScVal(),
    StellarSdk.xdr.ScVal.scvVec(entries),
  ];
  return buildStreamRouterInvokeTx(sourceWallet, "set_split", args);
}

/**
 * Build an unsigned deposit transaction.
 * The user signs this client-side with Freighter, then sends back the signed XDR.
 *
 * When a stream_router contract is deployed (SOROBAN_ENABLED + contract id) this
 * invokes `deposit(wallet, amount, box_id)` so tokens actually move into the
 * vault. The APY is read on-chain from the rate oracle keyed by box_id — the
 * caller cannot choose it. Otherwise it falls back to a native payment for dev.
 */
export async function buildDepositTx(
  sourceWallet: string,
  amount: number,
  boxId: string,
): Promise<{ xdr: string; networkPassphrase: string }> {
  // Real path: invoke stream_router.deposit so tokens move into the vault.
  if (STREAM_ROUTER_INVOKE_ENABLED) {
    const args = [
      StellarSdk.Address.fromString(sourceWallet).toScVal(),
      toI128ScVal(amount),
      StellarSdk.nativeToScVal(boxId, { type: "string" }),
    ];
    return buildStreamRouterInvokeTx(sourceWallet, "deposit", args);
  }

  // Legacy fallback (local dev without a deployed contract): native payment.
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
  // Real path: invoke stream_router.harvest(wallet). The contract computes the
  // accrued yield on-chain and pays it from the vault reserve to the user.
  // (Multi-destination on-chain splitting arrives in a later phase; for now the
  // contract pays the full accrued amount to the user.)
  if (STREAM_ROUTER_INVOKE_ENABLED) {
    const args = [StellarSdk.Address.fromString(sourceWallet).toScVal()];
    return buildStreamRouterInvokeTx(sourceWallet, "harvest", args);
  }

  // Legacy fallback: vault-to-user (and split) native payments.
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

  // Soroban contract invocations must be submitted (and polled) via the RPC
  // server, not Horizon. Detect them and route accordingly.
  const isSoroban =
    "operations" in tx &&
    tx.operations.some((op) => op.type === "invokeHostFunction");

  if (isSoroban) {
    return submitSorobanTx(tx as StellarSdk.Transaction);
  }

  const result = await server.submitTransaction(tx);
  logger.info({ hash: result.hash }, "Transaction submitted");
  return { txHash: result.hash };
}

/**
 * Submit a signed Soroban transaction via RPC and poll until it is applied.
 */
async function submitSorobanTx(
  tx: StellarSdk.Transaction,
): Promise<{ txHash: string }> {
  const send = await sorobanRpc.sendTransaction(tx);

  if (send.status === "ERROR") {
    logger.error({ send }, "Soroban sendTransaction returned ERROR");
    throw new Error(
      "Contract transaction rejected: " +
        JSON.stringify(send.errorResult ?? send.status),
    );
  }

  const hash = send.hash;
  let result = await sorobanRpc.getTransaction(hash);
  let attempts = 0;
  while (String(result.status) === "NOT_FOUND" && attempts < 30) {
    await sleep(1000);
    result = await sorobanRpc.getTransaction(hash);
    attempts += 1;
  }

  if (String(result.status) !== "SUCCESS") {
    logger.error({ hash, status: result.status }, "Soroban tx did not succeed");
    throw new Error(
      "Contract transaction failed on-chain: " + String(result.status),
    );
  }

  logger.info({ hash }, "Soroban transaction applied");
  return { txHash: hash };
}

/**
 * True when the server can publish oracle rates (Soroban on, oracle deployed,
 * operator secret configured).
 */
export function isRateKeeperEnabled(): boolean {
  return !!(
    SOROBAN_ENABLED &&
    RATE_ORACLE_CONTRACT_ID &&
    STELLAR_OPERATIONAL_SECRET
  );
}

/**
 * Publish an authorized APY for a box to the rate oracle. Signed server-side
 * with the operator (oracle admin) key — this is the only place the server
 * signs a transaction. Used by the rate keeper.
 */
export async function setOracleRate(
  boxId: string,
  apyBps: number,
): Promise<{ txHash: string }> {
  if (!RATE_ORACLE_CONTRACT_ID) {
    throw new Error("RATE_ORACLE_CONTRACT_ID is not configured");
  }
  if (!STELLAR_OPERATIONAL_SECRET) {
    throw new Error("STELLAR_OPERATIONAL_SECRET is not configured");
  }

  const operator = StellarSdk.Keypair.fromSecret(STELLAR_OPERATIONAL_SECRET);
  const source = await sorobanRpc.getAccount(operator.publicKey());
  const contract = new StellarSdk.Contract(RATE_ORACLE_CONTRACT_ID);

  const tx = new StellarSdk.TransactionBuilder(source, {
    fee: SOROBAN_INCLUSION_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "set_rate",
        StellarSdk.nativeToScVal(boxId, { type: "string" }),
        StellarSdk.nativeToScVal(apyBps, { type: "u32" }),
      ),
    )
    .setTimeout(120)
    .build();

  const prepared = await sorobanRpc.prepareTransaction(tx);
  prepared.sign(operator);
  return submitSorobanTx(prepared);
}

export function isCondExecutorEnabled(): boolean {
  return !!(SOROBAN_ENABLED && COND_EXECUTOR_CONTRACT_ID);
}

/** Build an unsigned cond_executor invocation (prepared via RPC). */
async function buildCondInvokeTx(
  sourceWallet: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
): Promise<{ xdr: string; networkPassphrase: string }> {
  if (!COND_EXECUTOR_CONTRACT_ID) {
    throw new Error("COND_EXECUTOR_CONTRACT_ID is not configured");
  }
  const source = await loadOrFundSource(sourceWallet);
  const contract = new StellarSdk.Contract(COND_EXECUTOR_CONTRACT_ID);
  const tx = new StellarSdk.TransactionBuilder(source, {
    fee: SOROBAN_INCLUSION_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(120)
    .build();
  const prepared = await sorobanRpc.prepareTransaction(tx);
  return { xdr: prepared.toXDR(), networkPassphrase: NETWORK_PASSPHRASE };
}

/** Build an unsigned set_mandate tx (user sets their on-chain APY bounds). */
export async function buildSetMandateTx(
  sourceWallet: string,
  minApyBps: number,
  maxApyBps: number,
): Promise<{ xdr: string; networkPassphrase: string }> {
  const args = [
    StellarSdk.Address.fromString(sourceWallet).toScVal(),
    StellarSdk.nativeToScVal(minApyBps, { type: "u32" }),
    StellarSdk.nativeToScVal(maxApyBps, { type: "u32" }),
  ];
  return buildCondInvokeTx(sourceWallet, "set_mandate", args);
}

/** Build an unsigned set_kill_switch tx (user pauses/resumes agent activity). */
export async function buildKillSwitchTx(
  sourceWallet: string,
  engaged: boolean,
): Promise<{ xdr: string; networkPassphrase: string }> {
  const args = [
    StellarSdk.Address.fromString(sourceWallet).toScVal(),
    StellarSdk.nativeToScVal(engaged), // boolean → scvBool
  ];
  return buildCondInvokeTx(sourceWallet, "set_kill_switch", args);
}

/**
 * Operator-signed: execute a bounded agent action for a wallet. Reverts on-chain
 * if the box's oracle rate is outside the wallet's mandate or the kill switch is
 * engaged. Emits a chain-of-thought event and reprices via the stream router.
 */
export async function executeCondAction(
  wallet: string,
  boxId: string,
  reason: string,
  confidence: number,
): Promise<{ txHash: string }> {
  if (!COND_EXECUTOR_CONTRACT_ID) {
    throw new Error("COND_EXECUTOR_CONTRACT_ID is not configured");
  }
  if (!STELLAR_OPERATIONAL_SECRET) {
    throw new Error("STELLAR_OPERATIONAL_SECRET is not configured");
  }

  const operator = StellarSdk.Keypair.fromSecret(STELLAR_OPERATIONAL_SECRET);
  const source = await sorobanRpc.getAccount(operator.publicKey());
  const contract = new StellarSdk.Contract(COND_EXECUTOR_CONTRACT_ID);

  const tx = new StellarSdk.TransactionBuilder(source, {
    fee: SOROBAN_INCLUSION_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "execute_action",
        StellarSdk.Address.fromString(wallet).toScVal(),
        StellarSdk.nativeToScVal(boxId, { type: "string" }),
        StellarSdk.nativeToScVal(reason, { type: "string" }),
        StellarSdk.nativeToScVal(confidence, { type: "u32" }),
      ),
    )
    .setTimeout(120)
    .build();

  const prepared = await sorobanRpc.prepareTransaction(tx);
  prepared.sign(operator);
  return submitSorobanTx(prepared);
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
    // On-chain principal is stored in i128 base units; the rest of the server
    // works in human (dollar) units, so normalize at the read boundary.
    principal: principal / 10 ** YIELD_ASSET_DECIMALS,
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

  const raw = toFiniteNumber(response.value);
  if (response.ok && raw === null) {
    return {
      ...response,
      ok: false,
      value: null,
      fallbackReason: "invalid_read_shape",
    };
  }

  // Normalize i128 base units → human (dollar) units for the rest of the server.
  const mapped = raw === null ? null : raw / 10 ** YIELD_ASSET_DECIMALS;

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
