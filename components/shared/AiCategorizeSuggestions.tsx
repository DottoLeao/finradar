"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { getFormatters } from "@/lib/i18n/formatters";
import type { AiEngineStatus, AiSuggestion, EmbedItem } from "@/lib/ai-local/types";

export function AiCategorizeSuggestions({
  items,
  dict,
  locale,
  onSuggestions,
}: {
  items: EmbedItem[];
  dict: Dictionary;
  locale: Locale;
  onSuggestions: (suggestions: AiSuggestion[]) => void;
}) {
  const f = getFormatters(locale);
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<AiEngineStatus>("idle");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const autoRanRef = useRef(false);

  const runSuggestions = useCallback(async () => {
    setStatus("loading");
    setProgress(null);
    try {
      const { getAiCategorizer } = await import("@/lib/ai-local/client");
      const categorizer = getAiCategorizer();
      const unsubscribe = categorizer.onProgress((loaded, total) => {
        setProgress({ loaded, total });
        if (loaded >= total) setStatus("suggesting");
      });
      const suggestions = await categorizer.suggest(items);
      unsubscribe();
      setStatus("ready");
      onSuggestions(suggestions);
    } catch {
      setStatus("error");
    }
    // items/onSuggestions são estáveis pro caso de uso real (setados uma vez
    // por render do server component); o ref de auto-run evita re-execução.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    import("@/lib/ai-local/client").then(({ isAiCategorizationSupported }) => {
      setSupported(isAiCategorizationSupported());
    });
  }, []);

  // Roda sozinho, uma vez, assim que soubermos que o navegador suporta —
  // sem botão. O modelo já pode estar quente (prefetch no upload).
  useEffect(() => {
    if (!supported || items.length === 0 || autoRanRef.current) return;
    autoRanRef.current = true;
    runSuggestions();
  }, [supported, items.length, runSuggestions]);

  if (!supported || items.length === 0) return null;

  const percent = progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      {status === "loading" ? (
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {f.aiCategorize.downloadProgress(percent)}
          </p>
          <div className="h-1 w-full max-w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}
      {status === "suggesting" ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {dict.aiCategorize.suggesting}
        </p>
      ) : null}
      {status === "error" ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={runSuggestions}>
            <Sparkles />
            {dict.aiCategorize.retry}
          </Button>
          <p className="text-xs text-destructive">{dict.aiCategorize.error}</p>
        </div>
      ) : null}
      {status !== "ready" ? (
        <p className="text-xs text-muted-foreground">{dict.aiCategorize.disclaimer}</p>
      ) : null}
    </div>
  );
}
