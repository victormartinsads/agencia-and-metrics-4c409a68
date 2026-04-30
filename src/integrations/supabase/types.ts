export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          ad_account_ids: string[]
          created_at: string
          currency_symbol: string
          ga_property_id: string | null
          id: string
          lead_action_types: string[]
          meta_access_token: string
          monthly_revenue: number | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          ad_account_ids?: string[]
          created_at?: string
          currency_symbol?: string
          ga_property_id?: string | null
          id?: string
          lead_action_types?: string[]
          meta_access_token: string
          monthly_revenue?: number | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          ad_account_ids?: string[]
          created_at?: string
          currency_symbol?: string
          ga_property_id?: string | null
          id?: string
          lead_action_types?: string[]
          meta_access_token?: string
          monthly_revenue?: number | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      creative_metric_overrides: {
        Row: {
          client_id: string
          created_at: string
          creative_id: string
          id: string
          metric_name: string
          metric_value: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          creative_id: string
          id?: string
          metric_name: string
          metric_value: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          creative_id?: string
          id?: string
          metric_name?: string
          metric_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_metric_overrides_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_sheet_config: {
        Row: {
          client_id: string
          created_at: string
          date_format: string
          decimal_separator: string
          field_mapping: Json
          header_row: number
          id: string
          last_sync_error: string | null
          last_sync_rows: number | null
          last_sync_status: string | null
          last_synced_at: string | null
          metric_sources: Json
          monthly_investment_budget: number | null
          monthly_revenue_goal: number | null
          row_filters: Json
          sheet_name: string
          spreadsheet_id: string
          spreadsheet_name: string | null
          spreadsheet_url: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date_format?: string
          decimal_separator?: string
          field_mapping?: Json
          header_row?: number
          id?: string
          last_sync_error?: string | null
          last_sync_rows?: number | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          metric_sources?: Json
          monthly_investment_budget?: number | null
          monthly_revenue_goal?: number | null
          row_filters?: Json
          sheet_name?: string
          spreadsheet_id: string
          spreadsheet_name?: string | null
          spreadsheet_url?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date_format?: string
          decimal_separator?: string
          field_mapping?: Json
          header_row?: number
          id?: string
          last_sync_error?: string | null
          last_sync_rows?: number | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          metric_sources?: Json
          monthly_investment_budget?: number | null
          monthly_revenue_goal?: number | null
          row_filters?: Json
          sheet_name?: string
          spreadsheet_id?: string
          spreadsheet_name?: string | null
          spreadsheet_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      diagnostic_metrics_config: {
        Row: {
          client_id: string
          created_at: string
          custom_metrics: Json
          date_preset: string
          group_key: string
          id: string
          updated_at: string
          visible_metrics: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          custom_metrics?: Json
          date_preset?: string
          group_key: string
          id?: string
          updated_at?: string
          visible_metrics?: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          custom_metrics?: Json
          date_preset?: string
          group_key?: string
          id?: string
          updated_at?: string
          visible_metrics?: Json
        }
        Relationships: []
      }
      funnel_card_config: {
        Row: {
          client_id: string
          created_at: string
          display_order: number
          funnel_code: string
          id: string
          metrics: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          display_order?: number
          funnel_code: string
          id?: string
          metrics?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          display_order?: number
          funnel_code?: string
          id?: string
          metrics?: Json
          updated_at?: string
        }
        Relationships: []
      }
      funnel_configs: {
        Row: {
          client_id: string
          created_at: string
          custom_label: string | null
          funnel_code: string
          id: string
          notes: string | null
          stages: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          custom_label?: string | null
          funnel_code: string
          id?: string
          notes?: string | null
          stages?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          custom_label?: string | null
          funnel_code?: string
          id?: string
          notes?: string | null
          stages?: Json
          updated_at?: string
        }
        Relationships: []
      }
      funnel_dated_notes: {
        Row: {
          author: string | null
          client_id: string
          content: string
          created_at: string
          funnel_code: string
          id: string
          note_date: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          client_id: string
          content?: string
          created_at?: string
          funnel_code: string
          id?: string
          note_date?: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          client_id?: string
          content?: string
          created_at?: string
          funnel_code?: string
          id?: string
          note_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          date_preset: string
          id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          date_preset?: string
          id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          date_preset?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_stages: {
        Row: {
          campaign_id: string | null
          client_id: string
          created_at: string
          id: string
          metric_key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          metric_key?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          metric_key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_stages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      google_tokens: {
        Row: {
          access_token: string
          client_id: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scopes: string[]
          updated_at: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads_cache: {
        Row: {
          client_id: string
          created_at: string
          date_preset: string
          expires_at: string
          id: string
          response_data: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          date_preset?: string
          expires_at?: string
          id?: string
          response_data?: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          date_preset?: string
          expires_at?: string
          id?: string
          response_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_cache_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      overview_layouts: {
        Row: {
          client_id: string
          created_at: string
          id: string
          layout: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sales_events: {
        Row: {
          buyer_email: string | null
          client_id: string
          created_at: string
          currency: string
          gross_amount: number
          id: string
          net_amount: number
          occurred_at: string
          platform: string
          product_id: string | null
          product_name: string | null
          raw_payload: Json | null
          status: string
          transaction_id: string
        }
        Insert: {
          buyer_email?: string | null
          client_id: string
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          occurred_at: string
          platform: string
          product_id?: string | null
          product_name?: string | null
          raw_payload?: Json | null
          status?: string
          transaction_id: string
        }
        Update: {
          buyer_email?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          occurred_at?: string
          platform?: string
          product_id?: string | null
          product_name?: string | null
          raw_payload?: Json | null
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_webhook_config: {
        Row: {
          client_id: string
          created_at: string
          id: string
          product_filters: Json
          updated_at: string
          webhook_token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          product_filters?: Json
          updated_at?: string
          webhook_token?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          product_filters?: Json
          updated_at?: string
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_webhook_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_insights: {
        Row: {
          client_id: string
          content: string
          created_at: string
          date_preset: string
          id: string
          is_manual: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          date_preset?: string
          id?: string
          is_manual?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          date_preset?: string
          id?: string
          is_manual?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_insights_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sheets_sync_log: {
        Row: {
          client_id: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          rows_read: number
          rows_saved: number
          spreadsheet_id: string | null
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          client_id: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          rows_read?: number
          rows_saved?: number
          spreadsheet_id?: string | null
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Update: {
          client_id?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          rows_read?: number
          rows_saved?: number
          spreadsheet_id?: string | null
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_diagnostics: {
        Row: {
          client_id: string
          client_requests: string
          created_at: string
          date_preset: string
          id: string
          manager_actions: string
          negatives: string
          positives: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_requests?: string
          created_at?: string
          date_preset?: string
          id?: string
          manager_actions?: string
          negatives?: string
          positives?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_requests?: string
          created_at?: string
          date_preset?: string
          id?: string
          manager_actions?: string
          negatives?: string
          positives?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_metrics: {
        Row: {
          avg_ticket: number | null
          client_id: string
          created_at: string
          id: string
          investment: number | null
          leads: number | null
          low_ticket_google: number | null
          low_ticket_meta: number | null
          ltv: number | null
          mql: number | null
          product_code: string | null
          qualified_followers: number | null
          qualified_messages: number | null
          raw_row: Json | null
          reference_date: string
          revenue: number | null
          sales: number | null
          smql: number | null
          source: string
          updated_at: string
        }
        Insert: {
          avg_ticket?: number | null
          client_id: string
          created_at?: string
          id?: string
          investment?: number | null
          leads?: number | null
          low_ticket_google?: number | null
          low_ticket_meta?: number | null
          ltv?: number | null
          mql?: number | null
          product_code?: string | null
          qualified_followers?: number | null
          qualified_messages?: number | null
          raw_row?: Json | null
          reference_date: string
          revenue?: number | null
          sales?: number | null
          smql?: number | null
          source?: string
          updated_at?: string
        }
        Update: {
          avg_ticket?: number | null
          client_id?: string
          created_at?: string
          id?: string
          investment?: number | null
          leads?: number | null
          low_ticket_google?: number | null
          low_ticket_meta?: number | null
          ltv?: number | null
          mql?: number | null
          product_code?: string | null
          qualified_followers?: number | null
          qualified_messages?: number | null
          raw_row?: Json | null
          reference_date?: string
          revenue?: number | null
          sales?: number | null
          smql?: number | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_notes: {
        Row: {
          client_id: string
          created_at: string
          date_preset: string
          id: string
          next_actions: string
          updated_at: string
          what_we_did: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date_preset?: string
          id?: string
          next_actions?: string
          updated_at?: string
          what_we_did?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date_preset?: string
          id?: string
          next_actions?: string
          updated_at?: string
          what_we_did?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor"],
    },
  },
} as const
