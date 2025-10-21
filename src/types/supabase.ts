export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      account: {
        Row: {
          access_token: string | null;
          access_token_expires_at: string | null;
          account_id: string;
          created_at: string;
          id: string;
          id_token: string | null;
          password: string | null;
          provider_id: string;
          refresh_token: string | null;
          refresh_token_expires_at: string | null;
          scope: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token?: string | null;
          access_token_expires_at?: string | null;
          account_id: string;
          created_at?: string;
          id?: string;
          id_token?: string | null;
          password?: string | null;
          provider_id: string;
          refresh_token?: string | null;
          refresh_token_expires_at?: string | null;
          scope?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string | null;
          access_token_expires_at?: string | null;
          account_id?: string;
          created_at?: string;
          id?: string;
          id_token?: string | null;
          password?: string | null;
          provider_id?: string;
          refresh_token?: string | null;
          refresh_token_expires_at?: string | null;
          scope?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      agent: {
        Row: {
          created_at: string;
          description: string | null;
          icon: Json | null;
          id: string;
          instructions: Json | null;
          name: string;
          updated_at: string;
          user_id: string;
          visibility: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: Json | null;
          id?: string;
          instructions?: Json | null;
          name: string;
          updated_at?: string;
          user_id: string;
          visibility?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: Json | null;
          id?: string;
          instructions?: Json | null;
          name?: string;
          updated_at?: string;
          user_id?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      archive: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "archive_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      archive_item: {
        Row: {
          added_at: string;
          archive_id: string;
          id: string;
          item_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          archive_id: string;
          id?: string;
          item_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          archive_id?: string;
          id?: string;
          item_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "archive_item_archive_id_archive_id_fk";
            columns: ["archive_id"];
            isOneToOne: false;
            referencedRelation: "archive";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "archive_item_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      bookmark: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          item_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          item_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          item_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookmark_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_export: {
        Row: {
          expires_at: string | null;
          exported_at: string;
          exporter_id: string;
          id: string;
          messages: Json;
          original_thread_id: string | null;
          title: string;
        };
        Insert: {
          expires_at?: string | null;
          exported_at?: string;
          exporter_id: string;
          id?: string;
          messages: Json;
          original_thread_id?: string | null;
          title: string;
        };
        Update: {
          expires_at?: string | null;
          exported_at?: string;
          exporter_id?: string;
          id?: string;
          messages?: Json;
          original_thread_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_export_exporter_id_users_id_fk";
            columns: ["exporter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_export_comment: {
        Row: {
          author_id: string;
          content: Json;
          created_at: string;
          export_id: string;
          id: string;
          parent_id: string | null;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          content: Json;
          created_at?: string;
          export_id: string;
          id?: string;
          parent_id?: string | null;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          content?: Json;
          created_at?: string;
          export_id?: string;
          id?: string;
          parent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_export_comment_author_id_users_id_fk";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_export_comment_export_id_chat_export_id_fk";
            columns: ["export_id"];
            isOneToOne: false;
            referencedRelation: "chat_export";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_export_comment_parent_id_chat_export_comment_id_fk";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "chat_export_comment";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_message: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json | null;
          parts: Json[] | null;
          role: string;
          thread_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          metadata?: Json | null;
          parts?: Json[] | null;
          role: string;
          thread_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          parts?: Json[] | null;
          role?: string;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_message_thread_id_chat_thread_id_fk";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_thread";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_thread: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_thread_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_oauth_session: {
        Row: {
          client_info: Json | null;
          code_verifier: string | null;
          created_at: string;
          id: string;
          mcp_server_id: string;
          server_url: string;
          state: string | null;
          tokens: Json | null;
          updated_at: string;
        };
        Insert: {
          client_info?: Json | null;
          code_verifier?: string | null;
          created_at?: string;
          id?: string;
          mcp_server_id: string;
          server_url: string;
          state?: string | null;
          tokens?: Json | null;
          updated_at?: string;
        };
        Update: {
          client_info?: Json | null;
          code_verifier?: string | null;
          created_at?: string;
          id?: string;
          mcp_server_id?: string;
          server_url?: string;
          state?: string | null;
          tokens?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_session_mcp_server_id_mcp_server_id_fk";
            columns: ["mcp_server_id"];
            isOneToOne: false;
            referencedRelation: "mcp_server";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_server: {
        Row: {
          config: Json;
          created_at: string;
          enabled: boolean;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
          visibility: string;
        };
        Insert: {
          config: Json;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
          visibility?: string;
        };
        Update: {
          config?: Json;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_server_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_server_custom_instructions: {
        Row: {
          created_at: string;
          id: string;
          mcp_server_id: string;
          prompt: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mcp_server_id: string;
          prompt?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mcp_server_id?: string;
          prompt?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_server_custom_instructions_mcp_server_id_mcp_server_id_fk";
            columns: ["mcp_server_id"];
            isOneToOne: false;
            referencedRelation: "mcp_server";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mcp_server_custom_instructions_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_server_tool_custom_instructions: {
        Row: {
          created_at: string;
          id: string;
          mcp_server_id: string;
          prompt: string | null;
          tool_name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mcp_server_id: string;
          prompt?: string | null;
          tool_name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mcp_server_id?: string;
          prompt?: string | null;
          tool_name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_server_tool_custom_instructions_mcp_server_id_mcp_server_id";
            columns: ["mcp_server_id"];
            isOneToOne: false;
            referencedRelation: "mcp_server";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mcp_server_tool_custom_instructions_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      session: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          impersonated_by: string | null;
          ip_address: string | null;
          token: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          impersonated_by?: string | null;
          ip_address?: string | null;
          token: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          impersonated_by?: string | null;
          ip_address?: string | null;
          token?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          description: string | null;
          email: string;
          icon: Json | null;
          id: string;
          image: string | null;
          instructions: Json | null;
          name: string;
          preferences: Json | null;
          updated_at: string;
          user_type: Database["public"]["Enums"]["user_type_enum"];
          visibility: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          email: string;
          icon?: Json | null;
          id?: string;
          image?: string | null;
          instructions?: Json | null;
          name: string;
          preferences?: Json | null;
          updated_at?: string;
          user_type?: Database["public"]["Enums"]["user_type_enum"];
          visibility?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          email?: string;
          icon?: Json | null;
          id?: string;
          image?: string | null;
          instructions?: Json | null;
          name?: string;
          preferences?: Json | null;
          updated_at?: string;
          user_type?: Database["public"]["Enums"]["user_type_enum"];
          visibility?: string | null;
        };
        Relationships: [];
      };
      verification: {
        Row: {
          created_at: string | null;
          expires_at: string;
          id: string;
          identifier: string;
          updated_at: string | null;
          value: string;
        };
        Insert: {
          created_at?: string | null;
          expires_at: string;
          id?: string;
          identifier: string;
          updated_at?: string | null;
          value: string;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          identifier?: string;
          updated_at?: string | null;
          value?: string;
        };
        Relationships: [];
      };
      workflow: {
        Row: {
          created_at: string;
          description: string | null;
          icon: Json | null;
          id: string;
          is_published: boolean;
          name: string;
          updated_at: string;
          user_id: string;
          version: string;
          visibility: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: Json | null;
          id?: string;
          is_published?: boolean;
          name: string;
          updated_at?: string;
          user_id: string;
          version?: string;
          visibility?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: Json | null;
          id?: string;
          is_published?: boolean;
          name?: string;
          updated_at?: string;
          user_id?: string;
          version?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_edge: {
        Row: {
          created_at: string;
          id: string;
          source: string;
          target: string;
          ui_config: Json | null;
          version: string;
          workflow_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          source: string;
          target: string;
          ui_config?: Json | null;
          version?: string;
          workflow_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          source?: string;
          target?: string;
          ui_config?: Json | null;
          version?: string;
          workflow_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_edge_source_workflow_node_id_fk";
            columns: ["source"];
            isOneToOne: false;
            referencedRelation: "workflow_node";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_edge_target_workflow_node_id_fk";
            columns: ["target"];
            isOneToOne: false;
            referencedRelation: "workflow_node";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_edge_workflow_id_workflow_id_fk";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflow";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_node: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          kind: string;
          name: string;
          node_config: Json | null;
          ui_config: Json | null;
          updated_at: string;
          version: string;
          workflow_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          kind: string;
          name: string;
          node_config?: Json | null;
          ui_config?: Json | null;
          updated_at?: string;
          version?: string;
          workflow_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          kind?: string;
          name?: string;
          node_config?: Json | null;
          ui_config?: Json | null;
          updated_at?: string;
          version?: string;
          workflow_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_node_workflow_id_workflow_id_fk";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflow";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_type_enum: "human" | "agent";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      user_type_enum: ["human", "agent"],
    },
  },
} as const;
