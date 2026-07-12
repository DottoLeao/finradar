"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryColor } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/format";
import type { CategoryTotal } from "@/lib/aggregate";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";

export function CategoryChart({
  data,
  currency,
  locale,
  dict,
}: {
  data: CategoryTotal[];
  currency: string;
  locale: Locale;
  dict: Dictionary;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.charts.byCategory}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{dict.charts.noSpendData}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.charts.byCategory}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.category} fill={categoryColor(entry.category)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
              }}
              formatter={(value, _name, entry) => {
                const payload = entry.payload as unknown as CategoryTotal;
                const label = payload?.category ? dict.categories[payload.category] : String(_name);
                return [`${formatCurrency(Number(value), currency, locale)} · ${payload?.count}`, label];
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(_value, entry) => {
                const category = (entry.payload as unknown as CategoryTotal)?.category;
                return <span className="text-sm text-foreground">{category ? dict.categories[category] : ""}</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
