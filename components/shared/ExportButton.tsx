"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Exporta o relatório via impressão nativa do navegador ("Salvar como PDF").
 * Sem dependência de lib de geração de PDF — o CSS @media print (globals.css)
 * é quem transforma a página numa folha limpa. Robusto no celular, sem risco
 * de memória. `print:hidden` garante que o próprio botão não saia no PDF.
 */
export function ExportButton({ dict }: { dict: Dictionary }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" />
      {dict.report.exportPdf}
    </Button>
  );
}
