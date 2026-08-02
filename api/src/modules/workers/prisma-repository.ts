import { randomUUID } from "crypto";
import { prisma } from "../../shared/prisma";
import type {
  CreateWorkerProfileInput,
  UpdateWorkerProfileInput,
  WalletRecord,
  WalletRepository,
  WalletTransactionRecord,
  WalletTransactionType,
  WorkerProfileRecord,
  WorkerProfileRepository,
  WorkerStatus,
} from "./types";

interface DecimalLike {
  toString(): string;
}

interface WorkerProfileRow {
  id: string;
  user_id: string;
  ktp_number: string;
  ktp_photo_url: string;
  bio: string | null;
  work_radius_km: number;
  is_available: boolean;
  rating_avg: DecimalLike;
  total_orders: number;
  verified_at: Date | null;
  status: WorkerStatus;
  created_at: Date;
  lat: number;
  lng: number;
}

function mapProfileRowToRecord(row: WorkerProfileRow, skills: string[]): WorkerProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    ktpNumber: row.ktp_number,
    ktpPhotoUrl: row.ktp_photo_url,
    bio: row.bio,
    workRadiusKm: row.work_radius_km,
    homeLocation: { lat: row.lat, lng: row.lng },
    isAvailable: row.is_available,
    ratingAvg: Number(row.rating_avg.toString()),
    totalOrders: row.total_orders,
    verifiedAt: row.verified_at,
    status: row.status,
    skills,
    createdAt: row.created_at,
  };
}

async function fetchSkills(workerId: string): Promise<string[]> {
  const rows = await prisma.workerSkill.findMany({
    where: { workerId },
    select: { categoryCode: true },
  });
  return rows.map((row) => row.categoryCode);
}

export class PrismaWorkerProfileRepository implements WorkerProfileRepository {
  async create(input: CreateWorkerProfileInput): Promise<WorkerProfileRecord> {
    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO worker_profiles (
        id, user_id, ktp_number, ktp_photo_url, bio, work_radius_km,
        home_location, is_available, status, created_at
      )
      VALUES (
        ${id}, ${input.userId}, ${input.ktpNumber}, ${input.ktpPhotoUrl}, ${input.bio},
        ${input.workRadiusKm},
        ST_SetSRID(ST_MakePoint(${input.homeLocation.lng}, ${input.homeLocation.lat}), 4326)::geography,
        false, ${"pending"}::"WorkerStatus", CURRENT_TIMESTAMP
      )
    `;

    if (input.skills.length > 0) {
      await prisma.workerSkill.createMany({
        data: input.skills.map((categoryCode) => ({ workerId: id, categoryCode })),
      });
    }

    const created = await this.findByUserId(input.userId);
    if (!created) throw new Error("Worker profile not found after create");
    return created;
  }

  async findByUserId(userId: string): Promise<WorkerProfileRecord | null> {
    const rows = await prisma.$queryRaw<WorkerProfileRow[]>`
      SELECT
        id, user_id, ktp_number, ktp_photo_url, bio, work_radius_km,
        is_available, rating_avg, total_orders, verified_at, status, created_at,
        ST_Y(home_location::geometry) as lat,
        ST_X(home_location::geometry) as lng
      FROM worker_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    const skills = await fetchSkills(row.id);
    return mapProfileRowToRecord(row, skills);
  }

  async findAll(): Promise<WorkerProfileRecord[]> {
    const rows = await prisma.$queryRaw<WorkerProfileRow[]>`
      SELECT
        id, user_id, ktp_number, ktp_photo_url, bio, work_radius_km,
        is_available, rating_avg, total_orders, verified_at, status, created_at,
        ST_Y(home_location::geometry) as lat,
        ST_X(home_location::geometry) as lng
      FROM worker_profiles
      ORDER BY created_at DESC
    `;

    const skillsByWorkerId = new Map<string, string[]>();
    const skills = await prisma.workerSkill.findMany({ select: { workerId: true, categoryCode: true } });
    for (const skill of skills) {
      const existing = skillsByWorkerId.get(skill.workerId) ?? [];
      skillsByWorkerId.set(skill.workerId, [...existing, skill.categoryCode]);
    }

    return rows.map((row) => mapProfileRowToRecord(row, skillsByWorkerId.get(row.id) ?? []));
  }

  async update(userId: string, patch: UpdateWorkerProfileInput): Promise<WorkerProfileRecord> {
    const current = await this.findByUserId(userId);
    if (!current) throw new Error("Worker profile not found");

    const nextBio = patch.bio !== undefined ? patch.bio : current.bio;
    const nextWorkRadiusKm = patch.workRadiusKm ?? current.workRadiusKm;
    const nextHomeLocation = patch.homeLocation ?? current.homeLocation;
    const nextIsAvailable = patch.isAvailable ?? current.isAvailable;
    const nextStatus = patch.status ?? current.status;

    await prisma.$executeRaw`
      UPDATE worker_profiles
      SET
        bio = ${nextBio},
        work_radius_km = ${nextWorkRadiusKm},
        home_location = ST_SetSRID(ST_MakePoint(${nextHomeLocation.lng}, ${nextHomeLocation.lat}), 4326)::geography,
        is_available = ${nextIsAvailable},
        status = ${nextStatus}::"WorkerStatus",
        verified_at = CASE WHEN ${nextStatus}::"WorkerStatus" = 'active'::"WorkerStatus" THEN COALESCE(verified_at, CURRENT_TIMESTAMP) ELSE verified_at END
      WHERE user_id = ${userId}
    `;

    if (patch.skills) {
      await prisma.$transaction([
        prisma.workerSkill.deleteMany({ where: { workerId: current.id } }),
        prisma.workerSkill.createMany({
          data: patch.skills.map((categoryCode) => ({ workerId: current.id, categoryCode })),
        }),
      ]);
    }

    const updated = await this.findByUserId(userId);
    if (!updated) throw new Error("Worker profile not found after update");
    return updated;
  }
}

export class PrismaWalletRepository implements WalletRepository {
  async ensureFor(workerId: string): Promise<WalletRecord> {
    const existing = await prisma.workerWallet.findUnique({ where: { workerId } });
    if (existing) return existing;

    return prisma.workerWallet.create({
      data: { workerId, balance: 0, totalEarned: 0 },
    });
  }

  async findByWorkerId(workerId: string): Promise<WalletRecord | null> {
    return prisma.workerWallet.findUnique({ where: { workerId } });
  }

  async addTransaction(
    workerId: string,
    type: WalletTransactionType,
    amount: number,
    description: string,
    referenceOrderId: string | null,
  ): Promise<WalletTransactionRecord> {
    const wallet = await this.ensureFor(workerId);
    const delta = type === "credit" ? amount : -amount;

    return prisma.$transaction(async (client) => {
      if (type === "debit") {
        const affectedRows = await client.$executeRaw`
          UPDATE worker_wallets
          SET balance = balance + ${delta}
          WHERE worker_id = ${workerId} AND balance >= ${amount}
        `;
        if (affectedRows === 0) throw new Error("Insufficient wallet balance");
      } else {
        await client.workerWallet.update({
          where: { workerId },
          data: {
            balance: { increment: delta },
            totalEarned: { increment: amount },
          },
        });
      }

      return client.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          description,
          referenceOrderId,
        },
      });
    });
  }

  async listTransactions(workerId: string): Promise<WalletTransactionRecord[]> {
    const wallet = await prisma.workerWallet.findUnique({ where: { workerId } });
    if (!wallet) return [];

    return prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
    });
  }
}
