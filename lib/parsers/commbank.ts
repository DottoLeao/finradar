import type { NormalizedTransaction } from "@/lib/parsers/types";

function cleanField(value: string): string {
  return value.trim().replace(/^"|"$/g, "").trim();
}

function ddmmyyyyToIso(value: string): string {
  const [day, month, year] = cleanField(value).split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const DATE_DDMMYYYY = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

/**
 * Formato CommBank (AU): sem header, 4 colunas —
 * data (dd/mm/yyyy), valor sinalizado ("+"/"-"), descrição, saldo após transação.
 * Linhas malformadas (resumo/rodapé, coluna faltando) são puladas — não
 * derrubam o arquivo inteiro nem a requisição.
 */
export function parseCommBank(rows: string[][]): NormalizedTransaction[] {
  const result: NormalizedTransaction[] = [];

  for (const row of rows) {
    const [rawDate, rawAmount, rawDescription] = row;
    const cleanDate = cleanField(rawDate);

    if (!rawDate || !rawAmount || !DATE_DDMMYYYY.test(cleanDate)) {
      console.warn("Linha ignorada (formato CommBank inesperado):", row);
      continue;
    }

    const amount = Number(cleanField(rawAmount));
    if (Number.isNaN(amount)) {
      console.warn("Linha ignorada (valor inválido) no formato CommBank:", row);
      continue;
    }

    result.push({
      date: ddmmyyyyToIso(rawDate),
      amount,
      currency: "AUD",
      description: cleanField(rawDescription),
      direction: amount < 0 ? "debit" : "credit",
      sourceBank: "commbank",
      isExchange: false,
      raw: { date: rawDate, amount: rawAmount, description: rawDescription, balance: row[3] },
    });
  }

  return result;
}
