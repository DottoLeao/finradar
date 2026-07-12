import { buildCategoryReferences } from "@/lib/ai-local/category-references";
import type { AiEngineStatus, AiSuggestion, EmbedItem, WorkerOutMessage } from "@/lib/ai-local/types";

export function isAiCategorizationSupported(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

type ProgressListener = (loaded: number, total: number) => void;

let worker: Worker | null = null;
let status: AiEngineStatus = "idle";
let readyPromise: Promise<void> | null = null;
const progressListeners = new Set<ProgressListener>();
const pendingBatches = new Map<string, { resolve: (s: AiSuggestion[]) => void; reject: (e: Error) => void }>();

function ensureWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
    const message = event.data;
    if (message.type === "progress") {
      for (const listener of progressListeners) listener(message.loaded, message.total);
    } else if (message.type === "result") {
      pendingBatches.get(message.batchId)?.resolve(message.suggestions);
      pendingBatches.delete(message.batchId);
    } else if (message.type === "error") {
      status = "error";
      for (const pending of pendingBatches.values()) pending.reject(new Error(message.message));
      pendingBatches.clear();
    }
  };
  worker.onerror = (event) => {
    status = "error";
    for (const pending of pendingBatches.values()) pending.reject(new Error(event.message));
    pendingBatches.clear();
  };

  return worker;
}

function initEngine(): Promise<void> {
  if (readyPromise) return readyPromise;

  status = "loading";
  const w = ensureWorker();
  // WASM fixo (sem WebGPU): garante a MESMA receita de embedding em toda
  // máquina — idêntica à do treino do classificador (q8/cpu). Os lotes são
  // pequenos demais pra GPU compensar a variação numérica entre backends.
  const device = "wasm";

  readyPromise = new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerOutMessage>) => {
      if (event.data.type === "ready") {
        status = "ready";
        w.removeEventListener("message", onMessage);
        resolve();
      } else if (event.data.type === "error") {
        w.removeEventListener("message", onMessage);
        reject(new Error(event.data.message));
      }
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ type: "init", device, categoryReferences: buildCategoryReferences() });
  });

  // Se a inicialização falhar (ex: rede caiu no meio do download), o retry
  // precisa começar do zero em vez de reutilizar a promise rejeitada.
  readyPromise.catch(() => {
    readyPromise = null;
    worker?.terminate();
    worker = null;
  });

  return readyPromise;
}

/**
 * Começa a baixar/carregar o modelo sem esperar o resultado — chamado pelo
 * UploadForm assim que o upload inicia, pra que o download corra em paralelo
 * com o processamento do servidor. A worker (módulo-level) sobrevive à
 * navegação client-side até o relatório, que a encontra já quente.
 */
export function prefetchAiEngine(): void {
  if (!isAiCategorizationSupported()) return;
  initEngine().catch(() => {
    // Silencioso de propósito: se falhar aqui, o fluxo do relatório tenta de
    // novo e mostra o erro com botão de retry.
  });
}

export function getAiCategorizer() {
  return {
    status: () => status,
    onProgress(cb: ProgressListener) {
      progressListeners.add(cb);
      return () => progressListeners.delete(cb);
    },
    async suggest(items: EmbedItem[]): Promise<AiSuggestion[]> {
      await initEngine();
      status = "suggesting";
      const w = ensureWorker();
      const batchId = crypto.randomUUID();

      const result = await new Promise<AiSuggestion[]>((resolve, reject) => {
        pendingBatches.set(batchId, { resolve, reject });
        w.postMessage({ type: "embed", batchId, items });
      });

      status = "ready";
      return result;
    },
  };
}
