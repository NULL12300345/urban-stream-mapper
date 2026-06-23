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
      algorithm_runs: {
        Row: {
          algorithm: Database["public"]["Enums"]["algorithm_type"]
          avg_wait_seconds: number | null
          congestion_score: number | null
          created_by: string | null
          ended_at: string | null
          id: string
          started_at: string
          vehicles_passed: number | null
        }
        Insert: {
          algorithm: Database["public"]["Enums"]["algorithm_type"]
          avg_wait_seconds?: number | null
          congestion_score?: number | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          vehicles_passed?: number | null
        }
        Update: {
          algorithm?: Database["public"]["Enums"]["algorithm_type"]
          avg_wait_seconds?: number | null
          congestion_score?: number | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          vehicles_passed?: number | null
        }
        Relationships: []
      }
      emergency_events: {
        Row: {
          created_by: string | null
          ended_at: string | null
          id: string
          route: Json
          started_at: string
        }
        Insert: {
          created_by?: string | null
          ended_at?: string | null
          id?: string
          route: Json
          started_at?: string
        }
        Update: {
          created_by?: string | null
          ended_at?: string | null
          id?: string
          route?: Json
          started_at?: string
        }
        Relationships: []
      }
      intersections: {
        Row: {
          active: boolean
          algorithm: Database["public"]["Enums"]["algorithm_type"]
          approaches: Json
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          algorithm?: Database["public"]["Enums"]["algorithm_type"]
          approaches?: Json
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          algorithm?: Database["public"]["Enums"]["algorithm_type"]
          approaches?: Json
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      simulation_logs: {
        Row: {
          id: string
          level: string
          message: string
          meta: Json | null
          ts: string
        }
        Insert: {
          id?: string
          level: string
          message: string
          meta?: Json | null
          ts?: string
        }
        Update: {
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          ts?: string
        }
        Relationships: []
      }
      stat_snapshots: {
        Row: {
          algorithm: Database["public"]["Enums"]["algorithm_type"]
          avg_wait_seconds: number
          congestion_score: number
          emergency_active: boolean
          id: string
          taken_at: string
          total_vehicles: number
          vehicles_passed: number
        }
        Insert: {
          algorithm: Database["public"]["Enums"]["algorithm_type"]
          avg_wait_seconds: number
          congestion_score: number
          emergency_active?: boolean
          id?: string
          taken_at?: string
          total_vehicles: number
          vehicles_passed: number
        }
        Update: {
          algorithm?: Database["public"]["Enums"]["algorithm_type"]
          avg_wait_seconds?: number
          congestion_score?: number
          emergency_active?: boolean
          id?: string
          taken_at?: string
          total_vehicles?: number
          vehicles_passed?: number
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
      algorithm_type: "fixed" | "greedy"
      app_role: "admin" | "viewer"
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
      algorithm_type: ["fixed", "greedy"],
      app_role: ["admin", "viewer"],
    },
  },
} as const
