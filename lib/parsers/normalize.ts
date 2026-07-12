import { parseCsvRows } from "@/lib/parsers/csv";
import { detectFormat } from "@/lib/parsers/detect-format";
import { parseCommBank } from "@/lib/parsers/commbank";
import { parseWise } from "@/lib/parsers/wise";
import { parseGeneric } from "@/lib/parsers/generic";
import type { NormalizedTransaction, SourceBank } from "@/lib/parsers/types";

export interface ParsedStatement {
  filename: string;
  sourceBank: SourceBank;
  transactions: NormalizedTransaction[];
}

/**
 * Chave pra detectar a mesma transação real repetida em arquivos diferentes
 * (extratos com período sobreposto). Não usa `merchant` (só existe pro Wise)
 * nem `statementId` (duplicata por definição vem de arquivos diferentes).
 */
export function buildDedupKey(tx: NormalizedTransaction): string {
  const normalizedDescription = tx.description.trim().toLowerCase().replace(/\s+/g, " ");
  return `${tx.date}|${tx.amount.toFixed(2)}|${tx.currency}|${tx.direction}|${normalizedDescription}`;
}

/**
 * Ponto de entrada único do parsing: detecta formato e despacha pro parser
 * correto. Usado tanto pela rota de upload quanto pelo script de verificação.
 * Lança UnsupportedFormatError se o CSV não bater com nenhum formato conhecido.
 */
export function parseStatement(filename: string, csvText: string): ParsedStatement {
  const rows = parseCsvRows(csvText);
  const detection = detectFormat(rows);

  let transactions: NormalizedTransaction[];

  switch (detection.format) {
    case "commbank":
      transactions = parseCommBank(rows);
      break;
    case "wise":
      transactions = parseWise(rows, detection.header);
      break;
    case "generic":
      transactions = parseGeneric(rows, detection.columnMap);
      break;
  }

  return { filename, sourceBank: detection.format, transactions };
}
