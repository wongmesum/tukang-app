/**
 * Payment provider interface.
 * All QRIS providers (Midtrans, Xendit, DANA) implement this.
 */
export interface QrisCreateResult {
  qrString: string;
  qrImageUrl: string;
  externalId: string;
}

export interface PaymentProvider {
  /** Create a dynamic QRIS code for the given amount */
  createQris(params: {
    paymentId: string;
    amount: number;
    orderId: string;
    description: string;
    expiryMinutes: number;
  }): Promise<QrisCreateResult>;

  /** Verify webhook signature from the provider */
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
