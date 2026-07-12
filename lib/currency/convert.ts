import { getHistoricalRate } from "@/lib/currency/frankfurter";

export interface Convertible {
  date: string;
  amount: number;
  currency: string;
}

export type Converted<T extends Convertible> = T & {
  originalAmount: number;
  originalCurrency: string;
};

/**
 * Converte uma lista de transações pra uma moeda alvo, usando a taxa
 * histórica da data de cada transação. Busca só os pares únicos
 * (data, moeda de origem) — uma transação por par, não uma chamada por
 * transação.
 */
export async function convertTransactions<T extends Convertible>(
  txs: T[],
  targetCurrency: string
): Promise<Converted<T>[]> {
  const uniquePairs = new Map<string, { date: string; currency: string }>();
  for (const tx of txs) {
    if (tx.currency === targetCurrency) continue;
    uniquePairs.set(`${tx.date}|${tx.currency}`, { date: tx.date, currency: tx.currency });
  }

  const rateEntries = await Promise.all(
    Array.from(uniquePairs.entries()).map(async ([key, { date, currency }]) => {
      const rate = await getHistoricalRate(date, currency, targetCurrency);
      return [key, rate] as const;
    })
  );
  const rates = new Map(rateEntries);

  return txs.map((tx) => {
    if (tx.currency === targetCurrency) {
      return { ...tx, originalAmount: tx.amount, originalCurrency: tx.currency };
    }
    const rate = rates.get(`${tx.date}|${tx.currency}`) ?? 1;
    return {
      ...tx,
      amount: tx.amount * rate,
      currency: targetCurrency,
      originalAmount: tx.amount,
      originalCurrency: tx.currency,
    };
  });
}
