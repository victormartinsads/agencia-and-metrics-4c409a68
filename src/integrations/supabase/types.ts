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
      campaign_drafts: {
        Row: {
          ad_account_id: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          meta_campaign_id: string | null
          prompt: string
          publish_error: string | null
          status: string
          structure: Json
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          meta_campaign_id?: string | null
          prompt: string
          publish_error?: string | null
          status?: string
          structure?: Json
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          meta_campaign_id?: string | null
          prompt?: string
          publish_error?: string | null
          status?: string
          structure?: Json
          updated_at?: string
        }
        Relationships: []
      }
      client_assignments: {
        Row: {
          assigned_by: string | null
          client_id: string
          created_at: string
          id: string
          is_favorite: boolean
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          user_id?: string
        }
        Relationships: []
      }
      client_manager_meta: {
        Row: {
          client_id: string
          health_score: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          health_score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          health_score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_manager_meta_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sheets: {
        Row: {
          client_id: string
          created_at: string
          field_mapping: Json
          header_row: number
          id: string
          last_sync_error: string | null
          last_sync_rows: number | null
          last_sync_status: string | null
          last_synced_at: string | null
          name: string
          range_a1: string | null
          sheet_name: string
          spreadsheet_id: string
          spreadsheet_url: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          field_mapping?: Json
          header_row?: number
          id?: string
          last_sync_error?: string | null
          last_sync_rows?: number | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          name: string
          range_a1?: string | null
          sheet_name?: string
          spreadsheet_id: string
          spreadsheet_url?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          field_mapping?: Json
          header_row?: number
          id?: string
          last_sync_error?: string | null
          last_sync_rows?: number | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          name?: string
          range_a1?: string | null
          sheet_name?: string
          spreadsheet_id?: string
          spreadsheet_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_tasks: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          ad_account_ids: string[]
          archived_at: string | null
          budget_alert_threshold_pct: number | null
          cpa_alert_multiplier: number | null
          created_at: string
          currency_symbol: string
          ga_property_id: string | null
          google_ads_customer_id: string | null
          id: string
          lead_action_types: string[]
          logo_url: string | null
          meta_access_token: string
          monthly_revenue: number | null
          name: string
          slug: string
          target_cpa_lead: number | null
          target_cpa_purchase: number | null
          updated_at: string
          visible_tabs: Json
        }
        Insert: {
          ad_account_ids?: string[]
          archived_at?: string | null
          budget_alert_threshold_pct?: number | null
          cpa_alert_multiplier?: number | null
          created_at?: string
          currency_symbol?: string
          ga_property_id?: string | null
          google_ads_customer_id?: string | null
          id?: string
          lead_action_types?: string[]
          logo_url?: string | null
          meta_access_token: string
          monthly_revenue?: number | null
          name: string
          slug: string
          target_cpa_lead?: number | null
          target_cpa_purchase?: number | null
          updated_at?: string
          visible_tabs?: Json
        }
        Update: {
          ad_account_ids?: string[]
          archived_at?: string | null
          budget_alert_threshold_pct?: number | null
          cpa_alert_multiplier?: number | null
          created_at?: string
          currency_symbol?: string
          ga_property_id?: string | null
          google_ads_customer_id?: string | null
          id?: string
          lead_action_types?: string[]
          logo_url?: string | null
          meta_access_token?: string
          monthly_revenue?: number | null
          name?: string
          slug?: string
          target_cpa_lead?: number | null
          target_cpa_purchase?: number | null
          updated_at?: string
          visible_tabs?: Json
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
      crm_lead_events: {
        Row: {
          client_id: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          metadata: Json | null
          type: string
        }
        Insert: {
          client_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          type: string
        }
        Update: {
          client_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          client_id: string
          closed_at: string | null
          created_at: string
          currency: string
          custom_fields: Json
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          sales_event_id: string | null
          source: string | null
          stage_id: string | null
          tags: Json
          updated_at: string
          value: number
        }
        Insert: {
          client_id: string
          closed_at?: string | null
          created_at?: string
          currency?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          sales_event_id?: string | null
          source?: string | null
          stage_id?: string | null
          tags?: Json
          updated_at?: string
          value?: number
        }
        Update: {
          client_id?: string
          closed_at?: string | null
          created_at?: string
          currency?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          sales_event_id?: string | null
          source?: string | null
          stage_id?: string | null
          tags?: Json
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhook_config: {
        Row: {
          client_id: string
          created_at: string
          default_stage_id: string | null
          id: string
          updated_at: string
          webhook_token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          default_stage_id?: string | null
          id?: string
          updated_at?: string
          webhook_token?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          default_stage_id?: string | null
          id?: string
          updated_at?: string
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhook_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhook_config_default_stage_id_fkey"
            columns: ["default_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_block_layouts: {
        Row: {
          client_id: string
          created_at: string
          dashboard_key: string
          id: string
          layout: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          dashboard_key: string
          id?: string
          layout?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          dashboard_key?: string
          id?: string
          layout?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_block_sources: {
        Row: {
          block_id: string
          client_id: string
          config: Json
          created_at: string
          dashboard_key: string
          id: string
          source_type: string
          updated_at: string
        }
        Insert: {
          block_id: string
          client_id: string
          config?: Json
          created_at?: string
          dashboard_key: string
          id?: string
          source_type?: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          client_id?: string
          config?: Json
          created_at?: string
          dashboard_key?: string
          id?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
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
      funnel_card_template_global: {
        Row: {
          funnel_code: string
          id: string
          metrics: Json
          updated_at: string
        }
        Insert: {
          funnel_code: string
          id?: string
          metrics?: Json
          updated_at?: string
        }
        Update: {
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
      funnel_diagnostics: {
        Row: {
          client_id: string
          created_at: string
          curve_data: Json
          diagnostics: Json
          funnel_code: string
          health_score: number
          id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          curve_data?: Json
          diagnostics?: Json
          funnel_code: string
          health_score?: number
          id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          curve_data?: Json
          diagnostics?: Json
          funnel_code?: string
          health_score?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      funnel_primary_metrics: {
        Row: {
          client_id: string
          created_at: string
          funnel_code: string
          id: string
          primary_metric: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          funnel_code: string
          id?: string
          primary_metric: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          funnel_code?: string
          id?: string
          primary_metric?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_primary_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      funnel_custom_labels: {
        Row: {
          client_id: string
          created_at: string
          funnel_code: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          funnel_code: string
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          funnel_code?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_custom_labels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      funnel_follow_mapping: {
        Row: {
          action_types: Json
          client_id: string
          funnel_code: string
          id: string
          updated_at: string
        }
        Insert: {
          action_types?: Json
          client_id: string
          funnel_code: string
          id?: string
          updated_at?: string
        }
        Update: {
          action_types?: Json
          client_id?: string
          funnel_code?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_lead_mapping: {
        Row: {
          action_types: Json
          client_id: string
          funnel_code: string
          id: string
          updated_at: string
        }
        Insert: {
          action_types?: Json
          client_id: string
          funnel_code: string
          id?: string
          updated_at?: string
        }
        Update: {
          action_types?: Json
          client_id?: string
          funnel_code?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_manual_groups: {
        Row: {
          client_id: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      funnel_manual_metrics: {
        Row: {
          client_id: string
          created_at: string
          display_order: number
          funnel_code: string
          id: string
          metric_format: string
          metric_label: string
          metric_value: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          display_order?: number
          funnel_code: string
          id?: string
          metric_format?: string
          metric_label: string
          metric_value?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          display_order?: number
          funnel_code?: string
          id?: string
          metric_format?: string
          metric_label?: string
          metric_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      funnel_metric_overrides: {
        Row: {
          client_id: string
          funnel_code: string
          id: string
          metric_key: string
          metric_value: number
          updated_at: string
        }
        Insert: {
          client_id: string
          funnel_code: string
          id?: string
          metric_key: string
          metric_value?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          funnel_code?: string
          id?: string
          metric_key?: string
          metric_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      funnel_metric_sources: {
        Row: {
          client_id: string
          created_at: string
          funnel_code: string
          id: string
          meta_action_type: string | null
          meta_campaign_id: string | null
          metric_key: string
          sheet_field: string | null
          sheet_product_code: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          funnel_code: string
          id?: string
          meta_action_type?: string | null
          meta_campaign_id?: string | null
          metric_key: string
          sheet_field?: string | null
          sheet_product_code?: string | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          funnel_code?: string
          id?: string
          meta_action_type?: string | null
          meta_campaign_id?: string | null
          metric_key?: string
          sheet_field?: string | null
          sheet_product_code?: string | null
          source_type?: string
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
      funnel_period_metrics: {
        Row: {
          client_id: string
          created_at: string
          funnel_code: string
          id: string
          metric_key: string
          metric_label: string
          metric_value: number
          period_end: string
          period_start: string
          source: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          funnel_code: string
          id?: string
          metric_key: string
          metric_label: string
          metric_value?: number
          period_end: string
          period_start: string
          source?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          funnel_code?: string
          id?: string
          metric_key?: string
          metric_label?: string
          metric_value?: number
          period_end?: string
          period_start?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
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
      meta_tokens: {
        Row: {
          access_token: string
          client_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          client_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          client_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted: boolean
          created_at: string
          email: string
          id: string
          invited_by: string | null
          organization_id: string | null
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          organization_id?: string | null
        }
        Update: {
          accepted?: boolean
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_custom_field_defs: {
        Row: {
          created_at: string
          field_type: string
          id: string
          key: string
          label: string
          organization_id: string
          pipeline_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          key: string
          label: string
          organization_id: string
          pipeline_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          key?: string
          label?: string
          organization_id?: string
          pipeline_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_custom_field_defs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          custom_fields: Json
          email: string | null
          fclid: string | null
          id: string
          instagram: string | null
          lead_score: number
          message: string | null
          name: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          pipeline_id: string | null
          product: string | null
          raw_data: Json | null
          source: string | null
          status: string
          tags: string[]
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_term: string | null
          value: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string | null
          fclid?: string | null
          id?: string
          instagram?: string | null
          lead_score?: number
          message?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          pipeline_id?: string | null
          product?: string | null
          raw_data?: Json | null
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_term?: string | null
          value?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string | null
          fclid?: string | null
          id?: string
          instagram?: string | null
          lead_score?: number
          message?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          pipeline_id?: string | null
          product?: string | null
          raw_data?: Json | null
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_term?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
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
      optimization_suggestions: {
        Row: {
          action: string
          applied_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          id: string
          level: string
          metadata: Json | null
          object_id: string
          object_name: string | null
          reason: string | null
          severity: string
          status: string
          suggested_value: number | null
          updated_at: string
        }
        Insert: {
          action: string
          applied_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          level: string
          metadata?: Json | null
          object_id: string
          object_name?: string | null
          reason?: string | null
          severity?: string
          status?: string
          suggested_value?: number | null
          updated_at?: string
        }
        Update: {
          action?: string
          applied_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          level?: string
          metadata?: Json | null
          object_id?: string
          object_name?: string | null
          reason?: string | null
          severity?: string
          status?: string
          suggested_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      outbound_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lead_id: string | null
          organization_id: string | null
          payload: Json | null
          response_body: string | null
          status_code: number | null
          success: boolean
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          payload?: Json | null
          response_body?: string | null
          status_code?: number | null
          success?: boolean
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          payload?: Json | null
          response_body?: string | null
          status_code?: number | null
          success?: boolean
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_events_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "outbound_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_webhooks: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          name: string
          organization_id: string | null
          pipeline_id: string | null
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          name?: string
          organization_id?: string | null
          pipeline_id?: string | null
          secret?: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          name?: string
          organization_id?: string | null
          pipeline_id?: string | null
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_webhooks_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
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
      overview_templates: {
        Row: {
          block_overrides: Json
          client_id: string
          created_at: string
          id: string
          template_key: string
          updated_at: string
        }
        Insert: {
          block_overrides?: Json
          client_id: string
          created_at?: string
          id?: string
          template_key?: string
          updated_at?: string
        }
        Update: {
          block_overrides?: Json
          client_id?: string
          created_at?: string
          id?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipelines: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          role_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          role_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          role_title?: string | null
          updated_at?: string
          user_id?: string
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
      saved_diagnostics: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          date_preset: string
          id: string
          period_end: string | null
          period_start: string | null
          slug: string | null
          snapshot: Json
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          date_preset: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          slug?: string | null
          snapshot?: Json
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_preset?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          slug?: string | null
          snapshot?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      webhook_tokens: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          field_mapping: Json
          id: string
          name: string
          organization_id: string | null
          pipeline_id: string | null
          token: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          field_mapping?: Json
          id?: string
          name?: string
          organization_id?: string | null
          pipeline_id?: string | null
          token?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          field_mapping?: Json
          id?: string
          name?: string
          organization_id?: string | null
          pipeline_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_tokens_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
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
      crm_ensure_defaults: { Args: { _client_id: string }; Returns: undefined }
      get_org_id_for_client: { Args: { _client_id: string }; Returns: string }
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      has_org_role_in: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_org: { Args: { _org_id: string }; Returns: boolean }
      is_member_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "client"
      org_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "editor", "client"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
