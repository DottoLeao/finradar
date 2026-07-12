export type SourceBank = "commbank" | "wise" | "generic";

export interface NormalizedTransaction {
  date: string; // ISO yyyy-mm-dd
  amount: number; // signed
  currency: string; // ISO 4217, ex: "AUD"
  description: string;
  merchant?: string; // Wise-only: coluna "Merchant" limpa, separada da Description mais ruidosa
  direction: "credit" | "debit";
  sourceBank: SourceBank;
  isExchange: boolean; // true apenas para linhas CONVERSION do Wise
  raw: Record<string, unknown>;
}

export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFormatError";
  }
}
