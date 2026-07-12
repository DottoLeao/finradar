import type { ReportAggregates } from "@/lib/aggregate";
import type { Category } from "@/lib/categorize/rules";

export type Insight =
  | { type: "topCategory"; category: Category; amount: number; percent: number }
  | {
      type: "trend";
      direction: "up" | "down" | "flat";
      firstPeriod: string;
      lastPeriod: string;
      firstTotal: number;
      lastTotal: number;
      percentChange: number;
    }
  | { type: "biggestTransaction"; description: string; amount: number; date: string; category: Category }
  | { type: "uncategorizedCount"; count: number };

/**
 * Resumo executivo determinístico: gera de 3 a 5 insights a partir dos
 * agregados, sem chamada de rede nem custo. A tradução pro texto final
 * fica no componente que renderiza (precisa do locale + formatCurrency).
 */
export function buildSummary(aggregates: ReportAggregates): Insight[] {
  const insights: Insight[] = [];

  const topCategory = aggregates.byCategory[0];
  if (topCategory && aggregates.totalSpent > 0) {
    insights.push({
      type: "topCategory",
      category: topCategory.category,
      amount: topCategory.total,
      percent: (topCategory.total / aggregates.totalSpent) * 100,
    });
  }

  if (aggregates.byPeriod.length >= 2) {
    const first = aggregates.byPeriod[0];
    const last = aggregates.byPeriod[aggregates.byPeriod.length - 1];
    const percentChange = first.total > 0 ? ((last.total - first.total) / first.total) * 100 : 0;
    const direction = percentChange > 5 ? "up" : percentChange < -5 ? "down" : "flat";
    insights.push({
      type: "trend",
      direction,
      firstPeriod: first.period,
      lastPeriod: last.period,
      firstTotal: first.total,
      lastTotal: last.total,
      percentChange,
    });
  }

  const biggest = aggregates.top5[0];
  if (biggest) {
    insights.push({
      type: "biggestTransaction",
      description: biggest.description,
      amount: biggest.amount,
      date: biggest.date,
      category: biggest.category,
    });
  }

  if (aggregates.uncategorizedCount > 0) {
    insights.push({ type: "uncategorizedCount", count: aggregates.uncategorizedCount });
  }

  return insights.slice(0, 5);
}
