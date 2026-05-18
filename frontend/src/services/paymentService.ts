// paymentService — Mercado Pago integration scaffolding.
//
// IMPORTANT: The Mercado Pago Access Token MUST NEVER live in the mobile app.
// In production, all calls below should be implemented in a secure backend
// (e.g. serverless function or our Supabase Edge Function) which keeps the
// access token in environment variables and exposes endpoints over HTTPS.
//
// This module currently simulates the entire flow with local state.

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
    // FUTURE: POST /payments  -> Mercado Pago Preference / Payment Intent
    return {
      id: `pi_${Date.now()}`,
      orderId: order.id,
      amount: order.total,
      status: "pending",
      createdAt: Date.now(),
    };
  },

  async markPaymentAsApproved(intent: PaymentIntent): Promise<PaymentIntent> {
    // FUTURE: webhook from Mercado Pago updates status. Here we simulate.
    return { ...intent, status: "approved" };
  },

  async markPaymentAsRejected(intent: PaymentIntent): Promise<PaymentIntent> {
    return { ...intent, status: "rejected" };
  },

  async refundDifference(_intent: PaymentIntent, _amount: number): Promise<void> {
    // FUTURE: call MP /refunds with the unused safety margin.
  },

  async releaseDriverPayment(_intent: PaymentIntent, _driverId: string): Promise<void> {
    // FUTURE: trigger payout to driver Pix key once delivery is confirmed via code.
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
