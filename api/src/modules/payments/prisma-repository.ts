import { prisma } from "../../shared/prisma";
import type { CreatePaymentInput, PaymentRecord, PaymentRepository } from "./types";
import type { Payment } from "@prisma/client";

function mapToRecord(p: Payment): PaymentRecord {
  return {
    id: p.id,
    orderId: p.orderId,
    amount: p.amount,
    method: p.method as PaymentRecord["method"],
    status: p.status as PaymentRecord["status"],
    reference: p.reference,
    qrString: p.qrString,
    qrImageUrl: p.qrImageUrl,
    expiresAt: p.expiresAt,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };
}

export class PrismaPaymentRepository implements PaymentRepository {
  async create(input: CreatePaymentInput): Promise<PaymentRecord> {
    const payment = await prisma.payment.create({
      data: {
        orderId: input.orderId,
        amount: input.amount,
        method: input.method,
        status: "pending",
        qrString: input.qrString,
        qrImageUrl: input.qrImageUrl,
        expiresAt: input.expiresAt,
      },
    });

    return mapToRecord(payment);
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return null;
    return mapToRecord(payment);
  }

  async findByOrderId(orderId: string): Promise<PaymentRecord[]> {
    const payments = await prisma.payment.findMany({ where: { orderId } });
    return payments.map(mapToRecord);
  }

  async markQrData(id: string, qrString: string, qrImageUrl: string): Promise<PaymentRecord> {
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        qrString,
        qrImageUrl,
      },
    });

    return mapToRecord(payment);
  }

  async markPaid(id: string, reference: string): Promise<PaymentRecord> {
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: "paid",
        reference,
        paidAt: new Date(),
      },
    });
    return mapToRecord(payment);
  }

  async markRefunded(id: string): Promise<PaymentRecord> {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status: "refunded" },
    });
    return mapToRecord(payment);
  }
}
