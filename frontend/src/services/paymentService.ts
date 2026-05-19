// paymentService — fully local payment simulation for the offline MVP.

import { Order } from "@/src/data/mock";

export type PaymentIntent = {
  id: string;
  orderId: string;
  amount: number; // total paid by client
  status: "pending" | "approved" | "rejected" | "refunded";
  createdAt: number;
};

export type Split = {
  driverPayout: number;      // delivery fee released after code confirmation
  platformFee: number;       // chekou keeps
  operationalBalance: number; // money for the driver to buy items (not withdrawable)
  refundToClient: number;    // surplus after actual purchase
};

export const paymentService = {
  async createPaymentIntent(order: Order): Promise<PaymentIntent> {
    return {
      id: `pi_${Date.now()}`,
      orderId: order.id,
      amount: order.total,
      status: "pending",
      createdAt: Date.now(),
    };
  },

  async markPaymentAsApproved(intent: PaymentIntent): Promise<PaymentIntent> {
    return { ...intent, status: "approved" };
  },

  async markPaymentAsRejected(intent: PaymentIntent): Promise<PaymentIntent> {
    return { ...intent, status: "rejected" };
  },

  async refundDifference(_intent: PaymentIntent, _amount: number): Promise<void> {
    return;
  },

  async releaseDriverPayment(_intent: PaymentIntent, _driverId: string): Promise<void> {
    return;
  },

  calculateSplit(order: Order): Split {
    const actual = order.actualValue ?? order.estimatedValue;
    return {
      driverPayout: order.deliveryFee,
      platformFee: order.platformFee,
      operationalBalance: actual,
      refundToClient: Math.max(0, order.estimatedValue + order.safetyMargin - actual),
    };
  },
};
