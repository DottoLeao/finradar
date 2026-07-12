import Papa from "papaparse";

/**
 * Parseia CSV pra matriz de strings. Usa papaparse (não split(',')) porque
 * a descrição do CommBank pode conter vírgulas dentro de aspas.
 */
export function parseCsvRows(rawText: string): string[][] {
  const result = Papa.parse<string[]>(rawText, { skipEmptyLines: true });
  return result.data;
}
