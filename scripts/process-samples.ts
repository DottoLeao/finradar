import { readFileSync } from "fs";
import { join } from "path";
import { parseStatement } from "@/lib/parsers/normalize";
import { categorizeTransactions, type CategorizedTransaction } from "@/lib/categorize";
import { buildAggregates } from "@/lib/aggregate";

const SAMPLE_DIR = join(process.cwd(), "data", "sample");
const FILES = ["commbank-sample.csv", "wise-sample.csv"];

function processFile(filename: string): CategorizedTransaction[] {
  const csvText = readFileSync(join(SAMPLE_DIR, filename), "utf-8");
  const parsed = parseStatement(filename, csvText);
  const { transactions, ruleCount, uncategorizedCount } = categorizeTransactions(parsed.transactions);

  console.log(`\n=== ${filename} (${parsed.sourceBank}) ===`);
  console.log(`${transactions.length} transações — ${ruleCount} por regra, ${uncategorizedCount} sem categoria`);

  const aggregates = buildAggregates(transactions);
  console.table(aggregates.byCategory);
  console.log(`Total gasto: ${aggregates.totalSpent.toFixed(2)} | Câmbio: ${aggregates.totalExchange.toFixed(2)}`);

  return transactions;
}

function main() {
  const allTransactions: CategorizedTransaction[] = [];
  for (const file of FILES) {
    allTransactions.push(...processFile(file));
  }

  console.log("\n=== Consolidado (todos os arquivos) ===");
  const consolidated = buildAggregates(allTransactions);
  console.table(consolidated.byCategory);
  console.log(
    `Total gasto: ${consolidated.totalSpent.toFixed(2)} | Câmbio: ${consolidated.totalExchange.toFixed(2)} | Regra/sem categoria: ${consolidated.ruleCount}/${consolidated.uncategorizedCount}`
  );
  console.log("Top 5 transações:");
  console.table(consolidated.top5);
}

main();
