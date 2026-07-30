import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../shared/db.js";
import { authMiddleware } from "../shared/auth.js";
import {
  nftMintSchema,
  nftRedeemSchema,
  nftTransferSchema,
  stellarAddressSchema,
} from "../shared/types.js";
import { bondBoxes, users, yieldNfts } from "../db/schema.js";
import { logger } from "../shared/logger.js";
import {
  readWalletAccreditationStatus,
  isYieldNftEnabled,
  buildMintNftTx,
  buildTransferNftTx,
  buildRedeemNftTx,
  submitSignedTx,
} from "../shared/stellar.js";

const app = new Hono();

const NFT_ENFORCE_ACCREDITATION =
  process.env.NFT_ENFORCE_ACCREDITATION !== "false";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

async function ensureAccredited(wallet: string) {
  const verification = await readWalletAccreditationStatus(wallet);

  if (!NFT_ENFORCE_ACCREDITATION) {
    return { ok: true as const, verification };
  }

  // Local/dev fallback: if on-chain accreditation checks are unavailable,
  // keep QA flows unblocked while production remains strict.
  if (!verification.enabled && !IS_PRODUCTION) {
    return { ok: true as const, verification };
  }

  if (
    !verification.enabled ||
    !verification.ok ||
    verification.value !== true
  ) {
    return { ok: false as const, verification };
  }

  return { ok: true as const, verification };
}

function mapNft(row: typeof yieldNfts.$inferSelect) {
  return {
    id: row.id,
    ownerWallet: row.ownerWallet,
    boxId: row.boxId,
    notional: toNumber(row.notional),
    yieldBps: row.yieldBps,
    durationDays: row.durationDays,
    status: row.status,
    txHash: row.txHash,
    mintedAt: row.mintedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

app.get("/market", async (c) => {
  try {
    const limitRaw = c.req.query("limit");
    const limit = Math.max(
      1,
      Math.min(100, Number.parseInt(limitRaw || "20", 10) || 20),
    );

    const rows = await db
      .select()
      .from(yieldNfts)
      .where(eq(yieldNfts.status, "active"))
      .orderBy(desc(yieldNfts.mintedAt))
      .limit(limit);

    return c.json({
      items: rows.map(mapNft),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "NFT market fetch failed");
    return c.json({ error: err.message || "Failed to load NFT market" }, 500);
  }
});

app.use("*", authMiddleware);

app.get("/accreditation", async (c) => {
  const wallet = c.get("wallet");

  try {
    const verification = await readWalletAccreditationStatus(wallet);
    const eligible =
      !NFT_ENFORCE_ACCREDITATION ||
      (!verification.enabled && !IS_PRODUCTION) ||
      (verification.enabled && verification.ok && verification.value === true);

    return c.json({
      ok: true,
      enforceAccreditation: NFT_ENFORCE_ACCREDITATION,
      eligible,
      verification,
    });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "NFT accreditation read failed");
    return c.json(
      { error: err.message || "Failed to read accreditation status" },
      500,
    );
  }
});

app.get("/", async (c) => {
  const wallet = c.get("wallet");

  try {
    const status = c.req.query("status");

    const rows = status
      ? await db
          .select()
          .from(yieldNfts)
          .where(
            and(
              eq(yieldNfts.ownerWallet, wallet),
              eq(yieldNfts.status, status),
            ),
          )
          .orderBy(desc(yieldNfts.mintedAt))
      : await db
          .select()
          .from(yieldNfts)
          .where(eq(yieldNfts.ownerWallet, wallet))
          .orderBy(desc(yieldNfts.mintedAt));

    return c.json({
      wallet,
      items: rows.map(mapNft),
    });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Wallet NFTs fetch failed");
    return c.json({ error: err.message || "Failed to load wallet NFTs" }, 500);
  }
});

app.post("/mint", zValidator("json", nftMintSchema), async (c) => {
  const wallet = c.get("wallet");
  const { box_id, notional, duration_days } = c.req.valid("json");

  try {
    await db.insert(users).values({ wallet }).onConflictDoNothing();

    const [box] = await db
      .select({
        id: bondBoxes.id,
        apyBps: bondBoxes.apyBps,
        active: bondBoxes.active,
      })
      .from(bondBoxes)
      .where(eq(bondBoxes.id, box_id))
      .limit(1);

    if (!box || !box.active) {
      return c.json({ error: "Bond box not found or inactive" }, 404);
    }

    const accreditation = await ensureAccredited(wallet);
    if (!accreditation.ok) {
      return c.json(
        {
          error: "Accredited investor verification failed",
          verification: {
            enabled: accreditation.verification.enabled,
            ok: accreditation.verification.ok,
            value: accreditation.verification.value,
            fallbackReason:
              accreditation.verification.fallbackReason ||
              accreditation.verification.error,
          },
        },
        403,
      );
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + duration_days * 24 * 60 * 60 * 1000,
    );

    const [created] = await db
      .insert(yieldNfts)
      .values({
        ownerWallet: wallet,
        boxId: box.id,
        notional: notional.toFixed(7),
        yieldBps: box.apyBps,
        durationDays: duration_days,
        status: "active",
        mintedAt: now,
        expiresAt,
      })
      .returning();

    return c.json({ ok: true, item: mapNft(created) });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "NFT mint failed");
    return c.json({ error: err.message || "Failed to mint NFT" }, 500);
  }
});

app.post("/redeem", zValidator("json", nftRedeemSchema), async (c) => {
  const wallet = c.get("wallet");
  const { nft_id } = c.req.valid("json");

  try {
    const [owned] = await db
      .select()
      .from(yieldNfts)
      .where(and(eq(yieldNfts.id, nft_id), eq(yieldNfts.ownerWallet, wallet)))
      .limit(1);

    if (!owned) {
      return c.json({ error: "NFT not found" }, 404);
    }

    if (owned.status !== "active") {
      return c.json({ error: "Only active NFTs can be redeemed" }, 400);
    }

    const [updated] = await db
      .update(yieldNfts)
      .set({ status: "redeemed" })
      .where(eq(yieldNfts.id, nft_id))
      .returning();

    return c.json({ ok: true, item: mapNft(updated) });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "NFT redeem failed");
    return c.json({ error: err.message || "Failed to redeem NFT" }, 500);
  }
});

app.post("/transfer", zValidator("json", nftTransferSchema), async (c) => {
  const wallet = c.get("wallet");
  const { nft_id, to_wallet } = c.req.valid("json");

  try {
    if (!stellarAddressSchema.safeParse(to_wallet).success) {
      return c.json({ error: "Invalid destination wallet" }, 400);
    }

    if (to_wallet === wallet) {
      return c.json({ error: "Destination wallet must be different" }, 400);
    }

    const [owned] = await db
      .select()
      .from(yieldNfts)
      .where(and(eq(yieldNfts.id, nft_id), eq(yieldNfts.ownerWallet, wallet)))
      .limit(1);

    if (!owned) {
      return c.json({ error: "NFT not found" }, 404);
    }

    if (owned.status !== "active") {
      return c.json({ error: "Only active NFTs can be transferred" }, 400);
    }

    const recipientAccreditation = await ensureAccredited(to_wallet);
    if (!recipientAccreditation.ok) {
      return c.json(
        {
          error: "Recipient is not accredited",
          verification: {
            enabled: recipientAccreditation.verification.enabled,
            ok: recipientAccreditation.verification.ok,
            value: recipientAccreditation.verification.value,
            fallbackReason:
              recipientAccreditation.verification.fallbackReason ||
              recipientAccreditation.verification.error,
          },
        },
        403,
      );
    }

    await db.insert(users).values({ wallet: to_wallet }).onConflictDoNothing();

    const [updated] = await db
      .update(yieldNfts)
      .set({ ownerWallet: to_wallet })
      .where(eq(yieldNfts.id, nft_id))
      .returning();

    return c.json({ ok: true, item: mapNft(updated) });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "NFT transfer failed");
    return c.json({ error: err.message || "Failed to transfer NFT" }, 500);
  }
});

// ── On-chain yield NFTs (build unsigned txs for the user to sign) ────────────

// POST /api/nfts/mint/build — lock principal and mint a yield NFT on-chain.
app.post("/mint/build", authMiddleware, async (c) => {
  try {
    if (!isYieldNftEnabled()) {
      return c.json({ error: "On-chain yield NFTs are not enabled" }, 400);
    }
    const wallet = c.get("wallet");
    const { box_id, principal, term_seconds } = await c.req.json();
    if (!box_id || !principal || !term_seconds) {
      return c.json(
        { error: "Missing required fields: box_id, principal, term_seconds" },
        400,
      );
    }
    const { xdr, networkPassphrase } = await buildMintNftTx(
      wallet,
      Number(principal),
      box_id,
      Number(term_seconds),
    );
    return c.json({ xdr, networkPassphrase });
  } catch (err: any) {
    logger.error({ err: err.message }, "NFT mint build failed");
    return c.json({ error: err.message || "Failed to build mint" }, 500);
  }
});

// POST /api/nfts/transfer/build — transfer a yield NFT on-chain.
app.post("/transfer/build", authMiddleware, async (c) => {
  try {
    if (!isYieldNftEnabled()) {
      return c.json({ error: "On-chain yield NFTs are not enabled" }, 400);
    }
    const wallet = c.get("wallet");
    const { id, to } = await c.req.json();
    if (id === undefined || !to) {
      return c.json({ error: "Missing required fields: id, to" }, 400);
    }
    const { xdr, networkPassphrase } = await buildTransferNftTx(
      wallet,
      Number(id),
      to,
    );
    return c.json({ xdr, networkPassphrase });
  } catch (err: any) {
    logger.error({ err: err.message }, "NFT transfer build failed");
    return c.json({ error: err.message || "Failed to build transfer" }, 500);
  }
});

// POST /api/nfts/redeem/build — redeem a matured yield NFT on-chain.
app.post("/redeem/build", authMiddleware, async (c) => {
  try {
    if (!isYieldNftEnabled()) {
      return c.json({ error: "On-chain yield NFTs are not enabled" }, 400);
    }
    const wallet = c.get("wallet");
    const { id } = await c.req.json();
    if (id === undefined) {
      return c.json({ error: "Missing required field: id" }, 400);
    }
    const { xdr, networkPassphrase } = await buildRedeemNftTx(
      wallet,
      Number(id),
    );
    return c.json({ xdr, networkPassphrase });
  } catch (err: any) {
    logger.error({ err: err.message }, "NFT redeem build failed");
    return c.json({ error: err.message || "Failed to build redeem" }, 500);
  }
});

// POST /api/nfts/submit — submit a signed yield-NFT transaction.
app.post("/submit", authMiddleware, async (c) => {
  try {
    const { signedXdr } = await c.req.json();
    if (!signedXdr) {
      return c.json({ error: "Missing required field: signedXdr" }, 400);
    }
    const { txHash } = await submitSignedTx(signedXdr);
    return c.json({ ok: true, txHash });
  } catch (err: any) {
    logger.error({ err: err.message }, "NFT submit failed");
    return c.json({ error: "Transaction rejected: " + err.message }, 400);
  }
});

export { app as nftRoutes };
