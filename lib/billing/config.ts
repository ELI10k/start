import "server-only";

const ACTIVE_CHECKOUT_URL = "https://secure.cardcom.solutions/EA/EA5/QAAh9r21UehUv2rz5tL0A/PaymentSP";

export type BillingConfiguration = Readonly<{
  checkoutUrl: string;
  mode: "manual" | "verified";
}>;

/**
 * The supplied Cardcom page contains all three products in one selector. Until
 * Cardcom callbacks are mapped, it is deliberately manual: a browser return is
 * not enough evidence to grant whichever product the customer selected.
 */
export function getBillingConfiguration(): BillingConfiguration {
  const checkoutUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL?.trim() || ACTIVE_CHECKOUT_URL;
  const verified = process.env.BILLING_WEBHOOK_ENABLED === "true";
  return { checkoutUrl, mode: verified ? "verified" : "manual" };
}
