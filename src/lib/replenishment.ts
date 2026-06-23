import { prisma } from "@/lib/prisma";

/**
 * Motor de reposición de stock.
 *
 * Pensado por ciclos de pedido (las tiendas piden a rachas cada ~2 meses):
 *  - Consumo por ciclo = media del histórico (uds. SOLICITADAS, no servidas, para
 *    no perpetuar roturas).
 *  - Colchón de seguridad = fracción del consumo por ciclo (global, configurable).
 *  - Stock objetivo = consumo por ciclo + colchón.
 *  - Punto de pedido (umbral de aviso) = consumo durante el plazo de entrega + colchón.
 *  - Cantidad sugerida = stock objetivo − stock actual.
 *
 * El cálculo es una sugerencia: logística valida (puede fijar un punto de pedido
 * manual por producto y marcar "ya pedido" para silenciar el aviso).
 */

export interface ReplenishmentSettings {
  safetyFactor: number;
  cycleDays: number;
  windowMonths: number;
  minCycles: number;
  defaultLeadDays: number;
  campaignMultiplier: number;
  campaignMonths: number[];
}

export const REPLENISHMENT_DEFAULTS: ReplenishmentSettings = {
  safetyFactor: 0.25,
  cycleDays: 60,
  windowMonths: 12,
  minCycles: 2,
  defaultLeadDays: 7,
  campaignMultiplier: 1.5,
  campaignMonths: [11, 12],
};

export async function getReplenishmentSettings(): Promise<ReplenishmentSettings> {
  const cfg = await prisma.replenishmentConfig.findUnique({ where: { id: "singleton" } });
  if (!cfg) return REPLENISHMENT_DEFAULTS;
  return {
    safetyFactor: cfg.safetyFactor,
    cycleDays: cfg.cycleDays,
    windowMonths: cfg.windowMonths,
    minCycles: cfg.minCycles,
    defaultLeadDays: cfg.defaultLeadDays,
    campaignMultiplier: cfg.campaignMultiplier,
    campaignMonths: cfg.campaignMonths,
  };
}

export interface ProductDemand {
  totalDemand: number;       // uds. solicitadas en la ventana
  orderCount: number;        // nº de pedidos (ciclos) que incluyeron el producto
  firstOrderAt: Date | null; // primer pedido dentro de la ventana
}

export interface ReplenishmentMetrics {
  avgDailyDemand: number;
  perCycleDemand: number;
  safetyBuffer: number;
  reorderPoint: number;
  targetStock: number;
  suggestedQty: number;
  enoughHistory: boolean;
  needsReorder: boolean;
  usingOverride: boolean;
  inCampaign: boolean;
  leadDays: number;
}

type ProductInput = {
  stock: number;
  leadTimeDays: number | null;
  reorderPointOverride: number | null;
  replenishmentRequested: boolean;
};

const MS_PER_DAY = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

export function computeReplenishment(
  product: ProductInput,
  demand: ProductDemand,
  cfg: ReplenishmentSettings,
  now: Date,
): ReplenishmentMetrics {
  const windowDays = cfg.windowMonths * 30;
  const inCampaign = cfg.campaignMonths.includes(now.getMonth() + 1);
  const campaignFactor = inCampaign ? cfg.campaignMultiplier : 1;

  // Repartimos el consumo desde el primer pedido de la ventana hasta hoy
  const spanDays = demand.firstOrderAt
    ? Math.max(1, Math.min(windowDays, daysBetween(demand.firstOrderAt, now)))
    : 0;

  const avgDailyDemand = spanDays > 0 ? (demand.totalDemand / spanDays) * campaignFactor : 0;
  const perCycleDemand = avgDailyDemand * cfg.cycleDays;
  const safetyBuffer = perCycleDemand * cfg.safetyFactor;

  const leadDays = product.leadTimeDays ?? cfg.defaultLeadDays;
  const enoughHistory = demand.orderCount >= cfg.minCycles;
  const usingOverride = product.reorderPointOverride != null;

  let reorderPoint: number;
  let targetStock: number;
  if (usingOverride) {
    reorderPoint = product.reorderPointOverride!;
    targetStock = enoughHistory
      ? Math.round(perCycleDemand + safetyBuffer)
      : Math.round(reorderPoint * 1.5);
  } else {
    reorderPoint = Math.round(avgDailyDemand * leadDays + safetyBuffer);
    targetStock = Math.round(perCycleDemand + safetyBuffer);
  }

  const suggestedQty = Math.max(0, targetStock - product.stock);

  // Solo avisamos si hay base fiable (histórico suficiente u override manual) y no está ya pedido
  const hasBasis = enoughHistory || usingOverride;
  const needsReorder = hasBasis && !product.replenishmentRequested && product.stock <= reorderPoint;

  return {
    avgDailyDemand,
    perCycleDemand,
    safetyBuffer,
    reorderPoint,
    targetStock,
    suggestedQty,
    enoughHistory,
    needsReorder,
    usingOverride,
    inCampaign,
    leadDays,
  };
}
