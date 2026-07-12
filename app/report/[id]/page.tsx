import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatCards } from "@/components/shared/StatCards";
import { CategoryChart } from "@/components/shared/CategoryChart";
import { TimeSeriesChart } from "@/components/shared/TimeSeriesChart";
import { TopTransactions } from "@/components/shared/TopTransactions";
import { AllTransactions, type TransactionRow } from "@/components/shared/AllTransactions";
import { CurrencySelector } from "@/components/shared/CurrencySelector";
import { ExecutiveSummary } from "@/components/shared/ExecutiveSummary";
import { DuplicateBanner } from "@/components/shared/DuplicateBanner";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAggregates, type CategoryTotal } from "@/lib/aggregate";
import { groupForChart } from "@/lib/chart-colors";
import { buildSummary } from "@/lib/summary/build-summary";
import { convertTransactions } from "@/lib/currency/convert";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Category } from "@/lib/categorize/rules";
import type { SourceBank } from "@/lib/parsers/types";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ currency?: string; duplicates?: string }>;
}) {
  const { id } = await params;
  const { currency: targetCurrency = "AUD", duplicates } = await searchParams;
  const duplicatesSkipped = Number(duplicates ?? 0) || 0;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const admin = createAdminClient();

  const { data: report } = await admin.from("reports").select("id, statement_ids").eq("id", id).single();
  if (!report) notFound();

  const [{ data: statements }, { data: txRows }] = await Promise.all([
    admin.from("statements").select("id, source_bank").in("id", report.statement_ids),
    admin.from("transactions").select("*").in("statement_id", report.statement_ids).order("date"),
  ]);

  const bankByStatement = new Map((statements ?? []).map((s) => [s.id, (s.source_bank ?? "generic") as SourceBank]));

  const withOriginals = (txRows ?? []).map((row) => {
    const sourceBank = bankByStatement.get(row.statement_id) ?? ("generic" as SourceBank);
    const raw = (row.raw ?? {}) as Record<string, unknown>;
    const rawMerchant = sourceBank === "wise" ? raw.Merchant : undefined;
    const merchant = typeof rawMerchant === "string" ? rawMerchant.trim().replace(/^"|"$/g, "").trim() || undefined : undefined;

    return {
      id: row.id,
      date: row.date,
      amount: row.amount,
      currency: row.currency,
      description: row.description ?? "",
      merchant,
      direction: row.direction,
      sourceBank,
      isExchange: row.is_exchange,
      raw,
      category: (row.category ?? "uncategorized") as Category,
      categorySource: (row.category_source ?? "rule") as "rule" | "manual",
    };
  });

  const converted = await convertTransactions(withOriginals, targetCurrency);
  const aggregates = buildAggregates(converted);
  const insights = buildSummary(aggregates);

  const transactionRows: TransactionRow[] = converted.map((tx) => ({
    id: tx.id,
    date: tx.date,
    description: tx.description,
    merchant: tx.merchant,
    category: tx.category,
    categorySource: tx.categorySource,
    amount: tx.amount,
    direction: tx.direction,
    isExchange: tx.isExchange,
  }));

  const byCategory: CategoryTotal[] = groupForChart(aggregates.byCategory);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} dict={dict} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <DuplicateBanner count={duplicatesSkipped} locale={locale} />
        <div className="flex justify-end">
          <CurrencySelector currency={targetCurrency} label={dict.currency.label} />
        </div>
        <StatCards aggregates={aggregates} currency={targetCurrency} locale={locale} dict={dict} />
        <ExecutiveSummary insights={insights} currency={targetCurrency} locale={locale} dict={dict} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CategoryChart data={byCategory} currency={targetCurrency} locale={locale} dict={dict} />
          <TimeSeriesChart data={aggregates.byPeriod} currency={targetCurrency} locale={locale} dict={dict} />
        </div>
        <TopTransactions items={aggregates.top5} currency={targetCurrency} locale={locale} dict={dict} />
        <AllTransactions items={transactionRows} currency={targetCurrency} locale={locale} dict={dict} />
      </main>
    </div>
  );
}
