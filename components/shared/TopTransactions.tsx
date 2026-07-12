import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryColor } from "@/lib/chart-colors";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TopTransaction } from "@/lib/aggregate";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";

export function TopTransactions({
  items,
  currency,
  locale,
  dict,
}: {
  items: TopTransaction[];
  currency: string;
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.table.topTransactions}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.table.date}</TableHead>
              <TableHead>{dict.table.description}</TableHead>
              <TableHead>{dict.table.category}</TableHead>
              <TableHead className="text-right">{dict.table.amount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((tx, i) => (
              <TableRow key={`${tx.date}-${i}`}>
                <TableCell className="text-muted-foreground">{formatDate(tx.date, locale)}</TableCell>
                <TableCell className="max-w-64 truncate" title={tx.description}>
                  {tx.description}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="gap-1.5"
                    style={{ borderColor: categoryColor(tx.category) }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: categoryColor(tx.category) }}
                    />
                    {dict.categories[tx.category]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(tx.amount, currency, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
