export const CATEGORIES = [
  "groceries",
  "transport",
  "subscriptions",
  "transfer",
  "dining",
  "exchange",
  "rent",
  "income",
  "healthcare",
  "other",
  "uncategorized",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface RuleGroup {
  category: Category;
  keywords: string[];
}

// exchange primeiro: garante que uma descrição de CONVERSION nunca seja
// capturada por outra regra antes de cair na categoria correta.
export const CATEGORY_RULES: RuleGroup[] = [
  { category: "exchange", keywords: ["CONVERSION", "EXCHANGE"] },
  { category: "transport", keywords: ["UBER TRIP", "UBER *TRIP", "TRANSLINK", "TAXI", "DIDI", "LYFT"] },
  { category: "dining", keywords: ["MENULOG", "DOORDASH", "UBER EATS", "DELIVEROO"] },
  { category: "groceries", keywords: ["COLES", "WOOLWORTHS", "IGA ", "ALDI"] },
  { category: "subscriptions", keywords: ["NETFLIX", "SPOTIFY", "DISNEY+", "YOUTUBE PREMIUM"] },
  { category: "transfer", keywords: ["TRANSFER", "PAYID", "FAST TRANSFER", "BPAY"] },
  { category: "rent", keywords: ["RENT PAYMENT", "RENT PMT"] },
  { category: "income", keywords: ["PAYROLL", "SALARY"] },
  { category: "healthcare", keywords: ["MEDICAL CENTRE", "MEDICAL CENTER", "CLINIC", "HOSPITAL", "PHARMACY"] },
];

/** Retorna a categoria se alguma regra bater, ou "uncategorized" pra revisão manual. */
export function applyRules(description: string, merchant?: string): Category {
  const upper = `${merchant ?? ""} ${description}`.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => upper.includes(keyword))) {
      return rule.category;
    }
  }
  return "uncategorized";
}
