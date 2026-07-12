/**
 * Treina um classificador linear (softmax) por cima dos embeddings do
 * mesmo modelo usado em produção (lib/ai-local/worker.ts), pra substituir a
 * similaridade de cosseno contra texto de categoria escrito à mão.
 *
 * Rodar manualmente: npm run train-classifier
 * NÃO faz parte de build/dev/CI — só um script de desenvolvimento, mesmo
 * padrão do scripts/process-samples.ts.
 *
 * Dataset: DoDataThings/us-bank-transaction-categories-v2 (Hugging Face,
 * MIT, 68k linhas sintéticas, formato de extrato bancário americano, sem
 * gating). Mapeamento 1:1 pras 8 categorias que se beneficiam de matching
 * semântico (exchange fica de fora — a regra exata já resolve isso hoje):
 *   Restaurants    -> dining
 *   Groceries      -> groceries
 *   Transportation -> transport
 *   Subscription   -> subscriptions
 *   Transfer       -> transfer
 *   Rent           -> rent
 *   Income         -> income
 *   Healthcare     -> healthcare
 * As outras 9 categorias do dataset (Shopping, Entertainment, Utilities,
 * Insurance, Mortgage, Travel, Education, Personal Care, Fees) não têm
 * equivalente no FinRadar e são descartadas.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import type { Category } from "@/lib/categorize/rules";

const CACHE_DIR = join(process.cwd(), "scripts", ".cache");
const CSV_CACHE_PATH = join(CACHE_DIR, "transactions-synthetic.csv");
const EMBEDDINGS_CACHE_PATH = join(CACHE_DIR, "embeddings.json");
const DATASET_URL =
  "https://huggingface.co/datasets/DoDataThings/us-bank-transaction-categories-v2/resolve/main/transactions-synthetic.csv";

const EMBEDDING_MODEL_ID = "Xenova/multilingual-e5-small";
const SAMPLES_PER_CATEGORY = Number(process.env.SAMPLES_PER_CATEGORY ?? 1200);
const EMBED_BATCH_SIZE = 32;

const CATEGORY_MAP: Record<string, Category> = {
  Restaurants: "dining",
  Groceries: "groceries",
  Transportation: "transport",
  Subscription: "subscriptions",
  Transfer: "transfer",
  Rent: "rent",
  Income: "income",
  Healthcare: "healthcare",
};

interface DatasetRow {
  description: string;
  category: Category;
}

async function downloadDataset(): Promise<string> {
  if (existsSync(CSV_CACHE_PATH)) {
    console.log(`Usando CSV cacheado em ${CSV_CACHE_PATH}`);
    return readFileSync(CSV_CACHE_PATH, "utf-8");
  }

  console.log(`Baixando dataset de ${DATASET_URL}...`);
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`Falha ao baixar dataset: ${res.status}`);
  const text = await res.text();

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CSV_CACHE_PATH, text, "utf-8");
  console.log(`Salvo em ${CSV_CACHE_PATH} (${(text.length / 1024 / 1024).toFixed(2)} MB)`);
  return text;
}

function filterAndRemap(csvText: string): DatasetRow[] {
  const parsed = Papa.parse<{ description: string; category: string }>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: DatasetRow[] = [];
  for (const row of parsed.data) {
    const mapped = CATEGORY_MAP[row.category];
    if (mapped && row.description) {
      rows.push({ description: row.description, category: mapped });
    }
  }
  return rows;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface Split {
  train: DatasetRow[];
  val: DatasetRow[];
}

function sampleAndSplit(byCategory: Map<Category, DatasetRow[]>): Split {
  const train: DatasetRow[] = [];
  const val: DatasetRow[] = [];

  for (const [, categoryRows] of byCategory) {
    const sample = shuffle(categoryRows).slice(0, SAMPLES_PER_CATEGORY);
    const splitIdx = Math.floor(sample.length * 0.85);
    train.push(...sample.slice(0, splitIdx));
    val.push(...sample.slice(splitIdx));
  }

  return { train: shuffle(train), val: shuffle(val) };
}

interface EmbeddedRow {
  category: Category;
  vector: number[];
}

const PT_SANITY_SET: { text: string; expected: Category }[] = [
  { text: "MERCADO DA VILA CURITIBA BRA", expected: "groceries" },
  { text: "PADARIA BOM GOSTO SAO PAULO BRA", expected: "dining" },
];

// Ordem fixa das 5 categorias que o classificador cobre — define a ordem
// das linhas da matriz de pesos exportada. "exchange" fica de fora: a regra
// exata (CONVERSION/EXCHANGE) já resolve isso hoje, e o dataset de treino
// não tem categoria equivalente.
const CLASSIFIER_CATEGORIES: Category[] = [
  "dining",
  "groceries",
  "transport",
  "subscriptions",
  "transfer",
  "rent",
  "income",
  "healthcare",
];

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function forward(W: number[][], b: number[], x: number[]): number[] {
  const logits = W.map((row, c) => row.reduce((acc, w, i) => acc + w * x[i], b[c]));
  return softmax(logits);
}

interface TrainResult {
  W: number[][];
  b: number[];
}

function trainSoftmaxClassifier(train: EmbeddedRow[], val: EmbeddedRow[], dim: number): TrainResult {
  const numClasses = CLASSIFIER_CATEGORIES.length;
  const catIndex = new Map(CLASSIFIER_CATEGORIES.map((c, i) => [c, i]));

  let W = Array.from({ length: numClasses }, () => Array.from({ length: dim }, () => (Math.random() - 0.5) * 0.01));
  let b = Array.from({ length: numClasses }, () => 0);

  // Adam
  const mW = W.map((row) => row.map(() => 0));
  const vW = W.map((row) => row.map(() => 0));
  const mB = b.map(() => 0);
  const vB = b.map(() => 0);
  const lr = 0.01;
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;
  const l2 = 1e-4;
  const batchSize = 64;
  const epochs = 150;

  let step = 0;
  let bestValAcc = -1;
  let bestW = W;
  let bestB = b;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const shuffled = shuffle(train);
    for (let i = 0; i < shuffled.length; i += batchSize) {
      const batch = shuffled.slice(i, i + batchSize);
      const gradW = W.map((row) => row.map(() => 0));
      const gradB = b.map(() => 0);

      for (const row of batch) {
        const target = catIndex.get(row.category)!;
        const probs = forward(W, b, row.vector);
        for (let c = 0; c < numClasses; c++) {
          const err = probs[c] - (c === target ? 1 : 0);
          gradB[c] += err;
          const gradWc = gradW[c];
          const x = row.vector;
          for (let k = 0; k < dim; k++) gradWc[k] += err * x[k];
        }
      }

      step++;
      const scale = 1 / batch.length;
      for (let c = 0; c < numClasses; c++) {
        for (let k = 0; k < dim; k++) {
          const g = gradW[c][k] * scale + l2 * W[c][k];
          mW[c][k] = beta1 * mW[c][k] + (1 - beta1) * g;
          vW[c][k] = beta2 * vW[c][k] + (1 - beta2) * g * g;
          const mHat = mW[c][k] / (1 - beta1 ** step);
          const vHat = vW[c][k] / (1 - beta2 ** step);
          W[c][k] -= (lr * mHat) / (Math.sqrt(vHat) + eps);
        }
        const gB = gradB[c] * scale;
        mB[c] = beta1 * mB[c] + (1 - beta1) * gB;
        vB[c] = beta2 * vB[c] + (1 - beta2) * gB * gB;
        const mHatB = mB[c] / (1 - beta1 ** step);
        const vHatB = vB[c] / (1 - beta2 ** step);
        b[c] -= (lr * mHatB) / (Math.sqrt(vHatB) + eps);
      }
    }

    if (epoch % 10 === 0 || epoch === epochs - 1) {
      const valAcc = evaluate(W, b, val, catIndex).accuracy;
      if (valAcc > bestValAcc) {
        bestValAcc = valAcc;
        bestW = W.map((row) => [...row]);
        bestB = [...b];
      }
      console.log(`  epoch ${epoch}: acurácia validação = ${(valAcc * 100).toFixed(1)}%`);
    }
  }

  console.log(`\nMelhor acurácia de validação: ${(bestValAcc * 100).toFixed(1)}%`);
  W = bestW;
  b = bestB;
  return { W, b };
}

function evaluate(
  W: number[][],
  b: number[],
  val: EmbeddedRow[],
  catIndex: Map<Category, number>
): { accuracy: number; confusion: Record<string, Record<string, number>> } {
  let correct = 0;
  const confusion: Record<string, Record<string, number>> = {};
  for (const cat of CLASSIFIER_CATEGORIES) confusion[cat] = Object.fromEntries(CLASSIFIER_CATEGORIES.map((c) => [c, 0]));

  for (const row of val) {
    const probs = forward(W, b, row.vector);
    const predictedIdx = probs.indexOf(Math.max(...probs));
    const predicted = CLASSIFIER_CATEGORIES[predictedIdx];
    confusion[row.category][predicted]++;
    if (predicted === row.category) correct++;
  }

  void catIndex;
  return { accuracy: correct / val.length, confusion };
}

async function embedRows(
  extractor: FeatureExtractionPipeline,
  rows: DatasetRow[],
  label: string
): Promise<EmbeddedRow[]> {
  const result: EmbeddedRow[] = [];
  for (let i = 0; i < rows.length; i += EMBED_BATCH_SIZE) {
    const batch = rows.slice(i, i + EMBED_BATCH_SIZE);
    const output = await extractor(
      batch.map((r) => `query: ${r.description}`),
      { pooling: "mean", normalize: true }
    );
    const vectors = output.tolist() as number[][];
    batch.forEach((row, j) => result.push({ category: row.category, vector: vectors[j] }));
    process.stdout.write(`\r  ${label}: ${Math.min(i + EMBED_BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  console.log();
  return result;
}

const WEIGHTS_OUTPUT_PATH = join(process.cwd(), "lib", "ai-local", "classifier-weights.json");

async function main() {
  const csvText = await downloadDataset();
  const rows = filterAndRemap(csvText);

  const byCategory = new Map<Category, DatasetRow[]>();
  for (const row of rows) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, []);
    byCategory.get(row.category)!.push(row);
  }

  console.log("\nLinhas por categoria após filtro/remapeamento:");
  for (const [category, categoryRows] of byCategory) {
    console.log(`  ${category}: ${categoryRows.length}`);
  }

  let trainEmbedded: EmbeddedRow[];
  let valEmbedded: EmbeddedRow[];
  let extractor: FeatureExtractionPipeline | null = null;

  if (existsSync(EMBEDDINGS_CACHE_PATH)) {
    console.log(`\nUsando embeddings cacheados em ${EMBEDDINGS_CACHE_PATH}`);
    console.log("(apague esse arquivo se quiser re-amostrar/reembeddar do zero)");
    const cached = JSON.parse(readFileSync(EMBEDDINGS_CACHE_PATH, "utf-8"));
    trainEmbedded = cached.train;
    valEmbedded = cached.val;
  } else {
    const { train, val } = sampleAndSplit(byCategory);
    console.log(`\nAmostra: ${train.length} treino / ${val.length} validação`);

    console.log(`\nCarregando modelo de embedding (${EMBEDDING_MODEL_ID})...`);
    extractor = await pipeline("feature-extraction", EMBEDDING_MODEL_ID);

    console.log("\nEmbeddando...");
    const startTime = Date.now();
    trainEmbedded = await embedRows(extractor, train, "treino");
    valEmbedded = await embedRows(extractor, val, "validação");
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Concluído em ${elapsedSec}s`);

    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(EMBEDDINGS_CACHE_PATH, JSON.stringify({ train: trainEmbedded, val: valEmbedded }), "utf-8");
    console.log(`Embeddings salvos em ${EMBEDDINGS_CACHE_PATH}`);
  }

  const dim = trainEmbedded[0].vector.length;
  console.log(`\nTreinando classificador softmax (${dim} -> ${CLASSIFIER_CATEGORIES.length})...`);
  const { W, b } = trainSoftmaxClassifier(trainEmbedded, valEmbedded, dim);

  const catIndex = new Map(CLASSIFIER_CATEGORIES.map((c, i) => [c, i]));
  const { accuracy, confusion } = evaluate(W, b, valEmbedded, catIndex);

  console.log("\nDistribuição de confiança (prob. do topo) — corretos vs. errados na validação:");
  const correctConf: number[] = [];
  const wrongConf: number[] = [];
  for (const row of valEmbedded) {
    const probs = forward(W, b, row.vector);
    const topIdx = probs.indexOf(Math.max(...probs));
    const top = probs[topIdx];
    if (CLASSIFIER_CATEGORIES[topIdx] === row.category) correctConf.push(top);
    else wrongConf.push(top);
  }
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, v) => a + v, 0) / arr.length : 0);
  const pct = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, c) => a - c);
    return sorted[Math.floor(sorted.length * p)] ?? 0;
  };
  console.log(`  corretos:  média=${(avg(correctConf) * 100).toFixed(1)}%  p10=${(pct(correctConf, 0.1) * 100).toFixed(1)}%`);
  console.log(`  errados:   média=${(avg(wrongConf) * 100).toFixed(1)}%  p90=${(pct(wrongConf, 0.9) * 100).toFixed(1)}%`);
  console.log(`\nAcurácia final de validação: ${(accuracy * 100).toFixed(1)}%`);
  console.log("\nMatriz de confusão (linha = real, coluna = previsto):");
  console.log(`${"".padEnd(16)}${CLASSIFIER_CATEGORIES.map((c) => c.padEnd(14)).join("")}`);
  for (const actual of CLASSIFIER_CATEGORIES) {
    const row = CLASSIFIER_CATEGORIES.map((pred) => String(confusion[actual][pred]).padEnd(14)).join("");
    console.log(`${actual.padEnd(16)}${row}`);
  }

  console.log("\nChecagem de generalização pro português (casos conhecidos de sessões anteriores):");
  if (!extractor) extractor = await pipeline("feature-extraction", EMBEDDING_MODEL_ID);
  for (const { text, expected } of PT_SANITY_SET) {
    const output = await extractor(`query: ${text}`, { pooling: "mean", normalize: true });
    const vector = output.tolist()[0] as number[];
    const probs = forward(W, b, vector);
    const ranked = CLASSIFIER_CATEGORIES.map((c, i) => ({ category: c, prob: probs[i] })).sort((a, c) => c.prob - a.prob);
    const top = ranked[0];
    const mark = top.category === expected ? "OK" : "DIVERGIU";
    console.log(`  [${mark}] "${text}" (esperado: ${expected})`);
    for (const r of ranked) console.log(`      ${r.category}: ${(r.prob * 100).toFixed(1)}%`);
  }

  const weightsFile = {
    modelId: EMBEDDING_MODEL_ID,
    embeddingDim: dim,
    prefix: "query: ",
    categories: CLASSIFIER_CATEGORIES,
    weights: W,
    bias: b,
    trainedAt: new Date().toISOString(),
    trainingSampleCount: trainEmbedded.length,
    validationAccuracy: accuracy,
  };
  writeFileSync(WEIGHTS_OUTPUT_PATH, JSON.stringify(weightsFile), "utf-8");
  console.log(`\nPesos exportados pra ${WEIGHTS_OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Falha:", err);
  process.exit(1);
});
