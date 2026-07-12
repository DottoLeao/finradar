import { CATEGORY_RULES } from "@/lib/categorize/rules";
import type { Category } from "@/lib/categorize/rules";
import type { CategoryReference } from "@/lib/ai-local/types";

/**
 * Frases curtas por categoria, em EN e PT — dão contexto em linguagem natural
 * pro modelo de embedding, que discrimina mal uma lista nua de nomes de marca.
 * A variante em português melhora o fallback de cosseno pra transações em PT
 * (o classificador treinado só viu inglês). As keywords de CATEGORY_RULES
 * continuam sendo anexadas — mesmo dado reaproveitado, empacotado em frase.
 */
const REFERENCE_TEMPLATES: Partial<Record<Category, string[]>> = {
  groceries: ["grocery shopping at a supermarket or market", "compras de mercado ou supermercado"],
  transport: ["transportation, rides, taxis, or public transit", "transporte, corridas, táxi ou transporte público"],
  dining: ["restaurant, cafe, or food delivery order", "restaurante, café, padaria ou pedido de comida"],
  subscriptions: ["recurring subscription service", "serviço de assinatura recorrente"],
  transfer: ["bank transfer or money sent between accounts", "transferência bancária ou envio de dinheiro"],
  exchange: ["currency exchange or conversion", "câmbio ou conversão de moeda"],
  rent: ["rent payment for housing", "pagamento de aluguel de moradia"],
  income: ["salary or payroll income", "salário ou renda de folha de pagamento"],
  healthcare: ["medical clinic, hospital, or pharmacy", "clínica médica, hospital ou farmácia"],
};

/**
 * Reaproveita as keywords do motor de regras como texto de referência pra
 * embedding — "other" e "uncategorized" não têm RuleGroup, ficam fora.
 */
export function buildCategoryReferences(): CategoryReference[] {
  return CATEGORY_RULES.map((rule) => {
    const keywords = rule.keywords.join(", ").toLowerCase();
    const templates = REFERENCE_TEMPLATES[rule.category];
    return {
      category: rule.category,
      referenceTexts: templates
        ? templates.map((template) => `${template}: ${keywords}`)
        : [keywords],
    };
  });
}
