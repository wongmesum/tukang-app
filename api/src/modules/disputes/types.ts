export type DisputeFiledBy = "customer" | "worker";
export type DisputeStatus = "open" | "resolved";

export interface DisputeRecord {
  id: string;
  orderId: string;
  filedById: string;
  filedByRole: DisputeFiledBy;
  reason: string;
  photos: string[];
  status: DisputeStatus;
  resolution: string | null;
  refunded: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface CreateDisputeInput {
  orderId: string;
  filedById: string;
  filedByRole: DisputeFiledBy;
  reason: string;
  photos: string[];
}

export interface ResolveDisputeInput {
  resolution: string;
  refunded: boolean;
}

export interface DisputeRepository {
  create(input: CreateDisputeInput): Promise<DisputeRecord>;
  findById(id: string): Promise<DisputeRecord | null>;
  /** Returns the open dispute for an order, if any. */
  findOpenByOrderId(orderId: string): Promise<DisputeRecord | null>;
  findByOrderId(orderId: string): Promise<DisputeRecord[]>;
  findByStatus(status: DisputeStatus): Promise<DisputeRecord[]>;
  resolve(id: string, input: ResolveDisputeInput): Promise<DisputeRecord>;
}
