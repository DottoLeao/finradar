import type { Locale } from "@/lib/i18n/dictionaries";

const formatters = {
  en: {
    upload: {
      selected: (n: number) => `${n} file(s) selected`,
      duplicatesSkipped: (count: number) =>
        count === 1
          ? "1 duplicate transaction was skipped."
          : `${count} duplicate transactions were skipped.`,
    },
    stats: {
      transactionsHint: (rule: number, manual: number, uncategorized: number) =>
        `${rule} by rule, ${manual} manual, ${uncategorized} uncategorized`,
    },
    summary: {
      topCategory: (category: string, percent: string, amount: string) =>
        `${category} was your biggest spending category, at ${percent}% (${amount}) of the total.`,
      trendUp: (percent: string, first: string, firstAmount: string, last: string, lastAmount: string) =>
        `Spending rose ${percent}% from ${first} (${firstAmount}) to ${last} (${lastAmount}).`,
      trendDown: (percent: string, first: string, firstAmount: string, last: string, lastAmount: string) =>
        `Spending fell ${percent}% from ${first} (${firstAmount}) to ${last} (${lastAmount}).`,
      trendFlat: (first: string, last: string) => `Spending stayed roughly flat between ${first} and ${last}.`,
      biggestTransaction: (description: string, amount: string, date: string) =>
        `Your biggest transaction was "${description}" for ${amount} on ${date}.`,
      uncategorizedCount: (count: number) =>
        count === 1
          ? "1 transaction still needs manual categorization."
          : `${count} transactions still need manual categorization.`,
    },
    aiCategorize: {
      downloadProgress: (percent: number) => `Downloading local model… ${percent}%`,
      suggestionCount: (count: number) =>
        count === 1 ? "1 suggestion ready" : `${count} suggestions ready`,
    },
  },
  pt: {
    upload: {
      selected: (n: number) => `${n} arquivo(s) selecionado(s)`,
      duplicatesSkipped: (count: number) =>
        count === 1
          ? "1 transação duplicada foi ignorada."
          : `${count} transações duplicadas foram ignoradas.`,
    },
    stats: {
      transactionsHint: (rule: number, manual: number, uncategorized: number) =>
        `${rule} por regra, ${manual} manual, ${uncategorized} sem categoria`,
    },
    summary: {
      topCategory: (category: string, percent: string, amount: string) =>
        `${category} foi sua maior categoria de gasto, representando ${percent}% (${amount}) do total.`,
      trendUp: (percent: string, first: string, firstAmount: string, last: string, lastAmount: string) =>
        `O gasto subiu ${percent}% de ${first} (${firstAmount}) pra ${last} (${lastAmount}).`,
      trendDown: (percent: string, first: string, firstAmount: string, last: string, lastAmount: string) =>
        `O gasto caiu ${percent}% de ${first} (${firstAmount}) pra ${last} (${lastAmount}).`,
      trendFlat: (first: string, last: string) => `O gasto ficou estável entre ${first} e ${last}.`,
      biggestTransaction: (description: string, amount: string, date: string) =>
        `Sua maior transação foi "${description}", de ${amount}, em ${date}.`,
      uncategorizedCount: (count: number) =>
        count === 1
          ? "1 transação ainda precisa de categorização manual."
          : `${count} transações ainda precisam de categorização manual.`,
    },
    aiCategorize: {
      downloadProgress: (percent: number) => `Baixando modelo local… ${percent}%`,
      suggestionCount: (count: number) =>
        count === 1 ? "1 sugestão pronta" : `${count} sugestões prontas`,
    },
  },
} satisfies Record<Locale, unknown>;

export type Formatters = (typeof formatters)["en"];

export function getFormatters(locale: Locale): Formatters {
  return formatters[locale];
}
