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
      dossiers: {
        Row: {
          amount: number
          assigned_to: string | null
          client_code: string
          created_at: string
          debtor_email: string | null
          debtor_name: string
          debtor_phone: string | null
          due_date: string | null
          id: string
          management_level: string | null
          notes: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          assigned_to?: string | null
          client_code: string
          created_at?: string
          debtor_email?: string | null
          debtor_name: string
          debtor_phone?: string | null
          due_date?: string | null
          id?: string
          management_level?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          assigned_to?: string | null
          client_code?: string
          created_at?: string
          debtor_email?: string | null
          debtor_name?: string
          debtor_phone?: string | null
          due_date?: string | null
          id?: string
          management_level?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dossiers_contentieux: {
        Row: {
          amount: number
          court_level: string
          created_at: string
          debtor_email: string | null
          debtor_name: string
          debtor_phone: string | null
          due_date: string | null
          estimated_legal_fees: number
          guarantee: string
          id: string
          last_acknowledgment_date: string | null
          lawyer_id: string | null
          observations: string | null
          recommendation: string | null
          reference: string | null
          source_file_name: string | null
          source_file_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          court_level?: string
          created_at?: string
          debtor_email?: string | null
          debtor_name: string
          debtor_phone?: string | null
          due_date?: string | null
          estimated_legal_fees?: number
          guarantee?: string
          id?: string
          last_acknowledgment_date?: string | null
          lawyer_id?: string | null
          observations?: string | null
          recommendation?: string | null
          reference?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          court_level?: string
          created_at?: string
          debtor_email?: string | null
          debtor_name?: string
          debtor_phone?: string | null
          due_date?: string | null
          estimated_legal_fees?: number
          guarantee?: string
          id?: string
          last_acknowledgment_date?: string | null
          lawyer_id?: string | null
          observations?: string | null
          recommendation?: string | null
          reference?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_contentieux_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyers: {
        Row: {
          created_at: string
          email: string | null
          firm: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          firm?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          firm?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      leasing_portfolio: {
        Row: {
          ai_confidence: number | null
          asset_description: string | null
          asset_type: string | null
          asset_value: number
          contract_ref: string | null
          contract_status: string
          created_at: string
          duration_months: number | null
          end_date: string | null
          id: string
          imported_at: string
          interest_rate: number | null
          lessee_email: string | null
          lessee_id: string | null
          lessee_name: string
          lessee_phone: string | null
          maturity_date: string | null
          monthly_rent: number
          next_payment_date: string | null
          notes: string | null
          overdue_amount: number
          overdue_days: number
          payment_frequency: string | null
          remaining_capital: number
          residual_value: number
          risk_level: string | null
          risk_score: number
          source_file_name: string | null
          source_file_url: string | null
          start_date: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          asset_description?: string | null
          asset_type?: string | null
          asset_value?: number
          contract_ref?: string | null
          contract_status?: string
          created_at?: string
          duration_months?: number | null
          end_date?: string | null
          id?: string
          imported_at?: string
          interest_rate?: number | null
          lessee_email?: string | null
          lessee_id?: string | null
          lessee_name: string
          lessee_phone?: string | null
          maturity_date?: string | null
          monthly_rent?: number
          next_payment_date?: string | null
          notes?: string | null
          overdue_amount?: number
          overdue_days?: number
          payment_frequency?: string | null
          remaining_capital?: number
          residual_value?: number
          risk_level?: string | null
          risk_score?: number
          source_file_name?: string | null
          source_file_url?: string | null
          start_date?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          asset_description?: string | null
          asset_type?: string | null
          asset_value?: number
          contract_ref?: string | null
          contract_status?: string
          created_at?: string
          duration_months?: number | null
          end_date?: string | null
          id?: string
          imported_at?: string
          interest_rate?: number | null
          lessee_email?: string | null
          lessee_id?: string | null
          lessee_name?: string
          lessee_phone?: string | null
          maturity_date?: string | null
          monthly_rent?: number
          next_payment_date?: string | null
          notes?: string | null
          overdue_amount?: number
          overdue_days?: number
          payment_frequency?: string | null
          remaining_capital?: number
          residual_value?: number
          risk_level?: string | null
          risk_score?: number
          source_file_name?: string | null
          source_file_url?: string | null
          start_date?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "manager" | "agent"
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
      app_role: ["admin", "manager", "agent"],
    },
  },
} as const
