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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      employee_warnings: {
        Row: {
          admin_id: string
          created_at: string
          employee_id: string
          id: string
          machine_id: string | null
          message: string
          read: boolean
          warning_type: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          employee_id: string
          id?: string
          machine_id?: string | null
          message: string
          read?: boolean
          warning_type?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          machine_id?: string | null
          message?: string
          read?: boolean
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_warnings_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          machine_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          machine_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          machine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_access_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_instructions: {
        Row: {
          content: string
          created_at: string
          id: string
          machine_id: string
          step_number: number
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          machine_id: string
          step_number?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          machine_id?: string
          step_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_instructions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_warnings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: string
          created_at: string
          id: string
          is_approved: boolean
          machine_id: string
          order_index: number
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          machine_id: string
          order_index?: number
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          machine_id?: string
          order_index?: number
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_warnings_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          common_injury: string
          created_at: string
          description: string | null
          icon: string
          id: string
          manual_url: string | null
          name: string
          question_count: number
          recertification_days: number
          safety_warning: string
          updated_at: string
        }
        Insert: {
          common_injury?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          manual_url?: string | null
          name: string
          question_count?: number
          recertification_days?: number
          safety_warning?: string
          updated_at?: string
        }
        Update: {
          common_injury?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          manual_url?: string | null
          name?: string
          question_count?: number
          recertification_days?: number
          safety_warning?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          employee_id: string | null
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      safety_logs: {
        Row: {
          category: Database["public"]["Enums"]["question_category"] | null
          correct_answers: number | null
          employee_id: string
          id: string
          machine_id: string
          status: string
          timestamp: string
          total_questions: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["question_category"] | null
          correct_answers?: number | null
          employee_id: string
          id?: string
          machine_id: string
          status?: string
          timestamp?: string
          total_questions?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["question_category"] | null
          correct_answers?: number | null
          employee_id?: string
          id?: string
          machine_id?: string
          status?: string
          timestamp?: string
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_questions: {
        Row: {
          category: Database["public"]["Enums"]["question_category"]
          correct_answer: boolean
          created_at: string
          id: string
          machine_id: string
          order_index: number
          question: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["question_category"]
          correct_answer?: boolean
          created_at?: string
          id?: string
          machine_id: string
          order_index?: number
          question: string
        }
        Update: {
          category?: Database["public"]["Enums"]["question_category"]
          correct_answer?: boolean
          created_at?: string
          id?: string
          machine_id?: string
          order_index?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_questions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_progress: {
        Row: {
          created_at: string
          id: string
          instructions_completed: boolean
          instructions_completed_at: string | null
          machine_id: string
          quiz_unlocked: boolean
          updated_at: string
          user_id: string
          warnings_completed: boolean
          warnings_completed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instructions_completed?: boolean
          instructions_completed_at?: string | null
          machine_id: string
          quiz_unlocked?: boolean
          updated_at?: string
          user_id: string
          warnings_completed?: boolean
          warnings_completed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instructions_completed?: boolean
          instructions_completed_at?: string | null
          machine_id?: string
          quiz_unlocked?: boolean
          updated_at?: string
          user_id?: string
          warnings_completed?: boolean
          warnings_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_progress_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_warning_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          liability_acknowledged: boolean
          read_acknowledged: boolean
          user_id: string
          warning_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          liability_acknowledged?: boolean
          read_acknowledged?: boolean
          user_id: string
          warning_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          liability_acknowledged?: boolean
          read_acknowledged?: boolean
          user_id?: string
          warning_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warning_acknowledgments_warning_id_fkey"
            columns: ["warning_id"]
            isOneToOne: false
            referencedRelation: "machine_warnings"
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
      app_role: "admin" | "user"
      question_category: "safety" | "usage"
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
      app_role: ["admin", "user"],
      question_category: ["safety", "usage"],
    },
  },
} as const
