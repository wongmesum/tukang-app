import { Hono } from "hono";
import { randomUUID } from "crypto";
import { authMiddleware } from "../../shared/auth-middleware";

// --- Types ---
interface ReferralRecord {
  userId: string;
  code: string;
  totalReferred: number;
  totalReward: number;
}

interface ReferralUse {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  rewardAmount: number;
  createdAt: Date;
}

// In-memory stores
const referralCodes = new Map<string, ReferralRecord>(); // userId → record
const referralByCode = new Map<string, string>(); // code → userId
const referralUses: ReferralUse[] = [];
const appliedReferrals = new Set<string>(); // referredUserId (each user can only use once)

// Config
const REFERRAL_REWARD = 10000; // Rp 10.000 per successful referral

function generateCode(userId: string): string {
  // Generate a short readable code from userId
  const base = userId.slice(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `TND${base}${suffix}`;
}

function getOrCreateReferral(userId: string): ReferralRecord {
  let record = referralCodes.get(userId);
  if (!record) {
    const code = generateCode(userId);
    record = { userId, code, totalReferred: 0, totalReward: 0 };
    referralCodes.set(userId, record);
    referralByCode.set(code, userId);
  }
  return record;
}

// --- Routes ---
const referralsRouter = new Hono();
referralsRouter.use("/referrals/*", authMiddleware);

// GET /referrals/my-code — get or create user's referral code
referralsRouter.get("/referrals/my-code", async (context) => {
  const authUser = context.get("user");
  const record = getOrCreateReferral(authUser.userId);

  return context.json({
    success: true,
    data: {
      code: record.code,
      total_referred: record.totalReferred,
      total_reward: record.totalReward,
      reward_per_referral: REFERRAL_REWARD,
      share_message: `Pakai TukangNDeso untuk cari tukang di Mojokerto! Pakai kode referral saya: ${record.code} dan dapatkan diskon. Download: https://tukangndeso.id/app`,
    },
  });
});

// POST /referrals/apply — new user applies a referral code
referralsRouter.post("/referrals/apply", async (context) => {
  const authUser = context.get("user");
  const body = await context.req.json() as { code?: string };

  if (!body.code) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Kode referral wajib diisi" } },
      400,
    );
  }

  // Check if user already applied a referral
  if (appliedReferrals.has(authUser.userId)) {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "Anda sudah menggunakan kode referral sebelumnya" } },
      409,
    );
  }

  // Find referrer
  const referrerUserId = referralByCode.get(body.code.toUpperCase());
  if (!referrerUserId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kode referral tidak ditemukan" } },
      404,
    );
  }

  // Can't refer yourself
  if (referrerUserId === authUser.userId) {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "Tidak bisa menggunakan kode referral sendiri" } },
      409,
    );
  }

  // Apply referral
  appliedReferrals.add(authUser.userId);

  const referrerRecord = referralCodes.get(referrerUserId)!;
  referrerRecord.totalReferred += 1;
  referrerRecord.totalReward += REFERRAL_REWARD;

  const use: ReferralUse = {
    id: randomUUID(),
    referrerUserId,
    referredUserId: authUser.userId,
    rewardAmount: REFERRAL_REWARD,
    createdAt: new Date(),
  };
  referralUses.push(use);

  return context.json({
    success: true,
    data: {
      applied: true,
      referrer_reward: REFERRAL_REWARD,
      message: `Kode referral berhasil digunakan! Pengundang mendapat reward Rp ${REFERRAL_REWARD.toLocaleString("id-ID")}.`,
    },
  });
});

// GET /referrals/history — referral history for the user
referralsRouter.get("/referrals/history", async (context) => {
  const authUser = context.get("user");
  const myUses = referralUses.filter((u) => u.referrerUserId === authUser.userId);

  return context.json({
    success: true,
    data: {
      total_referred: myUses.length,
      total_reward: myUses.reduce((sum, u) => sum + u.rewardAmount, 0),
      history: myUses.map((u) => ({
        id: u.id,
        referred_user_id: u.referredUserId,
        reward_amount: u.rewardAmount,
        created_at: u.createdAt.toISOString(),
      })),
    },
  });
});

export { referralsRouter };
