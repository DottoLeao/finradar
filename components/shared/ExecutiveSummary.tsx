import { Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Insight } from "@/lib/summary/build-summary";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { getFormatters } from "@/lib/i18n/formatters";

function renderInsight(insight: Insight, currency: string, locale: Locale, dict: Dictionary): string {
  const f = getFormatters(locale);
  switch (insight.type) {
    case "topCategory":
      return f.summary.topCategory(
        dict.categories[insight.category],
        insight.percent.toFixed(1),
        formatCurrency(insight.amount, currency, locale)
      );
    case "trend": {
      const first = formatCurrency(insight.firstTotal, currency, locale);
      const last = formatCurrency(insight.lastTotal, currency, locale);
      if (insight.direction === "flat") {
        return f.summary.trendFlat(insight.firstPeriod, insight.lastPeriod);
      }
      const percent = Math.abs(insight.percentChange).toFixed(1);
      return insight.direction === "up"
        ? f.summary.trendUp(percent, insight.firstPeriod, first, insight.lastPeriod, last)
        : f.summary.trendDown(percent, insight.firstPeriod, first, insight.lastPeriod, last);
    }
    case "biggestTransaction":
      return f.summary.biggestTransaction(
        insight.description,
        formatCurrency(insight.amount, currency, locale),
        formatDate(insight.date, locale)
      );
    case "uncategorizedCount":
      return f.summary.uncategorizedCount(insight.count);
  }
}

export function ExecutiveSummary({
  insights,
  currency,
  locale,
  dict,
}: {
  insights: Insight[];
  currency: string;
  locale: Locale;
  dict: Dictionary;
}) {
  if (insights.length === 0) return null;

  return (
    <Alert>
      <Sparkles />
      <AlertTitle>{dict.summary.title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4">
          {insights.map((insight, i) => (
            <li key={i}>{renderInsight(insight, currency, locale, dict)}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
