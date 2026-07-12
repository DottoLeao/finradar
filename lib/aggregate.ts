import type { CategorizedTransaction } from "@/lib/categorize";
import type { Category } from "@/lib/categorize/rules";
import type { SourceBank } from "@/lib/parsers/types";

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
}

export interface PeriodTotal {
  period: string; // "YYYY-MM" (mensal) ou "YYYY-Www" (semanal)
  total: number;
}

export interface TopTransaction {
  date: string;
  description: string;
  amount: number;
  category: Category;
  sourceBank: SourceBank;
}

export interface ReportAggregates {
  totalSpent: number;
  totalExchange: number;
  totalCredit: number;
  transactionCount: number;
  byCategory: CategoryTotal[];
  byPeriod: PeriodTotal[];
  top5: TopTransaction[];
  ruleCount: number;
  manualCount: number;
  uncategorizedCount: number;
  dateRange: { from: string; to: string };
  sourceBanks: SourceBank[];
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Agrega transações categorizadas em dados prontos pro dashboard. Pura, sem I/O. */
export function buildAggregates(txs: CategorizedTransaction[]): ReportAggregates {
  const spend = txs.filter((t) => t.direction === "debit" && !t.isExchange);
  const exchange = txs.filter((t) => t.isExchange);
  const credit = txs.filter((t) => t.direction === "credit" && !t.isExchange);

  const totalSpent = spend.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalExchange = exchange.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalCredit = credit.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const byCategoryMap = new Map<Category, CategoryTotal>();
  for (const t of spend) {
    const entry = byCategoryMap.get(t.category) ?? { category: t.category, total: 0, count: 0 };
    entry.total += Math.abs(t.amount);
    entry.count += 1;
    byCategoryMap.set(t.category, entry);
  }
  const byCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.total - a.total);

  const dates = txs.map((t) => t.date).sort();
  const from = dates[0] ?? "";
  const to = dates[dates.length - 1] ?? "";
  const spanDays =
    from && to ? (new Date(to).getTime() - new Date(from).getTime()) / 86400000 : 0;
  const useMonthly = spanDays > 45;

  const byPeriodMap = new Map<string, number>();
  for (const t of spend) {
    const d = new Date(t.date);
    const period = useMonthly
      ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      : isoWeek(d);
    byPeriodMap.set(period, (byPeriodMap.get(period) ?? 0) + Math.abs(t.amount));
  }
  const byPeriod = Array.from(byPeriodMap.entries())
    .map(([period, total]) => ({ period, total }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const top5: TopTransaction[] = [...spend]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5)
    .map((t) => ({
      date: t.date,
      description: t.description,
      amount: Math.abs(t.amount),
      category: t.category,
      sourceBank: t.sourceBank,
    }));

  const uncategorizedCount = txs.filter((t) => t.category === "uncategorized").length;
  const manualCount = txs.filter((t) => t.categorySource === "manual").length;
  const ruleCount = txs.length - manualCount - uncategorizedCount;

  const sourceBanks = Array.from(new Set(txs.map((t) => t.sourceBank)));

  return {
    totalSpent,
    totalExchange,
    totalCredit,
    transactionCount: txs.length,
    byCategory,
    byPeriod,
    top5,
    ruleCount,
    manualCount,
    uncategorizedCount,
    dateRange: { from, to },
    sourceBanks,
  };
}
