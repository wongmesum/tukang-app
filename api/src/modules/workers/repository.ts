import { randomUUID } from "crypto";
import type {
  CreateWorkerProfileInput,
  UpdateWorkerProfileInput,
  WalletRecord,
  WalletRepository,
  WalletTransactionRecord,
  WalletTransactionType,
  WorkerProfileRecord,
  WorkerProfileRepository,
} from "./types";

const workers = new Map<string, WorkerProfileRecord>();
const wallets = new Map<string, WalletRecord>();
const transactions = new Map<string, WalletTransactionRecord>();

export class InMemoryWorkerProfileRepository implements WorkerProfileRepository {
  async create(input: CreateWorkerProfileInput): Promise<WorkerProfileRecord> {
    const existing = await this.findByUserId(input.userId);
    if (existing) throw new Error("Worker profile already exists");

    const record: WorkerProfileRecord = {
      id: randomUUID(),
      userId: input.userId,
      ktpNumber: input.ktpNumber,
      ktpPhotoUrl: input.ktpPhotoUrl,
      bio: input.bio,
      workRadiusKm: input.workRadiusKm,
      homeLocation: { ...input.homeLocation },
      isAvailable: false,
      ratingAvg: 0,
      totalOrders: 0,
      verifiedAt: null,
      status: "pending",
      skills: [...input.skills],
      createdAt: new Date(),
    };
    workers.set(record.userId, record);
    return record;
  }

  async findByUserId(userId: string): Promise<WorkerProfileRecord | null> {
    return workers.get(userId) ?? null;
  }

  async findAll(): Promise<WorkerProfileRecord[]> {
    return [...workers.values()];
  }

  async update(
    userId: string,
    patch: UpdateWorkerProfileInput,
  ): Promise<WorkerProfileRecord> {
    const current = workers.get(userId);
    if (!current) throw new Error("Worker profile not found");
    const updated: WorkerProfileRecord = {
      ...current,
      ...(patch.bio !== undefined && { bio: patch.bio }),
      ...(patch.workRadiusKm !== undefined && { workRadiusKm: patch.workRadiusKm }),
      ...(patch.homeLocation !== undefined && { homeLocation: { ...patch.homeLocation } }),
      ...(patch.skills !== undefined && { skills: [...patch.skills] }),
      ...(patch.isAvailable !== undefined && { isAvailable: patch.isAvailable }),
      ...(patch.status !== undefined && { status: patch.status }),
    };
    workers.set(userId, updated);
    return updated;
  }
}

export class InMemoryWalletRepository implements WalletRepository {
  async ensureFor(workerId: string): Promise<WalletRecord> {
    const existing = wallets.get(workerId);
    if (existing) return existing;

    const wallet: WalletRecord = {
      id: randomUUID(),
      workerId,
      balance: 0,
      totalEarned: 0,
    };
    wallets.set(workerId, wallet);
    return wallet;
  }

  async findByWorkerId(workerId: string): Promise<WalletRecord | null> {
    return wallets.get(workerId) ?? null;
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
    const updated: WalletRecord = {
      ...wallet,
      balance: wallet.balance + delta,
      totalEarned: type === "credit" ? wallet.totalEarned + amount : wallet.totalEarned,
    };
    wallets.set(workerId, updated);

    const tx: WalletTransactionRecord = {
      id: randomUUID(),
      walletId: wallet.id,
      type,
      amount,
      description,
      referenceOrderId,
      createdAt: new Date(),
    };
    transactions.set(tx.id, tx);
    return tx;
  }

  async listTransactions(workerId: string): Promise<WalletTransactionRecord[]> {
    const wallet = wallets.get(workerId);
    if (!wallet) return [];
    return [...transactions.values()]
      .filter((tx) => tx.walletId === wallet.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaWalletRepository, PrismaWorkerProfileRepository } from "./prisma-repository";

// ... existing code ...

const memoryWorkerRepo = new InMemoryWorkerProfileRepository();
const memoryWalletRepo = new InMemoryWalletRepository();

export const workerRepo = shouldUsePrisma() ? new PrismaWorkerProfileRepository() : memoryWorkerRepo;
export const walletRepo = shouldUsePrisma() ? new PrismaWalletRepository() : memoryWalletRepo;
