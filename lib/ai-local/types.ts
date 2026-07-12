import type { Category } from "@/lib/categorize/rules";

export type AiEngineStatus = "idle" | "loading" | "ready" | "suggesting" | "error" | "unsupported";

export type AiDevice = "webgpu" | "wasm";

export interface CategoryReference {
  category: Category;
  referenceText: string;
}

export interface ClassifierWeights {
  modelId: string;
  embeddingDim: number;
  prefix: string;
  categories: Category[];
  weights: number[][];
  bias: number[];
  trainedAt: string;
  trainingSampleCount: number;
  validationAccuracy: number;
}

export interface AiSuggestion {
  id: string;
  category: Category;
  score: number;
}

export interface EmbedItem {
  id: string;
  description: string;
  merchant?: string;
}

export type WorkerInMessage =
  | { type: "init"; device: AiDevice; categoryReferences: CategoryReference[] }
  | { type: "embed"; batchId: string; items: EmbedItem[] };

export type WorkerOutMessage =
  | { type: "progress"; file: string; loaded: number; total: number }
  | { type: "ready" }
  | { type: "result"; batchId: string; suggestions: AiSuggestion[] }
  | { type: "error"; message: string };
