import type { NormalizedTransaction } from "@/lib/parsers/types";

function cleanField(value: string | undefined): string {
  return (value ?? "").trim().replace(/^"|"$/g, "").trim();
}

function ddmmyyyyToIso(value: string): string {
  const clean = cleanField(value);
  const [day, month, year] = clean.split(/[-/]/);
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function buildHeaderIndex(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((col, idx) => map.set(cleanField(col).toLowerCase(), idx));
  return map;
}

/** Formato Wise: header completo (23 colunas), datas dd-mm-yyyy. */
export function parseWise(rows: string[][], header: string[]): NormalizedTransaction[] {
  const idx = buildHeaderIndex(header);
  const col = (name: string) => idx.get(name.toLowerCase());

  const dateIdx = col("date")!;
  const amountIdx = col("amount")!;
  const currencyIdx = col("currency");
  const descriptionIdx = col("description")!;
  const merchantIdx = col("merchant");
  const transactionTypeIdx = col("transaction type")!;
  const detailsTypeIdx = col("transaction details type")!;

  // A primeira linha é o header — as transações começam na segunda.
  return rows.slice(1).map((row) => {
    const amount = Number(cleanField(row[amountIdx]));
    const direction = cleanField(row[transactionTypeIdx]).toLowerCase() === "credit"
      ? "credit"
      : "debit";
    const detailsType = cleanField(row[detailsTypeIdx]).toUpperCase();
    const merchant = merchantIdx !== undefined ? cleanField(row[merchantIdx]) || undefined : undefined;
    const description = cleanField(row[descriptionIdx]) || merchant || "";

    const raw: Record<string, unknown> = {};
    header.forEach((colName, i) => {
      raw[cleanField(colName)] = row[i];
    });

    const currency = (currencyIdx !== undefined ? cleanField(row[currencyIdx]) : "") || "AUD";

    return {
      date: ddmmyyyyToIso(row[dateIdx]),
      amount,
      currency,
      description,
      merchant,
      direction: direction as "credit" | "debit",
      sourceBank: "wise",
      isExchange: detailsType === "CONVERSION",
      raw,
    };
  });
}
