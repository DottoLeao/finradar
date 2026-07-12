import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { getLocale } from "@/lib/i18n/locale";
import "./globals.css";

const fontBody = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body-family",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "pt"
    ? {
        title: "FinRadar — veja pra onde seu dinheiro foi",
        description: "Suba o extrato de qualquer banco e veja seus gastos categorizados automaticamente.",
      }
    : {
        title: "FinRadar — see where your money went",
        description: "Upload any bank statement and see your spending automatically categorized.",
      };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${fontBody.variable} h-full antialiased`}>
      <body className="relative min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
