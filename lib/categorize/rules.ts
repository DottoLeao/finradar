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
  /**
   * Padrões pra termos curtos que colidem como substring — "PIX" casaria
   * PIXEL/PIXAR, "TED" casaria POSTED/LIMITED. Sem flag /g (lastIndex).
   */
  patterns?: RegExp[];
}

// exchange primeiro: garante que uma descrição de CONVERSION nunca seja
// capturada por outra regra antes de cair na categoria correta.
// Marketplaces (Mercado Pago/Livre) antes de groceries e transfer: contêm
// "MERCADO" mas não são supermercado, e movimentam qualquer tipo de compra —
// "other" é o menos errado.
export const CATEGORY_RULES: RuleGroup[] = [
  { category: "exchange", keywords: ["CONVERSION", "EXCHANGE"] },
  { category: "other", keywords: ["MERCADO PAGO", "MERCADOPAGO", "MERCADO LIVRE", "MERCADOLIVRE"] },
  {
    category: "transport",
    keywords: ["UBER TRIP", "UBER *TRIP", "TRANSLINK", "TAXI", "DIDI", "LYFT", "99APP", "99*", "99 TECNOLOGIA"],
  },
  { category: "dining", keywords: ["MENULOG", "DOORDASH", "UBER EATS", "DELIVEROO", "IFOOD", "RAPPI"] },
  {
    category: "groceries",
    keywords: ["COLES", "WOOLWORTHS", "IGA ", "ALDI", "CARREFOUR", "PAO DE ACUCAR", "ASSAI", "ATACADAO", "SUPERMERCADO"],
    // \bMERCADO\b e não a substring: SUPERMERCADO já é keyword própria e
    // MERCADO PAGO/LIVRE são capturados pela regra "other" acima.
    patterns: [/\bMERCADO\b/],
  },
  {
    category: "subscriptions",
    keywords: ["NETFLIX", "SPOTIFY", "DISNEY+", "YOUTUBE PREMIUM", "GLOBOPLAY", "PRIME VIDEO", "AMAZON PRIME"],
  },
  { category: "rent", keywords: ["RENT PAYMENT", "RENT PMT", "ALUGUEL"] },
  { category: "income", keywords: ["PAYROLL", "SALARY", "SALARIO"] },
  {
    category: "healthcare",
    keywords: [
      "MEDICAL CENTRE",
      "MEDICAL CENTER",
      "CLINIC",
      "HOSPITAL",
      "PHARMACY",
      "DROGASIL",
      "DROGA RAIA",
      "PAGUE MENOS",
      "FARMACIA",
      "DROGARIA",
    ],
  },
  // transfer por último: PIX/TED/TRANSFERENCIA são o MEIO de pagamento, não o
  // fim — "PIX ALUGUEL IMOB CENTRAL" deve cair em rent, não em transfer.
  {
    category: "transfer",
    keywords: ["TRANSFER", "PAYID", "FAST TRANSFER", "BPAY", "BOLETO", "TRANSFERENCIA"],
    // TED ainda pode colidir com nome próprio (TED BAKER) — aceitável pro
    // público BR; DOC idem, ambos raros como palavra isolada em extrato EN.
    patterns: [/\bPIX\b/, /\bTED\b/, /\bDOC\b/],
  },
];

/** Retorna a categoria se alguma regra bater, ou "uncategorized" pra revisão manual. */
export function applyRules(description: string, merchant?: string): Category {
  // NFD + strip de diacríticos: extratos BR misturam "Transferência"/"Salário"
  // com versões sem acento — as keywords são sempre ASCII.
  const upper = `${merchant ?? ""} ${description}`
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const rule of CATEGORY_RULES) {
    if (
      rule.keywords.some((keyword) => upper.includes(keyword)) ||
      rule.patterns?.some((pattern) => pattern.test(upper))
    ) {
      return rule.category;
    }
  }
  return "uncategorized";
}
