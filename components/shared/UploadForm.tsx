"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { getFormatters } from "@/lib/i18n/formatters";

const STAGE_INTERVAL_MS = 450;

export function UploadForm({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const router = useRouter();
  const f = getFormatters(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  const stages = dict.upload.stages;

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stages.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loading, stages.length]);

  async function submitFiles(body: FormData | { useSample: true }) {
    setStageIndex(0);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/statements/upload", {
        method: "POST",
        ...(body instanceof FormData
          ? { body }
          : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? dict.upload.genericError);
        setLoading(false);
        return;
      }

      const suffix = data.duplicatesSkipped > 0 ? `?duplicates=${data.duplicatesSkipped}` : "";
      router.push(`/report/${data.reportId}${suffix}`);
    } catch {
      setError(dict.upload.connectionError);
      setLoading(false);
    }
  }

  function handleUpload() {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    submitFiles(formData);
  }

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="flex flex-col gap-4 pt-6">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{dict.upload.errorTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium">{stages[stageIndex]}</p>
            <div className="h-1 w-full max-w-48 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((stageIndex + 1) / stages.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10 text-center transition-colors hover:bg-muted/50"
          >
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">
              {files.length > 0 ? f.upload.selected(files.length) : dict.upload.dropzoneIdle}
            </p>
            <p className="text-xs text-muted-foreground">{dict.upload.dropzoneHint}</p>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />

        <Button onClick={handleUpload} disabled={files.length === 0 || loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Upload />}
          {files.length > 1 ? dict.upload.submitPlural : dict.upload.submit}
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {dict.upload.or}
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" onClick={() => submitFiles({ useSample: true })} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {dict.upload.useSample}
        </Button>
      </CardContent>
    </Card>
  );
}
