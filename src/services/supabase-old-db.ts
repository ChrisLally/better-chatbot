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
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      ai_models: {
        Row: {
          base_context_window: number;
          capabilities: Database["public"]["Enums"]["ai_model_capability_enum"][];
          created_at: string | null;
          description: string | null;
          display_name: string;
          id: string;
          model_identifier: string;
        };
        Insert: {
          base_context_window: number;
          capabilities: Database["public"]["Enums"]["ai_model_capability_enum"][];
          created_at?: string | null;
          description?: string | null;
          display_name: string;
          id?: string;
          model_identifier: string;
        };
        Update: {
          base_context_window?: number;
          capabilities?: Database["public"]["Enums"]["ai_model_capability_enum"][];
          created_at?: string | null;
          description?: string | null;
          display_name?: string;
          id?: string;
          model_identifier?: string;
        };
        Relationships: [];
      };
      artifacts: {
        Row: {
          approved_by_user_id: string | null;
          content: string | null;
          content_format: Database["public"]["Enums"]["artifact_format_enum"];
          created_at: string;
          created_by_user_id: string;
          description: string | null;
          id: string;
          project_id: string | null;
          source_project_task_step_id: string;
          status: Database["public"]["Enums"]["artifact_status_enum"];
          storage_type: Database["public"]["Enums"]["artifact_storage_type_enum"];
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          approved_by_user_id?: string | null;
          content?: string | null;
          content_format?: Database["public"]["Enums"]["artifact_format_enum"];
          created_at?: string;
          created_by_user_id: string;
          description?: string | null;
          id?: string;
          project_id?: string | null;
          source_project_task_step_id: string;
          status?: Database["public"]["Enums"]["artifact_status_enum"];
          storage_type?: Database["public"]["Enums"]["artifact_storage_type_enum"];
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          approved_by_user_id?: string | null;
          content?: string | null;
          content_format?: Database["public"]["Enums"]["artifact_format_enum"];
          created_at?: string;
          created_by_user_id?: string;
          description?: string | null;
          id?: string;
          project_id?: string | null;
          source_project_task_step_id?: string;
          status?: Database["public"]["Enums"]["artifact_status_enum"];
          storage_type?: Database["public"]["Enums"]["artifact_storage_type_enum"];
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artifacts_approved_by_user_id_fkey";
            columns: ["approved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifacts_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifacts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifacts_source_project_task_step_id_fkey";
            columns: ["source_project_task_step_id"];
            isOneToOne: false;
            referencedRelation: "project_task_steps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifacts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_members: {
        Row: {
          chat_id: string;
          id: string;
          joined_at: string | null;
          last_read_at: string | null;
          role: Database["public"]["Enums"]["chat_member_role_enum"];
          user_id: string;
        };
        Insert: {
          chat_id: string;
          id?: string;
          joined_at?: string | null;
          last_read_at?: string | null;
          role?: Database["public"]["Enums"]["chat_member_role_enum"];
          user_id: string;
        };
        Update: {
          chat_id?: string;
          id?: string;
          joined_at?: string | null;
          last_read_at?: string | null;
          role?: Database["public"]["Enums"]["chat_member_role_enum"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channel_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_message_mentions: {
        Row: {
          created_at: string | null;
          id: string;
          mentioned_artifact_id: string | null;
          mentioned_user_id: string | null;
          message_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          mentioned_artifact_id?: string | null;
          mentioned_user_id?: string | null;
          message_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          mentioned_artifact_id?: string | null;
          mentioned_user_id?: string | null;
          message_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_message_mentions_mentioned_artifact_id_fkey";
            columns: ["mentioned_artifact_id"];
            isOneToOne: false;
            referencedRelation: "artifacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_message_mentions_mentioned_user_id_fkey";
            columns: ["mentioned_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_mentions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_message_reactions: {
        Row: {
          created_at: string | null;
          id: string;
          message_id: string;
          reaction_type: Database["public"]["Enums"]["chat_message_reaction_type_enum"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          message_id: string;
          reaction_type: Database["public"]["Enums"]["chat_message_reaction_type_enum"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          message_id?: string;
          reaction_type?: Database["public"]["Enums"]["chat_message_reaction_type_enum"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          chat_id: string;
          content: string;
          created_at: string | null;
          id: string;
          is_edited: boolean | null;
          is_new_topic: boolean | null;
          parent_id: string | null;
          project_task_step_id: string | null;
          thread_id: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          chat_id: string;
          content: string;
          created_at?: string | null;
          id?: string;
          is_edited?: boolean | null;
          is_new_topic?: boolean | null;
          parent_id?: string | null;
          project_task_step_id?: string | null;
          thread_id?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          chat_id?: string;
          content?: string;
          created_at?: string | null;
          id?: string;
          is_edited?: boolean | null;
          is_new_topic?: boolean | null;
          parent_id?: string | null;
          project_task_step_id?: string | null;
          thread_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_task_step_id_fkey";
            columns: ["project_task_step_id"];
            isOneToOne: false;
            referencedRelation: "project_task_steps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_channel_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      chats: {
        Row: {
          active_task_id: string | null;
          archived_at: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          is_group_chat: boolean | null;
          name: string | null;
          primary_project_id: string;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          active_task_id?: string | null;
          archived_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_group_chat?: boolean | null;
          name?: string | null;
          primary_project_id: string;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          active_task_id?: string | null;
          archived_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_group_chat?: boolean | null;
          name?: string | null;
          primary_project_id?: string;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channels_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chats_active_task_id_fkey";
            columns: ["active_task_id"];
            isOneToOne: false;
            referencedRelation: "project_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chats_project_id_fkey";
            columns: ["primary_project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      project_task_dependencies: {
        Row: {
          blocked_project_task_id: string;
          blocking_project_task_id: string;
          created_at: string | null;
          id: string;
        };
        Insert: {
          blocked_project_task_id: string;
          blocking_project_task_id: string;
          created_at?: string | null;
          id?: string;
        };
        Update: {
          blocked_project_task_id?: string;
          blocking_project_task_id?: string;
          created_at?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_task_dependencies_blocked_project_task_id_fkey";
            columns: ["blocked_project_task_id"];
            isOneToOne: false;
            referencedRelation: "project_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_task_dependencies_blocking_project_task_id_fkey";
            columns: ["blocking_project_task_id"];
            isOneToOne: false;
            referencedRelation: "project_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      project_task_steps: {
        Row: {
          ai_model_id: string | null;
          assigned_by_user_id: string;
          assigned_user_id: string;
          available_tools: Json | null;
          chat_id: string | null;
          chat_message_id: string | null;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          error_message: string | null;
          finish_reason: string | null;
          generation_duration_ms: number | null;
          id: string;
          input_message_count: number | null;
          name: string;
          next_step_context: string | null;
          next_step_instructions: string | null;
          project_task_id: string;
          response_text: string | null;
          span_id: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["orchestration_status_enum"];
          system_prompt: string | null;
          temperature: number | null;
          trace_id: string | null;
          updated_at: string;
          usage_input_tokens: number | null;
          usage_output_tokens: number | null;
          usage_reasoning_tokens: number | null;
          usage_total_tokens: number | null;
        };
        Insert: {
          ai_model_id?: string | null;
          assigned_by_user_id: string;
          assigned_user_id: string;
          available_tools?: Json | null;
          chat_id?: string | null;
          chat_message_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          error_message?: string | null;
          finish_reason?: string | null;
          generation_duration_ms?: number | null;
          id?: string;
          input_message_count?: number | null;
          name: string;
          next_step_context?: string | null;
          next_step_instructions?: string | null;
          project_task_id: string;
          response_text?: string | null;
          span_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["orchestration_status_enum"];
          system_prompt?: string | null;
          temperature?: number | null;
          trace_id?: string | null;
          updated_at?: string;
          usage_input_tokens?: number | null;
          usage_output_tokens?: number | null;
          usage_reasoning_tokens?: number | null;
          usage_total_tokens?: number | null;
        };
        Update: {
          ai_model_id?: string | null;
          assigned_by_user_id?: string;
          assigned_user_id?: string;
          available_tools?: Json | null;
          chat_id?: string | null;
          chat_message_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          error_message?: string | null;
          finish_reason?: string | null;
          generation_duration_ms?: number | null;
          id?: string;
          input_message_count?: number | null;
          name?: string;
          next_step_context?: string | null;
          next_step_instructions?: string | null;
          project_task_id?: string;
          response_text?: string | null;
          span_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["orchestration_status_enum"];
          system_prompt?: string | null;
          temperature?: number | null;
          trace_id?: string | null;
          updated_at?: string;
          usage_input_tokens?: number | null;
          usage_output_tokens?: number | null;
          usage_reasoning_tokens?: number | null;
          usage_total_tokens?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_task_steps_ai_model_id_fkey";
            columns: ["ai_model_id"];
            isOneToOne: false;
            referencedRelation: "ai_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_task_steps_assigned_by_user_id_fkey";
            columns: ["assigned_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_task_steps_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_task_steps_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_task_steps_chat_message_id_fkey";
            columns: ["chat_message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_task_steps_project_task_id_fkey";
            columns: ["project_task_id"];
            isOneToOne: false;
            referencedRelation: "project_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      project_tasks: {
        Row: {
          actual_hours: number | null;
          assigned_by_user_id: string;
          assigned_user_id: string;
          completed_at: string | null;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          estimated_hours: number | null;
          id: string;
          parent_project_task_id: string | null;
          priority:
            | Database["public"]["Enums"]["project_task_priority_enum"]
            | null;
          project_id: string;
          started_at: string | null;
          status: Database["public"]["Enums"]["orchestration_status_enum"];
          title: string;
          updated_at: string | null;
        };
        Insert: {
          actual_hours?: number | null;
          assigned_by_user_id: string;
          assigned_user_id: string;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          estimated_hours?: number | null;
          id?: string;
          parent_project_task_id?: string | null;
          priority?:
            | Database["public"]["Enums"]["project_task_priority_enum"]
            | null;
          project_id: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["orchestration_status_enum"];
          title: string;
          updated_at?: string | null;
        };
        Update: {
          actual_hours?: number | null;
          assigned_by_user_id?: string;
          assigned_user_id?: string;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          estimated_hours?: number | null;
          id?: string;
          parent_project_task_id?: string | null;
          priority?:
            | Database["public"]["Enums"]["project_task_priority_enum"]
            | null;
          project_id?: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["orchestration_status_enum"];
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_project_tasks_assigned_by_user_id";
            columns: ["assigned_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_project_tasks_assigned_user_id";
            columns: ["assigned_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_tasks_parent_project_task_id_fkey";
            columns: ["parent_project_task_id"];
            isOneToOne: false;
            referencedRelation: "project_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_teams: {
        Row: {
          created_at: string | null;
          id: string;
          project_id: string;
          team_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          project_id: string;
          team_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          project_id?: string;
          team_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_teams_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_teams_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string | null;
          created_by_user_id: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          name: string;
          priority:
            | Database["public"]["Enums"]["project_task_priority_enum"]
            | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status_enum"];
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          name: string;
          priority?:
            | Database["public"]["Enums"]["project_task_priority_enum"]
            | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status_enum"];
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          name?: string;
          priority?:
            | Database["public"]["Enums"]["project_task_priority_enum"]
            | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status_enum"];
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          id: string;
          joined_at: string | null;
          team_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string | null;
          team_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string | null;
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_calls: {
        Row: {
          arguments: Json;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          is_error: boolean;
          metadata: Json | null;
          output: Json | null;
          project_task_step_id: string | null;
          started_at: string | null;
          tool_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          arguments: Json;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_error?: boolean;
          metadata?: Json | null;
          output?: Json | null;
          project_task_step_id?: string | null;
          started_at?: string | null;
          tool_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          arguments?: Json;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_error?: boolean;
          metadata?: Json | null;
          output?: Json | null;
          project_task_step_id?: string | null;
          started_at?: string | null;
          tool_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tool_calls_project_task_step_id_fkey";
            columns: ["project_task_step_id"];
            isOneToOne: false;
            referencedRelation: "project_task_steps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tool_calls_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_parameters: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_required: boolean | null;
          name: string;
          tool_id: string | null;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_required?: boolean | null;
          name: string;
          tool_id?: string | null;
          type: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_required?: boolean | null;
          name?: string;
          tool_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tool_parameters_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
        ];
      };
      tools: {
        Row: {
          created_at: string | null;
          description: string;
          id: string;
          javascript: string | null;
          name: string;
          requires_sandbox: boolean | null;
          typescript: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          id?: string;
          javascript?: string | null;
          name: string;
          requires_sandbox?: boolean | null;
          typescript?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          id?: string;
          javascript?: string | null;
          name?: string;
          requires_sandbox?: boolean | null;
          typescript?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_permissions: {
        Row: {
          agent_users_configure: boolean | null;
          agent_users_create: boolean | null;
          chats_add_members: boolean | null;
          chats_create: boolean | null;
          chats_remove_members: boolean | null;
          created_at: string | null;
          projects_create: boolean | null;
          projects_delete: boolean | null;
          projects_update: boolean | null;
          tasks_assign: boolean | null;
          tasks_create: boolean | null;
          tasks_delete: boolean | null;
          tasks_update: boolean | null;
          teams_add_members: boolean | null;
          teams_create: boolean | null;
          teams_delete: boolean | null;
          teams_remove_members: boolean | null;
          tools_create: boolean | null;
          tools_execute_sandbox: boolean | null;
          tools_manage: boolean | null;
          updated_at: string | null;
          user_id: string;
          workspace_id: string | null;
          workspace_manage_members: boolean | null;
          workspace_update: boolean | null;
        };
        Insert: {
          agent_users_configure?: boolean | null;
          agent_users_create?: boolean | null;
          chats_add_members?: boolean | null;
          chats_create?: boolean | null;
          chats_remove_members?: boolean | null;
          created_at?: string | null;
          projects_create?: boolean | null;
          projects_delete?: boolean | null;
          projects_update?: boolean | null;
          tasks_assign?: boolean | null;
          tasks_create?: boolean | null;
          tasks_delete?: boolean | null;
          tasks_update?: boolean | null;
          teams_add_members?: boolean | null;
          teams_create?: boolean | null;
          teams_delete?: boolean | null;
          teams_remove_members?: boolean | null;
          tools_create?: boolean | null;
          tools_execute_sandbox?: boolean | null;
          tools_manage?: boolean | null;
          updated_at?: string | null;
          user_id: string;
          workspace_id?: string | null;
          workspace_manage_members?: boolean | null;
          workspace_update?: boolean | null;
        };
        Update: {
          agent_users_configure?: boolean | null;
          agent_users_create?: boolean | null;
          chats_add_members?: boolean | null;
          chats_create?: boolean | null;
          chats_remove_members?: boolean | null;
          created_at?: string | null;
          projects_create?: boolean | null;
          projects_delete?: boolean | null;
          projects_update?: boolean | null;
          tasks_assign?: boolean | null;
          tasks_create?: boolean | null;
          tasks_delete?: boolean | null;
          tasks_update?: boolean | null;
          teams_add_members?: boolean | null;
          teams_create?: boolean | null;
          teams_delete?: boolean | null;
          teams_remove_members?: boolean | null;
          tools_create?: boolean | null;
          tools_execute_sandbox?: boolean | null;
          tools_manage?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
          workspace_id?: string | null;
          workspace_manage_members?: boolean | null;
          workspace_update?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_permissions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      user_tools: {
        Row: {
          created_at: string | null;
          tool_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          tool_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          tool_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_tools_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_tools_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          agent_email: string | null;
          agent_jwt: string | null;
          agent_jwt_expires_at: string | null;
          avatar_url: string | null;
          created_at: string | null;
          current_workspace_id: string | null;
          decision_making_authority: string | null;
          expertise_areas: string[] | null;
          id: string;
          name: string;
          professional_mission: string | null;
          professional_title: string | null;
          timezone: string | null;
          updated_at: string | null;
          user_type:
            | Database["public"]["Enums"]["platform_user_type_enum"]
            | null;
          webhook_body: Json | null;
          webhook_headers: Json | null;
          webhook_url: string | null;
        };
        Insert: {
          agent_email?: string | null;
          agent_jwt?: string | null;
          agent_jwt_expires_at?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          current_workspace_id?: string | null;
          decision_making_authority?: string | null;
          expertise_areas?: string[] | null;
          id?: string;
          name: string;
          professional_mission?: string | null;
          professional_title?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_type?:
            | Database["public"]["Enums"]["platform_user_type_enum"]
            | null;
          webhook_body?: Json | null;
          webhook_headers?: Json | null;
          webhook_url?: string | null;
        };
        Update: {
          agent_email?: string | null;
          agent_jwt?: string | null;
          agent_jwt_expires_at?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          current_workspace_id?: string | null;
          decision_making_authority?: string | null;
          expertise_areas?: string[] | null;
          id?: string;
          name?: string;
          professional_mission?: string | null;
          professional_title?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_type?:
            | Database["public"]["Enums"]["platform_user_type_enum"]
            | null;
          webhook_body?: Json | null;
          webhook_headers?: Json | null;
          webhook_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_current_workspace_id_fkey";
            columns: ["current_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_ai_models: {
        Row: {
          ai_model_id: string;
          created_at: string;
          id: string;
          is_model_enabled: boolean;
          provider: Database["public"]["Enums"]["ai_model_provider_enum"];
          workspace_id: string;
        };
        Insert: {
          ai_model_id: string;
          created_at?: string;
          id?: string;
          is_model_enabled?: boolean;
          provider: Database["public"]["Enums"]["ai_model_provider_enum"];
          workspace_id: string;
        };
        Update: {
          ai_model_id?: string;
          created_at?: string;
          id?: string;
          is_model_enabled?: boolean;
          provider?: Database["public"]["Enums"]["ai_model_provider_enum"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_ai_models_ai_model_id_fkey";
            columns: ["ai_model_id"];
            isOneToOne: false;
            referencedRelation: "ai_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_ai_models_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          id: string;
          joined_at: string | null;
          role: Database["public"]["Enums"]["workspace_member_role_enum"];
          user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string | null;
          role?: Database["public"]["Enums"]["workspace_member_role_enum"];
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string | null;
          role?: Database["public"]["Enums"]["workspace_member_role_enum"];
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string | null;
          default_project_id: string | null;
          description: string | null;
          id: string;
          lead_agent_user_id: string | null;
          name: string;
          organization_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          default_project_id?: string | null;
          description?: string | null;
          id?: string;
          lead_agent_user_id?: string | null;
          name: string;
          organization_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          default_project_id?: string | null;
          description?: string | null;
          id?: string;
          lead_agent_user_id?: string | null;
          name?: string;
          organization_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_default_project_id_fkey";
            columns: ["default_project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspaces_lead_agent_user_id_fkey";
            columns: ["lead_agent_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspaces_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
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
      ai_model_capability_enum:
        | "text"
        | "vision"
        | "function_calling"
        | "code_execution"
        | "audio"
        | "video"
        | "grounding"
        | "thinking";
      ai_model_provider_enum: "google";
      artifact_format_enum: "markdown" | "json" | "code" | "text";
      artifact_status_enum: "draft" | "under_review" | "approved" | "archived";
      artifact_storage_type_enum:
        | "database"
        | "git_repository"
        | "object_storage"
        | "web_document";
      chat_member_role_enum: "member" | "admin" | "moderator";
      chat_message_reaction_type_enum:
        | "heart"
        | "like"
        | "dislike"
        | "laugh"
        | "emphasize"
        | "question";
      orchestration_status_enum:
        | "draft"
        | "ready"
        | "working"
        | "completed"
        | "failed";
      platform_user_type_enum: "human" | "agent";
      project_status_enum: "active" | "archived" | "completed";
      project_task_priority_enum: "low" | "medium" | "high" | "urgent";
      user_role_scope_type_enum: "workspace" | "team" | "project" | "chat";
      workspace_member_role_enum: "admin" | "member" | "viewer";
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
      ai_model_capability_enum: [
        "text",
        "vision",
        "function_calling",
        "code_execution",
        "audio",
        "video",
        "grounding",
        "thinking",
      ],
      ai_model_provider_enum: ["google"],
      artifact_format_enum: ["markdown", "json", "code", "text"],
      artifact_status_enum: ["draft", "under_review", "approved", "archived"],
      artifact_storage_type_enum: [
        "database",
        "git_repository",
        "object_storage",
        "web_document",
      ],
      chat_member_role_enum: ["member", "admin", "moderator"],
      chat_message_reaction_type_enum: [
        "heart",
        "like",
        "dislike",
        "laugh",
        "emphasize",
        "question",
      ],
      orchestration_status_enum: [
        "draft",
        "ready",
        "working",
        "completed",
        "failed",
      ],
      platform_user_type_enum: ["human", "agent"],
      project_status_enum: ["active", "archived", "completed"],
      project_task_priority_enum: ["low", "medium", "high", "urgent"],
      user_role_scope_type_enum: ["workspace", "team", "project", "chat"],
      workspace_member_role_enum: ["admin", "member", "viewer"],
    },
  },
} as const;
