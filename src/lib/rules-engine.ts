/**
 * Rules Engine — evaluates BusinessRule conditions against a ticket payload
 * and returns mutations to apply.
 */

export interface RuleCondition {
  field: string;    // "priority" | "originDept" | "targetDept" | "assigneeId"
  operator: string; // "equals" | "not_equals" | "includes" | "is_empty" | "is_not_empty"
  value: string;
}

export interface RuleAction {
  type: string;  // "ASSIGN_TO_USER" | "SET_PRIORITY" | "ADD_TAG" | "SET_TARGET_DEPT"
  value: string;
}

export interface TicketPayload {
  priority?: string;
  originDept?: string;
  targetDept?: string[];
  assigneeId?: string | null;
  [key: string]: any;
}

export interface RuleMutation {
  assigneeId?: string;
  priority?: string;
  tagIds?: string[]; // tags to ADD (merged with existing)
  targetDept?: string[];
}

function evaluateCondition(condition: RuleCondition, payload: TicketPayload): boolean {
  const { field, operator, value } = condition;
  const fieldValue = payload[field];

  switch (operator) {
    case "equals":
      return String(fieldValue) === value;
    case "not_equals":
      return String(fieldValue) !== value;
    case "includes":
      if (Array.isArray(fieldValue)) return fieldValue.includes(value);
      return String(fieldValue ?? "").toLowerCase().includes(value.toLowerCase());
    case "is_empty":
      return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
    case "is_not_empty":
      return !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
    default:
      return false;
  }
}

export function evaluateRules(
  event: "TICKET_CREATED" | "TICKET_UPDATED",
  payload: TicketPayload,
  rules: Array<{ event: string; isActive: boolean; conditions: any; action: any; order: number }>
): RuleMutation {
  const mutation: RuleMutation = {};
  const tagIds: string[] = [];

  const applicable = rules
    .filter((r) => r.isActive && r.event === event)
    .sort((a, b) => a.order - b.order);

  for (const rule of applicable) {
    const conditions = (Array.isArray(rule.conditions) ? rule.conditions : []) as RuleCondition[];
    const action = rule.action as RuleAction;

    const allMatch = conditions.every((c) => evaluateCondition(c, payload));
    if (!allMatch) continue;

    switch (action.type) {
      case "ASSIGN_TO_USER":
        mutation.assigneeId = action.value;
        break;
      case "SET_PRIORITY":
        mutation.priority = action.value;
        break;
      case "ADD_TAG":
        tagIds.push(action.value);
        break;
      case "SET_TARGET_DEPT":
        mutation.targetDept = action.value.split(",").map((s) => s.trim()).filter(Boolean);
        break;
    }
  }

  if (tagIds.length > 0) mutation.tagIds = tagIds;
  return mutation;
}
