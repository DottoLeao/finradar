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
  groceries: [
    "grocery shopping at a supermarket or market",
    "compras de mercado ou supermercado",
    "supermercado, hortifruti, açougue ou atacado",
  ],
  transport: [
    "transportation, rides, taxis, or public transit",
    "transporte, corridas, táxi ou transporte público",
    "aplicativo de corrida, posto de combustível, estacionamento ou metrô",
  ],
  dining: [
    "restaurant, cafe, or food delivery order",
    "restaurante, café, padaria ou pedido de comida",
    "delivery de comida, lanchonete, pizzaria ou bar",
  ],
  subscriptions: [
    "recurring subscription service",
    "serviço de assinatura recorrente",
    "assinatura mensal de streaming ou academia",
  ],
  transfer: [
    "bank transfer or money sent between accounts",
    "transferência bancária ou envio de dinheiro",
    "pix enviado ou recebido, pagamento de boleto",
  ],
  exchange: ["currency exchange or conversion", "câmbio ou conversão de moeda"],
  rent: ["rent payment for housing", "pagamento de aluguel de moradia ou apartamento"],
  income: ["salary or payroll income", "salário, folha de pagamento ou remuneração mensal"],
  healthcare: [
    "medical clinic, hospital, or pharmacy",
    "clínica médica, hospital ou farmácia",
    "farmácia, drogaria, laboratório ou consulta médica",
  ],
};

/**
 * Reaproveita as keywords do motor de regras como texto de referência pra
 * embedding. "other" fica fora mesmo tendo RuleGroup (marketplaces): uma
 * referência "mercado pago, mercado livre" roubaria matches de cosseno de
 * descrições legítimas de supermercado ("MERCADINHO SAO JORGE").
 */
export function buildCategoryReferences(): CategoryReference[] {
  return CATEGORY_RULES.filter((rule) => rule.category !== "other").map((rule) => {
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
