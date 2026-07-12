import type { NormalizedTransaction } from "@/lib/parsers/types";

function cleanField(value: string): string {
  return value.trim().replace(/^"|"$/g, "").trim();
}

function ddmmyyyyToIso(value: string): string {
  const [day, month, year] = cleanField(value).split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Formato CommBank (AU): sem header, 4 colunas —
 * data (dd/mm/yyyy), valor sinalizado ("+"/"-"), descrição, saldo após transação.
 */
export function parseCommBank(rows: string[][]): NormalizedTransaction[] {
  return rows.map((row) => {
    const [rawDate, rawAmount, rawDescription] = row;
    const amount = Number(cleanField(rawAmount));

    return {
      date: ddmmyyyyToIso(rawDate),
      amount,
      currency: "AUD",
      description: cleanField(rawDescription),
      direction: amount < 0 ? "debit" : "credit",
      sourceBank: "commbank",
      isExchange: false,
      raw: { date: rawDate, amount: rawAmount, description: rawDescription, balance: row[3] },
    };
  });
}
