export type WorkerStatus = "pending" | "active" | "suspended";

export interface WorkerProfileRecord {
  id: string;
  userId: string;
  ktpNumber: string;
  ktpPhotoUrl: string;
  bio: string | null;
  workRadiusKm: number;
  homeLocation: { lat: number; lng: number };
  isAvailable: boolean;
  ratingAvg: number;
  totalOrders: number;
  verifiedAt: Date | null;
  status: WorkerStatus;
  skills: string[]; // category codes
  createdAt: Date;
}

export interface CreateWorkerProfileInput {
  userId: string;
  ktpNumber: string;
  ktpPhotoUrl: string;
  bio: string | null;
  workRadiusKm: number;
  homeLocation: { lat: number; lng: number };
  skills: string[];
}

export interface UpdateWorkerProfileInput {
  bio?: string | null;
  workRadiusKm?: number;
  homeLocation?: { lat: number; lng: number };
  skills?: string[];
  isAvailable?: boolean;
  status?: WorkerStatus;
}

export interface WorkerProfileRepository {
  create(input: CreateWorkerProfileInput): Promise<WorkerProfileRecord>;
  findByUserId(userId: string): Promise<WorkerProfileRecord | null>;
  findAll(): Promise<WorkerProfileRecord[]>;
  update(userId: string, patch: UpdateWorkerProfileInput): Promise<WorkerProfileRecord>;
}

// Wallet types

export type WalletTransactionType = "credit" | "debit";

export interface WalletTransactionRecord {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  description: string;
  referenceOrderId: string | null;
  createdAt: Date;
}

export interface WalletRecord {
  id: string;
  workerId: string;
  balance: number;
  totalEarned: number;
}

export interface WalletRepository {
  ensureFor(workerId: string): Promise<WalletRecord>;
  findByWorkerId(workerId: string): Promise<WalletRecord | null>;
  addTransaction(
    workerId: string,
    type: WalletTransactionType,
    amount: number,
    description: string,
    referenceOrderId: string | null,
  ): Promise<WalletTransactionRecord>;
  listTransactions(workerId: string): Promise<WalletTransactionRecord[]>;
}
