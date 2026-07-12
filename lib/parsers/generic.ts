import type { NormalizedTransaction } from "@/lib/parsers/types";

function cleanField(value: string | undefined): string {
  return (value ?? "").trim().replace(/^"|"$/g, "").trim();
}

function parseDate(value: string): string | null {
  const clean = cleanField(value);
  // Aceita dd/mm/yyyy, dd-mm-yyyy ou yyyy-mm-dd.
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(clean)) return clean;

  const dmy = clean.split(/[-/]/);
  if (dmy.length === 3) {
    const [day, month, year] = dmy;
    if (year.length === 4) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return null;
}

/**
 * Fallback genérico: header com colunas date/amount/description detectadas
 * por nome. Linhas malformadas são puladas (não derrubam o upload inteiro).
 */
export function parseGeneric(
  rows: string[][],
  columnMap: { date: number; amount: number; description: number }
): NormalizedTransaction[] {
  const result: NormalizedTransaction[] = [];

  for (const row of rows.slice(1)) {
    const date = parseDate(row[columnMap.date]);
    const amount = Number(cleanField(row[columnMap.amount]));

    if (!date || Number.isNaN(amount)) {
      console.warn("Linha ignorada (data/valor inválido) no formato genérico:", row);
      continue;
    }

    result.push({
      date,
      amount,
      currency: "AUD",
      description: cleanField(row[columnMap.description]),
      direction: amount < 0 ? "debit" : "credit",
      sourceBank: "generic",
      isExchange: false,
      raw: Object.fromEntries(row.map((v, i) => [`col${i}`, v])),
    });
  }

  return result;
}
