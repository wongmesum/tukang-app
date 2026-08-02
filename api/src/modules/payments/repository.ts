import { randomUUID } from "crypto";
import type { CreatePaymentInput, PaymentRecord, PaymentRepository } from "./types";

const payments = new Map<string, PaymentRecord>();

export class InMemoryPaymentRepository implements PaymentRepository {
  async create(input: CreatePaymentInput): Promise<PaymentRecord> {
    const payment: PaymentRecord = {
      id: randomUUID(),
      orderId: input.orderId,
      amount: input.amount,
      method: input.method,
      status: "pending",
      reference: null,
      qrString: input.qrString,
      qrImageUrl: input.qrImageUrl,
      expiresAt: input.expiresAt,
      paidAt: null,
      createdAt: new Date(),
    };
    payments.set(payment.id, payment);
    return payment;
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    return payments.get(id) ?? null;
  }

  async findByOrderId(orderId: string): Promise<PaymentRecord[]> {
    return [...payments.values()].filter((p) => p.orderId === orderId);
  }

  async markQrData(id: string, qrString: string, qrImageUrl: string): Promise<PaymentRecord> {
    const payment = payments.get(id);
    if (!payment) throw new Error("Payment not found");
    const updated: PaymentRecord = { ...payment, qrString, qrImageUrl };
    payments.set(id, updated);
    return updated;
  }

  async markPaid(id: string, reference: string): Promise<PaymentRecord> {
    const payment = payments.get(id);
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "paid") return payment; // idempotent
    const updated: PaymentRecord = {
      ...payment,
      status: "paid",
      reference,
      paidAt: new Date(),
    };
    payments.set(id, updated);
    return updated;
  }

  async markRefunded(id: string): Promise<PaymentRecord> {
    const payment = payments.get(id);
    if (!payment) throw new Error("Payment not found");
    const updated: PaymentRecord = { ...payment, status: "refunded" };
    payments.set(id, updated);
    return updated;
  }
}

import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaPaymentRepository } from "./prisma-repository";

// ... existing code ...

const memoryRepo = new InMemoryPaymentRepository();
export const paymentRepo = shouldUsePrisma() ? new PrismaPaymentRepository() : memoryRepo;
