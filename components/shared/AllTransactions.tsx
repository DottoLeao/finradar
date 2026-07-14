"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORIES, type Category } from "@/lib/categorize/rules";
import { categoryColor } from "@/lib/chart-colors";
import { formatCurrency, formatDate } from "@/lib/format";
import { getFormatters } from "@/lib/i18n/formatters";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { AiCategorizeSuggestions } from "@/components/shared/AiCategorizeSuggestions";
import type { AiSuggestion } from "@/lib/ai-local/types";

const ASSIGNABLE_CATEGORIES = CATEGORIES.filter((c) => c !== "uncategorized");

export interface TransactionRow {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  category: Category;
  categorySource: "rule" | "manual";
  amount: number;
  direction: "credit" | "debit";
  isExchange: boolean;
}

export function AllTransactions({
  items,
  currency,
  locale,
  dict,
}: {
  items: TransactionRow[];
  currency: string;
  locale: Locale;
  dict: Dictionary;
}) {
  const router = useRouter();
  const f = getFormatters(locale);
  const [rows, setRows] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AiSuggestion>>({});
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");

  // `silent` deixa o acceptAll suprimir o toast por linha e mostrar um só
  // resumo. Retorna se deu certo, pra quem chama poder contar os sucessos.
  async function handleCategoryChange(id: string, category: unknown, silent = false): Promise<boolean> {
    setPendingId(id);
    const previous = rows.find((r) => r.id === id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, category: category as Category, categorySource: "manual" } : r)));
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error(`PATCH failed with ${res.status}`);
      if (!silent) toast.success(dict.toast.categoryUpdated);
      router.refresh();
      return true;
    } catch {
      // Reverte o update otimista pro estado anterior — sem isso a linha
      // ficava presa na categoria nova mesmo com o PATCH falhando.
      if (previous) {
        setRows((prev) => prev.map((r) => (r.id === id ? previous : r)));
      }
      if (!silent) toast.error(dict.toast.categoryUpdateFailed);
      return false;
    } finally {
      setPendingId(null);
    }
  }

  function handleAiSuggestions(suggestions: AiSuggestion[]) {
    setAiSuggestions((prev) => {
      const next = { ...prev };
      for (const s of suggestions) next[s.id] = s;
      return next;
    });
  }

  function dismissSuggestion(id: string) {
    setAiSuggestions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function acceptSuggestion(id: string, category: Category) {
    dismissSuggestion(id);
    await handleCategoryChange(id, category);
  }

  async function acceptAllSuggestions() {
    const entries = Object.values(aiSuggestions);
    setAiSuggestions({});
    const results = await Promise.all(entries.map((s) => handleCategoryChange(s.id, s.category, true)));
    const applied = results.filter(Boolean).length;
    if (applied > 0) toast.success(f.toast.suggestionsApplied(applied));
    if (applied < entries.length) toast.error(dict.toast.categoryUpdateFailed);
  }

  const uncategorizedItems = rows
    .filter((r) => r.category === "uncategorized")
    .map((r) => ({ id: r.id, description: r.description, merchant: r.merchant }));
  const suggestionCount = Object.keys(aiSuggestions).length;

  const query = search.trim().toLowerCase();
  const filteredRows = rows.filter((tx) => {
    if (categoryFilter !== "all" && tx.category !== categoryFilter) return false;
    if (query && !tx.description.toLowerCase().includes(query) && !tx.merchant?.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>{dict.table.allTransactions}</CardTitle>
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <AiCategorizeSuggestions
            items={uncategorizedItems}
            dict={dict}
            locale={locale}
            onSuggestions={handleAiSuggestions}
          />
          {suggestionCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={acceptAllSuggestions}>
              {dict.aiCategorize.acceptAll}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as Category | "all")}>
            <SelectTrigger size="sm" className="w-full sm:w-44">
              <SelectValue>{categoryFilter === "all" ? dict.table.allCategories : dict.categories[categoryFilter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{dict.table.allCategories}</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {dict.categories[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.table.searchPlaceholder}
            className="w-full sm:w-56"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {dict.table.noResults}
                </TableCell>
              </TableRow>
            ) : null}
            {filteredRows.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">{formatDate(tx.date, locale)}</TableCell>
                <TableCell className="max-w-80 truncate print:max-w-none print:whitespace-normal" title={tx.description}>
                  {tx.description}
                </TableCell>
                <TableCell>
                  <span className="hidden print:inline">{dict.categories[tx.category]}</span>
                  <Select
                    value={tx.category}
                    onValueChange={(value) => handleCategoryChange(tx.id, value)}
                    disabled={pendingId === tx.id}
                  >
                    <SelectTrigger size="sm" className="min-w-40 print:hidden">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColor(tx.category) }}
                      />
                      <SelectValue>{dict.categories[tx.category]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {dict.categories[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tx.category === "uncategorized" ? (
                    <Badge variant="destructive" className="ml-2 align-middle">
                      {dict.categories.uncategorized}
                    </Badge>
                  ) : tx.categorySource === "manual" ? (
                    <Badge variant="outline" className="ml-2 align-middle">
                      {dict.table.markManual}
                    </Badge>
                  ) : null}
                  {tx.category === "uncategorized" && aiSuggestions[tx.id] ? (
                    <Badge variant="secondary" className="ml-2 gap-1 align-middle print:hidden">
                      {dict.categories[aiSuggestions[tx.id].category]}
                      <button
                        type="button"
                        aria-label={dict.aiCategorize.accept}
                        onClick={() => acceptSuggestion(tx.id, aiSuggestions[tx.id].category)}
                        className="rounded-full hover:bg-foreground/10"
                      >
                        <Check className="size-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={dict.aiCategorize.dismiss}
                        onClick={() => dismissSuggestion(tx.id)}
                        className="rounded-full hover:bg-foreground/10"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(Math.abs(tx.amount), currency, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
