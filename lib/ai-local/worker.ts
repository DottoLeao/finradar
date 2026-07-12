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
// Calibrado empiricamente contra os CSVs de exemplo: nesse patamar os
// "uncategorized" que realmente não cabem em nenhuma categoria (salário,
// livraria, clínica médica) ficam abaixo do corte, e só passam os
// plausíveis (cafés → dining, "mercado" → groceries).
export const SUGGESTION_THRESHOLD = 0.8;

// Calibrado contra a validação do treino (scripts/train-category-classifier.ts):
// previsões corretas têm confiança média de ~70% (p10 ~46%), erradas ~44%
// (p90 ~61%). 0.6 fica acima da maioria dos erros mantendo boa parte dos
// acertos — a rede de segurança de verdade é exigir concordância com o
// cosseno (abaixo), não só esse número.
const CLASSIFIER_THRESHOLD = 0.6;

const weights = classifierWeights as ClassifierWeights;

let extractor: FeatureExtractionPipeline | null = null;
let categoryVectors: { category: CategoryReference["category"]; vector: number[] }[] = [];

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

function bestCosineMatch(vector: number[]): { category: Category; score: number } {
  let bestCategory = categoryVectors[0].category;
  let bestScore = -1;
  for (const candidate of categoryVectors) {
    const score = cosineSimilarity(vector, candidate.vector);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = candidate.category;
    }
  }
  return { category: bestCategory, score: bestScore };
}

async function init(device: AiDevice, categoryReferences: CategoryReference[]) {
  extractor = await pipeline("feature-extraction", EMBEDDING_MODEL_ID, {
    device,
    progress_callback: (info) => {
      if (info.status === "progress_total") {
        post({ type: "progress", file: "model", loaded: info.loaded, total: info.total });
      }
    },
  });

  const vectors = await embed(categoryReferences.map((ref) => ref.referenceText));
  categoryVectors = categoryReferences.map((ref, i) => ({ category: ref.category, vector: vectors[i] }));

  post({ type: "ready" });
}

async function handleEmbed(batchId: string, items: EmbedItem[]) {
  // Prefere o nome limpo do comerciante (quando existe, ex.: Wise) em vez da
  // descrição inteira, que costuma ter ruído de cidade/cartão/data.
  const vectors = await embed(items.map((item) => item.merchant?.trim() || item.description));

  const suggestions: (AiSuggestion | null)[] = items.map((item, i) => {
    const vector = vectors[i];
    const classifierPick = classify(vector);
    const cosinePick = bestCosineMatch(vector);

    // O classificador treinado é bem mais preciso (~91% de validação) que o
    // cosseno genérico, mas só viu dados em inglês — em casos como "MERCADO
    // DA VILA CURITIBA" ele erra com confiança razoável. Exigir que os dois
    // sinais concordem evita esse tipo de erro confiante sem precisar
    // detectar idioma; quando não concordam, cai pro cosseno (já calibrado
    // e validado, inclusive pra português).
    if (classifierPick.probability >= CLASSIFIER_THRESHOLD && classifierPick.category === cosinePick.category) {
      return { id: item.id, category: classifierPick.category, score: classifierPick.probability };
    }
    if (cosinePick.score >= SUGGESTION_THRESHOLD) {
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
