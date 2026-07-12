import { CATEGORIES, type Category } from "@/lib/categorize/rules";
import type { CategoryTotal } from "@/lib/aggregate";

// Ordem fixa — nunca ciclada (dataviz skill). O sistema de cores validado só
// tem 8 tons categóricos; rent/income/healthcare não ganham tom próprio —
// a skill de dataviz proíbe gerar uma 9ª cor categórica, então elas
// compartilham o tom de "other" e são agrupadas na mesma fatia no gráfico
// (ver groupForChart abaixo). Continuam sendo categorias distintas em
// badges/tabela/dropdown, onde o texto já identifica cada uma.
const CATEGORY_COLOR_VAR: Record<Category, string> = {
  groceries: "var(--chart-1)",
  transport: "var(--chart-2)",
  subscriptions: "var(--chart-3)",
  transfer: "var(--chart-4)",
  dining: "var(--chart-5)",
  exchange: "var(--chart-6)",
  other: "var(--chart-7)",
  rent: "var(--chart-7)",
  income: "var(--chart-7)",
  healthcare: "var(--chart-7)",
  uncategorized: "var(--chart-8)",
};

const FOLD_INTO_OTHER: readonly Category[] = ["other", "rent", "income", "healthcare"];

export function categoryColor(category: Category): string {
  return CATEGORY_COLOR_VAR[category];
}

/**
 * Agrupa categorias que compartilham o tom de "other" numa única fatia —
 * só pra visualização em gráfico (pizza/legenda), onde cor é o canal
 * principal de identidade. Não usar pra tabela/dropdown, que já distinguem
 * por texto.
 */
export function groupForChart(items: CategoryTotal[]): CategoryTotal[] {
  const result: CategoryTotal[] = [];
  let otherTotal = 0;
  let otherCount = 0;
  let hasOther = false;

  for (const item of items) {
    if (FOLD_INTO_OTHER.includes(item.category)) {
      otherTotal += item.total;
      otherCount += item.count;
      hasOther = true;
    } else {
      result.push(item);
    }
  }
  if (hasOther) result.push({ category: "other", total: otherTotal, count: otherCount });

  return result.sort((a, b) => b.total - a.total);
}

export { CATEGORIES };
