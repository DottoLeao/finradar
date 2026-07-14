export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

const dictionaries = {
  en: {
    categories: {
      groceries: "Groceries",
      transport: "Transport",
      subscriptions: "Subscriptions",
      transfer: "Transfer",
      dining: "Dining & Delivery",
      exchange: "Exchange",
      rent: "Rent",
      income: "Income",
      healthcare: "Healthcare",
      other: "Other",
      uncategorized: "Uncategorized",
    },
    nav: {
      brand: "FinRadar",
      languageToggle: "Switch to Portuguese",
    },
    landing: {
      title: "Upload any bank statement,\nsee where your money went.",
      subtitle: "No manual categorizing — rules do the work, and you review the rest.",
    },
    upload: {
      dropzoneIdle: "Click to choose your statement CSVs",
      dropzoneHint: "CommBank, Wise, or any format with date/amount/description",
      submit: "Process statement",
      submitPlural: "Process statements",
      or: "or",
      useSample: "Use preloaded examples",
      errorTitle: "Couldn't process that",
      genericError: "Unexpected error while processing the files.",
      connectionError: "Couldn't reach the server. Try again.",
      fileTooLarge: "Selected files are too large (max ~4MB total). Try uploading fewer files or smaller statements.",
      fileReadError: "Couldn't read the selected files. Pick them again — if they live in a cloud folder, download them to the device first.",
      stages: [
        "Reading files…",
        "Detecting format…",
        "Applying category rules…",
        "Converting currency…",
        "Saving…",
      ],
    },
    stats: {
      totalSpent: "Total spent",
      totalExchange: "Exchange (not counted as spend)",
      transactions: "Transactions",
      period: "Period",
    },
    charts: {
      byCategory: "Spend by category",
      overTime: "Over time",
      noSpendData: "No spend data.",
    },
    table: {
      date: "Date",
      description: "Description",
      category: "Category",
      currency: "Currency",
      amount: "Amount",
      topTransactions: "Biggest transactions",
      allTransactions: "All transactions",
      markManual: "Manually categorized",
      searchPlaceholder: "Search description…",
      allCategories: "All categories",
      noResults: "No transactions match this filter.",
    },
    summary: {
      title: "Summary",
    },
    currency: {
      label: "Currency",
    },
    report: {
      exportPdf: "Export PDF",
    },
    toast: {
      categoryUpdated: "Category updated",
      categoryUpdateFailed: "Couldn't update the category. Try again.",
    },
    aiCategorize: {
      acceptAll: "Accept all suggestions",
      disclaimer: "Runs locally in your browser — nothing is uploaded.",
      loadingModel: "Downloading local model…",
      suggesting: "Analyzing transactions…",
      error: "Couldn't run the local AI model in this browser.",
      retry: "Retry",
      accept: "Accept",
      dismiss: "Dismiss",
    },
    errors: {
      noFiles: "No files sent. Upload one or more CSVs, or use the preloaded examples.",
      unsupportedFormat:
        "None of the files match a supported format (CommBank, Wise, or a generic CSV with date/amount/description columns).",
    },
  },
  pt: {
    categories: {
      groceries: "Mercado",
      transport: "Transporte",
      subscriptions: "Assinaturas",
      transfer: "Transferência",
      dining: "Alimentação/Delivery",
      exchange: "Câmbio",
      rent: "Aluguel",
      income: "Renda",
      healthcare: "Saúde",
      other: "Outros",
      uncategorized: "Sem categoria",
    },
    nav: {
      brand: "FinRadar",
      languageToggle: "Mudar pra inglês",
    },
    landing: {
      title: "Suba o extrato de qualquer banco,\nveja pra onde seu dinheiro foi.",
      subtitle: "Sem categorizar nada na mão — regras cuidam da maioria, você revisa o resto.",
    },
    upload: {
      dropzoneIdle: "Clique pra escolher os CSVs do extrato",
      dropzoneHint: "CommBank, Wise, ou outro formato com date/amount/description",
      submit: "Processar extrato",
      submitPlural: "Processar extratos",
      or: "ou",
      useSample: "Usar exemplos pré-carregados",
      errorTitle: "Não deu pra processar",
      genericError: "Erro inesperado ao processar os arquivos.",
      connectionError: "Não foi possível conectar ao servidor. Tente novamente.",
      fileTooLarge: "Os arquivos selecionados são grandes demais (máx. ~4MB no total). Tente enviar menos arquivos ou extratos menores.",
      fileReadError: "Não deu pra ler os arquivos selecionados. Selecione de novo — se estiverem numa pasta de nuvem, baixe pro aparelho antes.",
      stages: [
        "Lendo arquivos…",
        "Detectando formato…",
        "Aplicando regras de categoria…",
        "Convertendo moeda…",
        "Salvando…",
      ],
    },
    stats: {
      totalSpent: "Total gasto",
      totalExchange: "Câmbio (não contado como gasto)",
      transactions: "Transações",
      period: "Período",
    },
    charts: {
      byCategory: "Gasto por categoria",
      overTime: "Evolução no tempo",
      noSpendData: "Sem dados de gasto.",
    },
    table: {
      date: "Data",
      description: "Descrição",
      category: "Categoria",
      currency: "Moeda",
      amount: "Valor",
      topTransactions: "Maiores transações",
      allTransactions: "Todas as transações",
      markManual: "Categorizado manualmente",
      searchPlaceholder: "Buscar na descrição…",
      allCategories: "Todas as categorias",
      noResults: "Nenhuma transação bate com esse filtro.",
    },
    summary: {
      title: "Resumo",
    },
    currency: {
      label: "Moeda",
    },
    report: {
      exportPdf: "Exportar PDF",
    },
    toast: {
      categoryUpdated: "Categoria atualizada",
      categoryUpdateFailed: "Não deu pra atualizar a categoria. Tente de novo.",
    },
    aiCategorize: {
      acceptAll: "Aceitar todas as sugestões",
      disclaimer: "Roda localmente no seu navegador — nada é enviado.",
      loadingModel: "Baixando modelo local…",
      suggesting: "Analisando transações…",
      error: "Não foi possível rodar o modelo de IA local neste navegador.",
      retry: "Tentar de novo",
      accept: "Aceitar",
      dismiss: "Descartar",
    },
    errors: {
      noFiles: "Nenhum arquivo enviado. Envie um ou mais CSVs, ou use os exemplos pré-carregados.",
      unsupportedFormat:
        "Nenhum dos arquivos enviados corresponde a um formato suportado (CommBank, Wise, ou genérico com colunas date/amount/description).",
    },
  },
} satisfies Record<Locale, unknown>;

export type Dictionary = (typeof dictionaries)["en"];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
