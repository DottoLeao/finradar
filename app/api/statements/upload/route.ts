import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { parseStatement, buildDedupKey } from "@/lib/parsers/normalize";
import { UnsupportedFormatError, type NormalizedTransaction } from "@/lib/parsers/types";
import { categorizeTransactions } from "@/lib/categorize";
import { buildAggregates } from "@/lib/aggregate";
import { buildSummary } from "@/lib/summary/build-summary";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

const SAMPLE_DIR = join(process.cwd(), "data", "sample");
const SAMPLE_FILES = ["commbank-sample.csv", "wise-sample.csv"];

interface ParsedFile {
  filename: string;
  sourceBank: string;
  transactions: NormalizedTransaction[];
}

export async function POST(req: NextRequest) {
  const dict = getDictionary(await getLocale());
  const contentType = req.headers.get("content-type") ?? "";

  let filesToParse: { filename: string; text: string }[] = [];

  if (contentType.includes("application/json")) {
    const body = await req.json();
    if (body.useSample) {
      filesToParse = SAMPLE_FILES.map((filename) => ({
        filename,
        text: readFileSync(join(SAMPLE_DIR, filename), "utf-8"),
      }));
    }
  } else {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    filesToParse = await Promise.all(
      files.map(async (f) => ({ filename: f.name, text: await f.text() }))
    );
  }

  if (filesToParse.length === 0) {
    return NextResponse.json({ error: dict.errors.noFiles }, { status: 422 });
  }

  const parsed: ParsedFile[] = [];
  const skippedFiles: { filename: string; reason: string }[] = [];

  for (const { filename, text } of filesToParse) {
    try {
      const result = parseStatement(filename, text);
      parsed.push(result);
    } catch (err) {
      if (err instanceof UnsupportedFormatError) {
        skippedFiles.push({ filename, reason: err.message });
      } else {
        // Erro inesperado de parsing (linha malformada que os parsers ainda
        // não previram, encoding estranho etc.) — nunca derruba a
        // requisição inteira; os outros arquivos do upload continuam.
        console.error(`Erro inesperado ao parsear ${filename}:`, err);
        skippedFiles.push({ filename, reason: dict.errors.unsupportedFormat });
      }
    }
  }

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: dict.errors.unsupportedFormat, skippedFiles },
      { status: 422 }
    );
  }

  const admin = createAdminClient();

  const statementIds: string[] = [];
  const taggedTransactions: (NormalizedTransaction & { statementId: string })[] = [];

  // Deduplica transações repetidas ENTRE arquivos diferentes deste upload
  // (extratos com período sobreposto) — nunca dentro do mesmo arquivo, onde
  // uma repetição pode ser uma transação real (ex: dois cafés iguais no
  // mesmo dia). `seenKeys` só recebe as chaves de um arquivo depois que ele
  // termina de ser processado, então as próprias linhas do arquivo nunca se
  // comparam entre si.
  const seenKeys = new Set<string>();
  let duplicatesSkipped = 0;

  for (const file of parsed) {
    const { data, error } = await admin
      .from("statements")
      .insert({ filename: file.filename, source_bank: file.sourceBank })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Falha ao salvar statement ${file.filename}: ${error?.message}`);
    }

    statementIds.push(data.id);
    const fileKeys = new Set<string>();
    for (const tx of file.transactions) {
      const key = buildDedupKey(tx);
      if (seenKeys.has(key)) {
        duplicatesSkipped++;
        continue;
      }
      taggedTransactions.push({ ...tx, statementId: data.id });
      fileKeys.add(key);
    }
    for (const key of fileKeys) seenKeys.add(key);
  }

  const { transactions: categorized } = categorizeTransactions(taggedTransactions);

  const { error: insertError } = await admin.from("transactions").insert(
    categorized.map((tx) => ({
      statement_id: tx.statementId,
      date: tx.date,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      direction: tx.direction,
      category: tx.category,
      category_source: tx.categorySource,
      is_exchange: tx.isExchange,
      raw: tx.raw,
    }))
  );

  if (insertError) {
    throw new Error(`Falha ao salvar transações: ${insertError.message}`);
  }

  // Snapshot histórico só pra referência — o dashboard (Fase D) recalcula ao
  // vivo a partir de `transactions`, então isto nunca é lido de volta pelo app.
  const aggregates = buildAggregates(categorized);
  const insights = buildSummary(aggregates);

  const { data: report, error: reportError } = await admin
    .from("reports")
    .insert({
      statement_ids: statementIds,
      category_summary: aggregates as unknown as Record<string, unknown>,
      ai_insights: { insights } as unknown as Record<string, unknown>,
    })
    .select()
    .single();

  if (reportError || !report) {
    throw new Error(`Falha ao salvar report: ${reportError?.message}`);
  }

  return NextResponse.json({ reportId: report.id, statementIds, skippedFiles, duplicatesSkipped });
}
