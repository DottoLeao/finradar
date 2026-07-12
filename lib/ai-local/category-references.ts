import { CATEGORY_RULES } from "@/lib/categorize/rules";
import type { Category } from "@/lib/categorize/rules";
import type { CategoryReference } from "@/lib/ai-local/types";

/**
 * Frase curta por categoria — dá contexto em linguagem natural pro modelo de
 * embedding, que discrimina mal uma lista nua de nomes de marca (ex.:
 * "netflix spotify uber" sozinho embeda de forma quase indistinguível entre
 * categorias). As keywords de CATEGORY_RULES continuam sendo a fonte —
 * isso só empacota o mesmo dado reaproveitado numa frase.
 */
const REFERENCE_TEMPLATES: Partial<Record<Category, string>> = {
  groceries: "grocery shopping at a supermarket or market",
  transport: "transportation, rides, taxis, or public transit",
  dining: "restaurant, cafe, or food delivery order",
  subscriptions: "recurring subscription service",
  transfer: "bank transfer or money sent between accounts",
  exchange: "currency exchange or conversion",
  rent: "rent payment for housing",
  income: "salary or payroll income",
  healthcare: "medical clinic, hospital, or pharmacy",
};

/**
 * Reaproveita as keywords do motor de regras como texto de referência pra
 * embedding — "other" e "uncategorized" não têm RuleGroup, ficam fora.
 */
export function buildCategoryReferences(): CategoryReference[] {
  return CATEGORY_RULES.map((rule) => {
    const keywords = rule.keywords.join(", ").toLowerCase();
    const template = REFERENCE_TEMPLATES[rule.category];
    return {
      category: rule.category,
      referenceText: template ? `${template}: ${keywords}` : keywords,
    };
  });
}
