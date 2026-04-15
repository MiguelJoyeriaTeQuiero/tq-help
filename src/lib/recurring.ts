import { addDays, addMonths } from "date-fns";

export type RecurringFrequency = "DIARIA" | "SEMANAL" | "QUINCENAL" | "MENSUAL";

export function advanceNextRunAt(current: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case "DIARIA":     return addDays(current, 1);
    case "SEMANAL":    return addDays(current, 7);
    case "QUINCENAL":  return addDays(current, 14);
    case "MENSUAL":    return addMonths(current, 1);
  }
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  DIARIA:    "Diaria",
  SEMANAL:   "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL:   "Mensual",
};

export const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(
  ([value, label]) => ({ value, label })
);
