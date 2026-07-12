import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { cosineSimilarity } from "@/lib/ai-local/cosine";
import classifierWeights from "@/lib/ai-local/classifier-weights.json";
import type {
  AiDevice,
  AiSuggestion,
  CategoryReference,
  ClassifierWeights,
  EmbedItem,
  WorkerInMessage,
  WorkerOutMessage,
} from "@/lib/ai-local/types";
import type { Category } from "@/lib/categorize/rules";

export const EMBEDDING_MODEL_ID = "Xenova/multilingual-e5-small";
// Calibrado empiricamente contra os CSVs de exemplo (recalibrado quando as
// frases de referência viraram bilíngues, que subiram os scores em geral):
// "MERCADO DA VILA" acerta groceries com 0.879, "PADARIA" com 0.844, e a
// livraria (que não tem categoria correspondente) fica fora com 0.812.
export const SUGGESTION_THRESHOLD = 0.83;

// Calibrado contra a validação do treino (scripts/train-category-classifier.ts):
// previsões corretas têm confiança média de ~70% (p10 ~46%), erradas ~44%
// (p90 ~61%). 0.6 fica acima da maioria dos erros mantendo boa parte dos
// acertos — a rede de segurança de verdade é exigir concordância com o
// cosseno (abaixo), não só esse número.
const CLASSIFIER_THRESHOLD = 0.6;

// Acima deste patamar o classificador é aceito mesmo SEM concordância do
// cosseno. Precisa ficar bem acima do erro confiante conhecido em texto fora
// da distribuição de treino (inglês): "MERCADO DA VILA" errou com 56-69% em
// runs anteriores. Calibrar empiricamente contra os CSVs de exemplo.
const CLASSIFIER_SOLO_THRESHOLD = 0.85;

const weights = classifierWeights as ClassifierWeights;

let extractor: FeatureExtractionPipeline | null = null;
let categoryVectors: { category: CategoryReference["category"]; vector: number[] }[] = [];

/**
 * Remove ruído bancário puro da descrição antes de embeddar ("Card xx0816",
 * "Value Date: 03/06/2026") — dilui o embedding sem carregar significado.
 * Cidade/país ficam (ex: "CURITIBA BRA" é sinal semântico multilíngue real).
 */
function cleanForEmbedding(text: string): string {
  return text
    .replace(/\bCard xx\d+\b/gi, "")
    .replace(/\bValue Date: \d{2}\/\d{2}\/\d{4}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function post(message: WorkerOutMessage) {
  self.postMessage(message);
}

async function embed(texts: string[]): Promise<number[][]> {
  if (!extractor) throw new Error("Extractor not initialized");
  // multilingual-e5 é treinado com o prefixo "query: " — usar em ambos os
  // lados (referência de categoria e descrição) melhora a discriminação.
  const output = await extractor(
    texts.map((t) => `query: ${t}`),
    { pooling: "mean", normalize: true }
  );
  return output.tolist();
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Classificador linear treinado offline (scripts/train-category-classifier.ts)
 * sobre os mesmos embeddings — cobre só 5 categorias (sem "exchange", que a
 * regra exata já resolve) e só viu dados em inglês no treino.
 */
function classify(vector: number[]): { category: Category; probability: number } {
  const logits = weights.weights.map((row, c) => row.reduce((acc, w, i) => acc + w * vector[i], weights.bias[c]));
  const probs = softmax(logits);
  const topIdx = probs.indexOf(Math.max(...probs));
  return { category: weights.categories[topIdx], probability: probs[topIdx] };
}

// Os scores do e5 são comprimidos (~0.78-0.89) e variam ~±0.002 entre
// backends (WASM no browser vs nativo no Node) — empates no topo podem
// inverter de ordem dependendo da máquina. Tudo dentro dessa margem é
// tratado como empate, nunca como vencedor.
const COSINE_TIE_MARGIN = 0.005;

interface CosineMatch {
  category: Category;
  score: number;
  /** Diferença pro segundo colocado — abaixo de COSINE_TIE_MARGIN é empate. */
  lead: number;
  scoreFor: (category: Category) => number;
}

function bestCosineMatch(vector: number[]): CosineMatch {
  const byCategory = new Map<Category, number>();
  for (const candidate of categoryVectors) {
    const score = cosineSimilarity(vector, candidate.vector);
    const current = byCategory.get(candidate.category);
    if (current === undefined || score > current) byCategory.set(candidate.category, score);
  }

  let bestCategory = categoryVectors[0].category;
  let bestScore = -1;
  let secondScore = -1;
  for (const [category, score] of byCategory) {
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestCategory = category;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  return {
    category: bestCategory,
    score: bestScore,
    lead: bestScore - secondScore,
    scoreFor: (category) => byCategory.get(category) ?? -1,
  };
}

async function init(device: AiDevice, categoryReferences: CategoryReference[]) {
  // dtype q8: ~4x menos download com resultados idênticos nos casos de
  // calibração. O device vem fixo em "wasm" (client.ts) pra manter UMA
  // receita de embedding — igual à usada no treino do classificador.
  extractor = await pipeline("feature-extraction", EMBEDDING_MODEL_ID, {
    device,
    dtype: "q8",
    progress_callback: (info) => {
      if (info.status === "progress_total") {
        post({ type: "progress", file: "model", loaded: info.loaded, total: info.total });
      }
    },
  });

  // Cada categoria tem múltiplas frases de referência (EN + PT); embedda todas
  // de uma vez e guarda uma entrada por frase — bestCosineMatch usa o máximo
  // por categoria implicitamente (a melhor frase da categoria vence).
  const flat = categoryReferences.flatMap((ref) =>
    ref.referenceTexts.map((text) => ({ category: ref.category, text }))
  );
  const vectors = await embed(flat.map((entry) => entry.text));
  categoryVectors = flat.map((entry, i) => ({ category: entry.category, vector: vectors[i] }));

  post({ type: "ready" });
}

async function handleEmbed(batchId: string, items: EmbedItem[]) {
  // Prefere o nome limpo do comerciante (quando existe, ex.: Wise) em vez da
  // descrição inteira; em ambos os casos remove ruído bancário antes.
  const vectors = await embed(
    items.map((item) => cleanForEmbedding(item.merchant?.trim() || item.description))
  );

  const suggestions: (AiSuggestion | null)[] = items.map((item, i) => {
    const vector = vectors[i];
    const classifierPick = classify(vector);
    const cosinePick = bestCosineMatch(vector);

    // Degraus, do sinal mais forte pro mais fraco:
    // 1. Classificador muito confiante — aceita sozinho.
    // 2. Classificador confiante E cosseno concordando — "concordar" tolera
    //    empate no topo (a categoria do classificador só precisa estar a
    //    COSINE_TIE_MARGIN do líder), senão inversões de 0.001 entre
    //    backends mudam o resultado. O acordo protege contra erro confiante
    //    em texto fora da distribuição de treino (só inglês).
    // 3. Cosseno sozinho, mas apenas com liderança decisiva — se duas
    //    categorias estão empatadas no topo, o cosseno sozinho não decide.
    if (classifierPick.probability >= CLASSIFIER_SOLO_THRESHOLD) {
      return { id: item.id, category: classifierPick.category, score: classifierPick.probability };
    }
    if (
      classifierPick.probability >= CLASSIFIER_THRESHOLD &&
      cosinePick.scoreFor(classifierPick.category) >= cosinePick.score - COSINE_TIE_MARGIN
    ) {
      return { id: item.id, category: classifierPick.category, score: classifierPick.probability };
    }
    if (cosinePick.score >= SUGGESTION_THRESHOLD && cosinePick.lead > COSINE_TIE_MARGIN) {
      return { id: item.id, category: cosinePick.category, score: cosinePick.score };
    }
    return null;
  });

  post({
    type: "result",
    batchId,
    suggestions: suggestions.filter((s): s is AiSuggestion => s !== null),
  });
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  try {
    const message = event.data;
    if (message.type === "init") {
      await init(message.device, message.categoryReferences);
    } else if (message.type === "embed") {
      await handleEmbed(message.batchId, message.items);
    }
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : "Unknown AI worker error" });
  }
};
