"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    import("@/lib/ai-local/client").then(({ isAiCategorizationSupported }) => {
      setSupported(isAiCategorizationSupported());
    });
  }, []);

  if (!supported || items.length === 0) return null;

  async function handleClick() {
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
  }

  const busy = status === "loading" || status === "suggesting";
  const percent = progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleClick} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {status === "error" ? dict.aiCategorize.retry : dict.aiCategorize.suggestButton}
        </Button>
      </div>
      {status === "loading" ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{f.aiCategorize.downloadProgress(percent)}</p>
          <div className="h-1 w-full max-w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}
      {status === "suggesting" ? <p className="text-xs text-muted-foreground">{dict.aiCategorize.suggesting}</p> : null}
      {status === "error" ? <p className="text-xs text-destructive">{dict.aiCategorize.error}</p> : null}
      <p className="text-xs text-muted-foreground">{dict.aiCategorize.disclaimer}</p>
    </div>
  );
}
