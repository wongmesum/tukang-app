/**
 * OTP delivery provider interface.
 */
export interface OtpDeliveryProvider {
  /** Send OTP code to a phone number. Returns true if sent successfully. */
  send(phone: string, code: string): Promise<boolean>;
}
