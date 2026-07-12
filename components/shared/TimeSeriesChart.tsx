"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { PeriodTotal } from "@/lib/aggregate";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";

export function TimeSeriesChart({
  data,
  currency,
  locale,
  dict,
}: {
  data: PeriodTotal[];
  currency: string;
  locale: Locale;
  dict: Dictionary;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.charts.overTime}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{dict.charts.noSpendData}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.charts.overTime}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
              }}
              formatter={(value) => [formatCurrency(Number(value), currency, locale), ""]}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
