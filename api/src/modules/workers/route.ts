import { Hono } from "hono";
import { adminMiddleware } from "../../shared/admin-middleware";
import { authMiddleware } from "../../shared/auth-middleware";
import { requireRole } from "../../shared/role-middleware";
import {
  registerWorkerSchema,
  setAvailabilitySchema,
  updateWorkerProfileSchema,
  withdrawSchema,
} from "./schema";
import { walletRepo, workerRepo } from "./repository";
import type { WalletRecord, WalletTransactionRecord, WorkerProfileRecord } from "./types";

function formatProfile(profile: WorkerProfileRecord) {
  return {
    id: profile.id,
    user_id: profile.userId,
    ktp_number: profile.ktpNumber,
    ktp_photo_url: profile.ktpPhotoUrl,
    bio: profile.bio,
    work_radius_km: profile.workRadiusKm,
    home_location: profile.homeLocation,
    is_available: profile.isAvailable,
    rating_avg: profile.ratingAvg,
    total_orders: profile.totalOrders,
    verified_at: profile.verifiedAt?.toISOString() ?? null,
    status: profile.status,
    skills: profile.skills,
    created_at: profile.createdAt.toISOString(),
  };
}

function formatWallet(wallet: WalletRecord, transactions: WalletTransactionRecord[]) {
  return {
    id: wallet.id,
    worker_id: wallet.workerId,
    balance: wallet.balance,
    total_earned: wallet.totalEarned,
    transactions: transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      reference_order_id: tx.referenceOrderId,
      created_at: tx.createdAt.toISOString(),
    })),
  };
}

const workersRouter = new Hono();
workersRouter.use("/worker/*", authMiddleware);

// Role guards per-endpoint group (register is open to any authenticated user)
const workerOnlyGuard = requireRole("worker");

// POST /worker/register
workersRouter.post("/worker/register", async (context) => {
  const body = await context.req.json();
  const parsed = registerWorkerSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  const existing = await workerRepo.findByUserId(authUser.userId);
  if (existing) {
    return context.json(
      {
        success: false,
        error: { code: "CONFLICT", message: "Profil tukang sudah terdaftar" },
      },
      409,
    );
  }

  const profile = await workerRepo.create({
    userId: authUser.userId,
    ktpNumber: parsed.data.ktp_number,
    ktpPhotoUrl: parsed.data.ktp_photo_url,
    bio: parsed.data.bio ?? null,
    workRadiusKm: parsed.data.work_radius_km,
    homeLocation: parsed.data.home_location,
    skills: parsed.data.skills,
  });

  return context.json({ success: true, data: formatProfile(profile) });
});

// GET /worker/profile
workersRouter.get("/worker/profile", workerOnlyGuard, async (context) => {
  const authUser = context.get("user");
  const profile = await workerRepo.findByUserId(authUser.userId);
  if (!profile) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Profil tukang belum ada" } },
      404,
    );
  }
  return context.json({ success: true, data: formatProfile(profile) });
});

// PATCH /worker/profile
workersRouter.patch("/worker/profile", workerOnlyGuard, async (context) => {
  const body = await context.req.json();
  const parsed = updateWorkerProfileSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  const profile = await workerRepo.findByUserId(authUser.userId);
  if (!profile) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Profil tukang belum ada" } },
      404,
    );
  }

  const updated = await workerRepo.update(authUser.userId, {
    ...(parsed.data.bio !== undefined && { bio: parsed.data.bio }),
    ...(parsed.data.work_radius_km !== undefined && {
      workRadiusKm: parsed.data.work_radius_km,
    }),
    ...(parsed.data.home_location !== undefined && {
      homeLocation: parsed.data.home_location,
    }),
    ...(parsed.data.skills !== undefined && { skills: parsed.data.skills }),
  });

  return context.json({ success: true, data: formatProfile(updated) });
});

// POST /worker/availability
workersRouter.post("/worker/availability", workerOnlyGuard, async (context) => {
  const body = await context.req.json();
  const parsed = setAvailabilitySchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Input tidak valid" } },
      400,
    );
  }

  const authUser = context.get("user");
  const profile = await workerRepo.findByUserId(authUser.userId);
  if (!profile) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Profil tukang belum ada" } },
      404,
    );
  }

  if (profile.status !== "active" && parsed.data.is_available) {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Profil tukang belum diverifikasi admin",
        },
      },
      409,
    );
  }

  const updated = await workerRepo.update(authUser.userId, {
    isAvailable: parsed.data.is_available,
    ...(parsed.data.current_location !== undefined && {
      homeLocation: parsed.data.current_location,
    }),
  });

  return context.json({ success: true, data: formatProfile(updated) });
});

// GET /worker/wallet
workersRouter.get("/worker/wallet", workerOnlyGuard, async (context) => {
  const authUser = context.get("user");
  const wallet = await walletRepo.ensureFor(authUser.userId);
  const transactions = await walletRepo.listTransactions(authUser.userId);
  return context.json({ success: true, data: formatWallet(wallet, transactions) });
});

// POST /worker/wallet/withdraw
workersRouter.post("/worker/wallet/withdraw", workerOnlyGuard, async (context) => {
  const body = await context.req.json();
  const parsed = withdrawSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  const wallet = await walletRepo.ensureFor(authUser.userId);

  if (wallet.balance < parsed.data.amount) {
    return context.json(
      {
        success: false,
        error: { code: "CONFLICT", message: "Saldo tidak cukup" },
      },
      409,
    );
  }

  const tx = await walletRepo.addTransaction(
    authUser.userId,
    "debit",
    parsed.data.amount,
    `Penarikan ke ${parsed.data.bank_name} - ${parsed.data.bank_account}`,
    null,
  );

  return context.json({
    success: true,
    data: {
      transaction_id: tx.id,
      amount: tx.amount,
      status: "pending",
      message: "Permintaan penarikan diproses",
    },
  });
});

// Admin: verify worker
workersRouter.post("/worker/:id/verify", adminMiddleware, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID worker wajib diisi" } },
      400,
    );
  }
  const profile = await workerRepo.findByUserId(id);
  if (!profile) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Tukang tidak ditemukan" } },
      404,
    );
  }
  const updated = await workerRepo.update(id, { status: "active" });
  return context.json({ success: true, data: formatProfile(updated) });
});

export { workersRouter };
