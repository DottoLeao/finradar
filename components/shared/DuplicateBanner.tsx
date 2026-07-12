"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { getFormatters } from "@/lib/i18n/formatters";
import type { Locale } from "@/lib/i18n/dictionaries";

export function DuplicateBanner({ count, locale }: { count: number; locale: Locale }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || count <= 0) return null;

  const f = getFormatters(locale);

  return (
    <Alert>
      <Info />
      <AlertTitle>{f.upload.duplicatesSkipped(count)}</AlertTitle>
      <AlertAction>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 hover:bg-foreground/10"
        >
          <X className="size-4" />
        </button>
      </AlertAction>
    </Alert>
  );
}
