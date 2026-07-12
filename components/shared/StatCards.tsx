import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReportAggregates } from "@/lib/aggregate";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { getFormatters } from "@/lib/i18n/formatters";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function StatCards({
  aggregates,
  currency,
  locale,
  dict,
}: {
  aggregates: ReportAggregates;
  currency: string;
  locale: Locale;
  dict: Dictionary;
}) {
  const period =
    aggregates.dateRange.from && aggregates.dateRange.to
      ? `${formatDate(aggregates.dateRange.from, locale)} – ${formatDate(aggregates.dateRange.to, locale)}`
      : "—";
  const f = getFormatters(locale);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={dict.stats.totalSpent} value={formatCurrency(aggregates.totalSpent, currency, locale)} />
      <StatCard
        label={dict.stats.totalExchange}
        value={formatCurrency(aggregates.totalExchange, currency, locale)}
      />
      <StatCard
        label={dict.stats.transactions}
        value={String(aggregates.transactionCount)}
        hint={f.stats.transactionsHint(
          aggregates.ruleCount,
          aggregates.manualCount,
          aggregates.uncategorizedCount
        )}
      />
      <StatCard label={dict.stats.period} value={period} />
    </div>
  );
}
