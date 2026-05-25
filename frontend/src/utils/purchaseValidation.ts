import { Order } from "@/src/data/mock";
import { AppSettings } from "@/src/services/settingsService";

export type PurchaseValidationStatus = "ok" | "warning_low" | "needs_complement" | "blocked_review";

export type PurchaseValidationResult = {
  status: PurchaseValidationStatus;
  minAllowed: number;
  maxAllowed: number;
  extraRequired: number;
  message: string;
};

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validateActualPurchaseValue(
  order: Pick<Order, "subtotal" | "estimatedValue" | "authorizedPurchaseLimit">,
  actualValue: number,
  settings: AppSettings,
): PurchaseValidationResult {
  const estimatedProductsValue = Number(order.subtotal || order.estimatedValue);
  if (!Number.isFinite(actualValue) || actualValue <= 0 || !Number.isFinite(estimatedProductsValue) || estimatedProductsValue <= 0) {
    return {
      status: "blocked_review",
      minAllowed: 0,
      maxAllowed: 0,
      extraRequired: 0,
      message: "Valor inválido para conferência. O pedido precisa de revisão antes de continuar.",
    };
  }

  const minAllowed = cents(estimatedProductsValue * (1 + settings.actualValueMinTolerancePercent / 100));
  const maxAllowed = cents(estimatedProductsValue * (1 + settings.actualValueMaxTolerancePercent / 100));
  const authorizedLimit = Number(order.authorizedPurchaseLimit || estimatedProductsValue);

  // Valores acima de duas vezes a tolerância máxima indicam erro de digitação
  // ou compra incompatível com o pedido e não devem seguir automaticamente.
  if (actualValue > maxAllowed * 2) {
    return {
      status: "blocked_review",
      minAllowed,
      maxAllowed,
      extraRequired: cents(Math.max(0, actualValue - authorizedLimit)),
      message: "Valor muito acima do esperado. Solicite revisão do Admin antes de continuar.",
    };
  }

  if (actualValue < minAllowed) {
    return {
      status: "warning_low",
      minAllowed,
      maxAllowed,
      extraRequired: 0,
      message: "Valor real ficou muito abaixo do estimado. Confira se todos os itens foram comprados.",
    };
  }

  if (actualValue > maxAllowed) {
    return {
      status: "needs_complement",
      minAllowed,
      maxAllowed,
      extraRequired: cents(Math.max(0, actualValue - authorizedLimit)),
      message: "O valor real ultrapassou a faixa permitida. Aguarde a autorização do cliente.",
    };
  }

  return {
    status: "ok",
    minAllowed,
    maxAllowed,
    extraRequired: 0,
    message: "Valor real dentro da faixa permitida.",
  };
}
