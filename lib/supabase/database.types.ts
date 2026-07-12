// Gerado manualmente a partir de supabase/migrations/0001_init.sql + 0002_currency_manual_rls.sql.
// Reexecutar `npm run supabase:types` após reconectar o MCP/CLI substitui este arquivo pelo gerado oficialmente.

export interface Database {
  public: {
    Tables: {
      statements: {
        Row: {
          id: string;
          filename: string;
          source_bank: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          filename: string;
          source_bank?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          filename?: string;
          source_bank?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          statement_id: string;
          date: string;
          amount: number;
          currency: string;
          description: string | null;
          direction: "credit" | "debit";
          category: string | null;
          category_source: "rule" | "manual" | null;
          is_exchange: boolean;
          raw: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          statement_id: string;
          date: string;
          amount: number;
          currency?: string;
          description?: string | null;
          direction: "credit" | "debit";
          category?: string | null;
          category_source?: "rule" | "manual" | null;
          is_exchange?: boolean;
          raw?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          statement_id?: string;
          date?: string;
          amount?: number;
          currency?: string;
          description?: string | null;
          direction?: "credit" | "debit";
          category?: string | null;
          category_source?: "rule" | "manual" | null;
          is_exchange?: boolean;
          raw?: Record<string, unknown> | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_statement_id_fkey";
            columns: ["statement_id"];
            isOneToOne: false;
            referencedRelation: "statements";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          statement_ids: string[];
          category_summary: Record<string, unknown>;
          ai_insights: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          statement_ids: string[];
          category_summary: Record<string, unknown>;
          ai_insights?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          statement_ids?: string[];
          category_summary?: Record<string, unknown>;
          ai_insights?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
