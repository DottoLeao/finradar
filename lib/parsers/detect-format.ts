import { UnsupportedFormatError } from "@/lib/parsers/types";

export type FormatDetectionResult =
  | { format: "commbank" }
  | { format: "wise"; header: string[] }
  | {
      format: "generic";
      header: string[];
      columnMap: { date: number; amount: number; description: number };
    };

function normalizeCell(cell: string): string {
  return cell.trim().replace(/^"|"$/g, "").toLowerCase();
}

const DATE_DDMMYYYY = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

/**
 * Heurística de detecção de formato (sem IA), na ordem do PRD §4:
 * 1. Header contém "TransferWise ID" ou "Transaction Details Type" → wise.
 * 2. Sem header, 4 colunas, coluna 0 casa dd/mm/yyyy → commbank.
 * 3. Header com colunas date/amount/description (case-insensitive) → generic.
 * 4. Senão, erro amigável.
 */
export function detectFormat(rows: string[][]): FormatDetectionResult {
  if (rows.length === 0) {
    throw new UnsupportedFormatError("O arquivo CSV está vazio.");
  }

  const firstRow = rows[0].map(normalizeCell);

  if (
    firstRow.includes("transferwise id") ||
    firstRow.includes("transaction details type")
  ) {
    return { format: "wise", header: rows[0] };
  }

  if (rows[0].length === 4 && DATE_DDMMYYYY.test(rows[0][0].trim())) {
    return { format: "commbank" };
  }

  const dateIdx = firstRow.findIndex((c) => /date/.test(c));
  const amountIdx = firstRow.findIndex((c) => /amount|value/.test(c));
  const descriptionIdx = firstRow.findIndex((c) => /description|desc/.test(c));

  if (dateIdx !== -1 && amountIdx !== -1 && descriptionIdx !== -1) {
    return {
      format: "generic",
      header: rows[0],
      columnMap: { date: dateIdx, amount: amountIdx, description: descriptionIdx },
    };
  }

  throw new UnsupportedFormatError(
    "CSV não corresponde a nenhum formato suportado (CommBank, Wise, ou genérico com colunas date/amount/description)."
  );
}
