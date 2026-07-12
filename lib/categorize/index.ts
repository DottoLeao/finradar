import { applyRules, type Category } from "@/lib/categorize/rules";
import type { NormalizedTransaction } from "@/lib/parsers/types";

export interface CategorizedTransaction extends NormalizedTransaction {
  category: Category;
  categorySource: "rule" | "manual";
}

export interface CategorizeResult<T extends NormalizedTransaction> {
  transactions: (T & { category: Category; categorySource: "rule" | "manual" })[];
  ruleCount: number;
  uncategorizedCount: number;
}

/**
 * Categorização por regras (heurística de palavras-chave). O que não bate
 * com nenhuma regra vira "uncategorized" — fica pendente de revisão manual
 * pelo usuário no dashboard, em vez de fallback de IA.
 */
export function categorizeTransactions<T extends NormalizedTransaction>(
  txs: T[]
): CategorizeResult<T> {
  const transactions = txs.map((tx) => {
    const category = applyRules(tx.description, tx.merchant);
    return { ...tx, category, categorySource: "rule" as const };
  });

  const ruleCount = transactions.filter((t) => t.category !== "uncategorized").length;
  const uncategorizedCount = transactions.length - ruleCount;

  return { transactions, ruleCount, uncategorizedCount };
}
