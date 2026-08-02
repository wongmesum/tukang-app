export type PaymentMethod = "qris" | "cash";
export type PaymentStatus = "pending" | "paid" | "refunded" | "expired";

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  qrString: string | null;
  qrImageUrl: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  qrString: string | null;
  qrImageUrl: string | null;
  expiresAt: Date | null;
}

export interface PaymentRepository {
  create(input: CreatePaymentInput): Promise<PaymentRecord>;
  findById(id: string): Promise<PaymentRecord | null>;
  findByOrderId(orderId: string): Promise<PaymentRecord[]>;
  markQrData(id: string, qrString: string, qrImageUrl: string): Promise<PaymentRecord>;
  markPaid(id: string, reference: string): Promise<PaymentRecord>;
  markRefunded(id: string): Promise<PaymentRecord>;
}
