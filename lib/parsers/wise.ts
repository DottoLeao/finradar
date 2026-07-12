import type { NormalizedTransaction } from "@/lib/parsers/types";

function cleanField(value: string | undefined): string {
  return (value ?? "").trim().replace(/^"|"$/g, "").trim();
}

function buildHeaderIndex(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((col, idx) => map.set(cleanField(col).toLowerCase(), idx));
  return map;
}

function parseDdmmyyyyToIso(value: string | undefined): string | null {
  const clean = cleanField(value);
  const parts = clean.split(/[-/]/);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (year.length !== 4 || !day || !month) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Formato Wise: header completo (23 colunas), datas dd-mm-yyyy. Linhas sem
 * data/valor válidos são puladas — não derrubam o arquivo inteiro.
 */
export function parseWise(rows: string[][], header: string[]): NormalizedTransaction[] {
  const idx = buildHeaderIndex(header);
  const col = (name: string) => idx.get(name.toLowerCase());

  const dateIdx = col("date");
  const amountIdx = col("amount");
  const currencyIdx = col("currency");
  const descriptionIdx = col("description");
  const merchantIdx = col("merchant");
  const transactionTypeIdx = col("transaction type");
  const detailsTypeIdx = col("transaction details type");

  if (dateIdx === undefined || amountIdx === undefined) {
    throw new Error("Header do Wise sem coluna Date/Amount reconhecível.");
  }

  const result: NormalizedTransaction[] = [];

  // A primeira linha é o header — as transações começam na segunda.
  for (const row of rows.slice(1)) {
    const isoDate = parseDdmmyyyyToIso(row[dateIdx]);
    const amount = Number(cleanField(row[amountIdx]));

    if (!isoDate || Number.isNaN(amount)) {
      console.warn("Linha ignorada (data/valor inválido) no formato Wise:", row);
      continue;
    }

    const direction =
      transactionTypeIdx !== undefined && cleanField(row[transactionTypeIdx]).toLowerCase() === "credit"
        ? "credit"
        : "debit";
    const detailsType = detailsTypeIdx !== undefined ? cleanField(row[detailsTypeIdx]).toUpperCase() : "";
    const merchant = merchantIdx !== undefined ? cleanField(row[merchantIdx]) || undefined : undefined;
    const description = (descriptionIdx !== undefined ? cleanField(row[descriptionIdx]) : "") || merchant || "";

    const raw: Record<string, unknown> = {};
    header.forEach((colName, i) => {
      raw[cleanField(colName)] = row[i];
    });

    const currency = (currencyIdx !== undefined ? cleanField(row[currencyIdx]) : "") || "AUD";

    result.push({
      date: isoDate,
      amount,
      currency,
      description,
      merchant,
      direction,
      sourceBank: "wise",
      isExchange: detailsType === "CONVERSION",
      raw,
    });
  }

  return result;
}
