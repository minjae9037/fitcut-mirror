import { PaymentClient } from "@portone/server-sdk";
import {
  isUnrecognizedPayment,
  type Payment,
} from "@portone/server-sdk/payment";
import type { MirilookPaymentProduct } from "@/lib/mirilook-payments";
import { readServerEnv } from "@/lib/server/env";

export type PortOnePaymentVerification =
  | {
      actualAmount: number;
      configured: true;
      currency: string | null;
      ok: true;
      paymentId: string;
      rawPayment: Payment;
      status: "PAID";
    }
  | {
      actualAmount: number | null;
      configured: boolean;
      currency: string | null;
      error?: string;
      ok: false;
      paymentId: string;
      rawPayment?: Payment;
      reason:
        | "portone_amount_mismatch"
        | "portone_currency_mismatch"
        | "portone_lookup_failed"
        | "portone_payment_not_paid"
        | "portone_secret_not_configured"
        | "portone_unrecognized_payment";
      status?: string;
    };

type VerifyPortOnePaymentOptions = {
  paymentId: string;
  product: MirilookPaymentProduct;
};

export async function verifyPortOnePayment({
  paymentId,
  product,
}: VerifyPortOnePaymentOptions): Promise<PortOnePaymentVerification> {
  const secret = readServerEnv("PORTONE_API_SECRET");

  if (!secret) {
    return {
      actualAmount: null,
      configured: false,
      currency: null,
      ok: false,
      paymentId,
      reason: "portone_secret_not_configured",
    };
  }

  try {
    const storeId = readServerEnv("NEXT_PUBLIC_PORTONE_STORE_ID") || undefined;
    const paymentClient = PaymentClient({ secret });
    const payment = await paymentClient.getPayment({ paymentId, storeId });

    if (isUnrecognizedPayment(payment)) {
      return {
        actualAmount: null,
        configured: true,
        currency: null,
        ok: false,
        paymentId,
        rawPayment: payment,
        reason: "portone_unrecognized_payment",
        status: String(payment.status),
      };
    }

    const actualAmount = readPaymentAmount(payment);
    const currency = readPaymentCurrency(payment);

    if (payment.status !== "PAID") {
      return {
        actualAmount,
        configured: true,
        currency,
        ok: false,
        paymentId,
        rawPayment: payment,
        reason: "portone_payment_not_paid",
        status: payment.status,
      };
    }

    if (actualAmount !== product.amount) {
      return {
        actualAmount,
        configured: true,
        currency,
        ok: false,
        paymentId,
        rawPayment: payment,
        reason: "portone_amount_mismatch",
        status: payment.status,
      };
    }

    if (currency && currency !== "KRW") {
      return {
        actualAmount,
        configured: true,
        currency,
        ok: false,
        paymentId,
        rawPayment: payment,
        reason: "portone_currency_mismatch",
        status: payment.status,
      };
    }

    return {
      actualAmount,
      configured: true,
      currency,
      ok: true,
      paymentId,
      rawPayment: payment,
      status: payment.status,
    };
  } catch (error) {
    return {
      actualAmount: null,
      configured: true,
      currency: null,
      error: describePortOneError(error),
      ok: false,
      paymentId,
      reason: "portone_lookup_failed",
    };
  }
}

export function describePortOneError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, 240);
  }

  return "Unknown PortOne error";
}

function readPaymentAmount(payment: Payment) {
  if (
    "amount" in payment &&
    payment.amount &&
    typeof payment.amount === "object" &&
    "total" in payment.amount &&
    typeof payment.amount.total === "number"
  ) {
    return payment.amount.total;
  }

  return null;
}

function readPaymentCurrency(payment: Payment) {
  if ("currency" in payment && typeof payment.currency === "string") {
    return payment.currency;
  }

  return null;
}
