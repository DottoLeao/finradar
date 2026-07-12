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
  const device = typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";

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

  return readyPromise;
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
