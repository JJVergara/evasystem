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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ambassador_requests: {
        Row: {
          bio: string | null
          created_at: string
          follower_count: number | null
          id: string
          instagram_user_id: string | null
          instagram_username: string
          last_mention_at: string | null
          notes: string | null
          organization_id: string
          processed_at: string | null
          processed_by_user_id: string | null
          profile_picture_url: string | null
          rejection_reason: string | null
          source_mention_ids: string[] | null
          status: string | null
          total_mentions: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          instagram_user_id?: string | null
          instagram_username: string
          last_mention_at?: string | null
          notes?: string | null
          organization_id: string
          processed_at?: string | null
          processed_by_user_id?: string | null
          profile_picture_url?: string | null
          rejection_reason?: string | null
          source_mention_ids?: string[] | null
          status?: string | null
          total_mentions?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          instagram_user_id?: string | null
          instagram_username?: string
          last_mention_at?: string | null
          notes?: string | null
          organization_id?: string
          processed_at?: string | null
          processed_by_user_id?: string | null
          profile_picture_url?: string | null
          rejection_reason?: string | null
          source_mention_ids?: string[] | null
          status?: string | null
          total_mentions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ambassador_requests_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_tokens: {
        Row: {
          access_token: string
          created_at: string
          embassador_id: string
          id: string
          token_expiry: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          embassador_id: string
          id?: string
          token_expiry?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          embassador_id?: string
          id?: string
          token_expiry?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_tokens_embassador_id_fkey"
            columns: ["embassador_id"]
            isOneToOne: true
            referencedRelation: "embassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      embassadors: {
        Row: {
          completed_tasks: number | null
          created_at: string | null
          created_by_user_id: string | null
          date_of_birth: string | null
          email: string
          events_participated: number | null
          failed_tasks: number | null
          first_name: string
          follower_count: number | null
          global_category: string | null
          global_points: number | null
          id: string
          instagram_access_token: string | null
          instagram_user: string
          instagram_user_id: string | null
          last_instagram_sync: string | null
          last_name: string
          organization_id: string
          performance_status: string | null
          profile_picture_url: string | null
          profile_public: boolean | null
          rut: string | null
          status: string | null
          token_expires_at: string | null
        }
        Insert: {
          completed_tasks?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          date_of_birth?: string | null
          email: string
          events_participated?: number | null
          failed_tasks?: number | null
          first_name: string
          follower_count?: number | null
          global_category?: string | null
          global_points?: number | null
          id?: string
          instagram_access_token?: string | null
          instagram_user: string
          instagram_user_id?: string | null
          last_instagram_sync?: string | null
          last_name: string
          organization_id: string
          performance_status?: string | null
          profile_picture_url?: string | null
          profile_public?: boolean | null
          rut?: string | null
          status?: string | null
          token_expires_at?: string | null
        }
        Update: {
          completed_tasks?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          date_of_birth?: string | null
          email?: string
          events_participated?: number | null
          failed_tasks?: number | null
          first_name?: string
          follower_count?: number | null
          global_category?: string | null
          global_points?: number | null
          id?: string
          instagram_access_token?: string | null
          instagram_user?: string
          instagram_user_id?: string | null
          last_instagram_sync?: string | null
          last_name?: string
          organization_id?: string
          performance_status?: string | null
          profile_picture_url?: string | null
          profile_public?: boolean | null
          rut?: string | null
          status?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embassadors_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embassadors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by_user_id: string | null
          end_date: string | null
          event_date: string
          fiesta_id: string | null
          id: string
          start_date: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by_user_id?: string | null
          end_date?: string | null
          event_date: string
          fiesta_id?: string | null
          id?: string
          start_date?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by_user_id?: string | null
          end_date?: string | null
          event_date?: string
          fiesta_id?: string | null
          id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_fiesta_id_fkey"
            columns: ["fiesta_id"]
            isOneToOne: false
            referencedRelation: "fiestas"
            referencedColumns: ["id"]
          },
        ]
      }
      fiestas: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string | null
          id: string
          instagram_handle: string | null
          location: string | null
          main_hashtag: string | null
          name: string
          organization_id: string
          secondary_hashtags: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          instagram_handle?: string | null
          location?: string | null
          main_hashtag?: string | null
          name: string
          organization_id: string
          secondary_hashtags?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          instagram_handle?: string | null
          location?: string | null
          main_hashtag?: string | null
          name?: string
          organization_id?: string
          secondary_hashtags?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          created_at: string | null
          file_name: string | null
          id: string
          organization_id: string
          result_json: Json | null
          source: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          id?: string
          organization_id: string
          result_json?: Json | null
          source?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          id?: string
          organization_id?: string
          result_json?: Json | null
          source?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          embassador_id: string
          event_id: string
          id: string
          last_updated: string | null
          points: number | null
          rank: number | null
        }
        Insert: {
          embassador_id: string
          event_id: string
          id?: string
          last_updated?: string | null
          points?: number | null
          rank?: number | null
        }
        Update: {
          embassador_id?: string
          event_id?: string
          id?: string
          last_updated?: string | null
          points?: number | null
          rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_embassador_id_fkey"
            columns: ["embassador_id"]
            isOneToOne: false
            referencedRelation: "embassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          organization_id: string
          priority: string | null
          read_status: boolean | null
          target_id: string | null
          target_type: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          organization_id: string
          priority?: string | null
          read_status?: boolean | null
          target_id?: string | null
          target_type?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          organization_id?: string
          priority?: string | null
          read_status?: boolean | null
          target_id?: string | null
          target_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          organization_id: string | null
          redirect_base: string | null
          state: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          organization_id?: string | null
          redirect_base?: string | null
          state: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          redirect_base?: string | null
          state?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      organization_instagram_tokens: {
        Row: {
          access_token: string
          created_at: string
          id: string
          organization_id: string
          token_expiry: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          organization_id: string
          token_expiry?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          organization_id?: string
          token_expiry?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_instagram_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          permissions: Json | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          permissions?: Json | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          permissions?: Json | null
          role?: string
          status?: string
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
      organization_meta_credentials: {
        Row: {
          created_at: string
          id: string
          meta_app_id: string
          meta_app_secret: string
          organization_id: string
          updated_at: string
          webhook_verify_token: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_app_id: string
          meta_app_secret: string
          organization_id: string
          updated_at?: string
          webhook_verify_token: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_app_id?: string
          meta_app_secret?: string
          organization_id?: string
          updated_at?: string
          webhook_verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_meta_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          appearance_settings: Json | null
          created_at: string | null
          general_settings: Json | null
          id: string
          instagram_settings: Json | null
          integration_settings: Json | null
          notification_settings: Json | null
          organization_id: string
          permission_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          appearance_settings?: Json | null
          created_at?: string | null
          general_settings?: Json | null
          id?: string
          instagram_settings?: Json | null
          integration_settings?: Json | null
          notification_settings?: Json | null
          organization_id: string
          permission_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          appearance_settings?: Json | null
          created_at?: string | null
          general_settings?: Json | null
          id?: string
          instagram_settings?: Json | null
          integration_settings?: Json | null
          notification_settings?: Json | null
          organization_id?: string
          permission_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_organization_settings_organization"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          facebook_page_id: string | null
          id: string
          instagram_business_account_id: string | null
          instagram_user_id: string | null
          instagram_username: string | null
          last_instagram_sync: string | null
          logo_url: string | null
          meta_token: string | null
          name: string
          plan_type: string | null
          timezone: string | null
          token_expiry: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          facebook_page_id?: string | null
          id?: string
          instagram_business_account_id?: string | null
          instagram_user_id?: string | null
          instagram_username?: string | null
          last_instagram_sync?: string | null
          logo_url?: string | null
          meta_token?: string | null
          name: string
          plan_type?: string | null
          timezone?: string | null
          token_expiry?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          facebook_page_id?: string | null
          id?: string
          instagram_business_account_id?: string | null
          instagram_user_id?: string | null
          instagram_username?: string | null
          last_instagram_sync?: string | null
          logo_url?: string | null
          meta_token?: string | null
          name?: string
          plan_type?: string | null
          timezone?: string | null
          token_expiry?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_ambassadors: number | null
          max_events: number | null
          max_users: number | null
          name: string
          price: number | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_ambassadors?: number | null
          max_events?: number | null
          max_users?: number | null
          name: string
          price?: number | null
          slug: string
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_ambassadors?: number | null
          max_events?: number | null
          max_users?: number | null
          name?: string
          price?: number | null
          slug?: string
        }
        Relationships: []
      }
      social_mentions: {
        Row: {
          checks_count: number | null
          content: string | null
          conversation_id: string | null
          created_at: string
          created_task_id: string | null
          deep_link: string | null
          engagement_score: number | null
          expires_at: string | null
          external_event_id: string | null
          hashtag: string | null
          id: string
          inbox_link: string | null
          instagram_media_id: string | null
          instagram_story_id: string | null
          instagram_user_id: string | null
          instagram_username: string | null
          last_check_at: string | null
          matched_ambassador_id: string | null
          matched_event_id: string | null
          matched_fiesta_id: string | null
          mention_type: string
          mentioned_at: string
          organization_id: string
          platform: string | null
          processed: boolean | null
          processed_at: string | null
          raw_data: Json | null
          reach_count: number | null
          recipient_page_id: string | null
          state: string
          story_url: string | null
        }
        Insert: {
          checks_count?: number | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          created_task_id?: string | null
          deep_link?: string | null
          engagement_score?: number | null
          expires_at?: string | null
          external_event_id?: string | null
          hashtag?: string | null
          id?: string
          inbox_link?: string | null
          instagram_media_id?: string | null
          instagram_story_id?: string | null
          instagram_user_id?: string | null
          instagram_username?: string | null
          last_check_at?: string | null
          matched_ambassador_id?: string | null
          matched_event_id?: string | null
          matched_fiesta_id?: string | null
          mention_type: string
          mentioned_at?: string
          organization_id: string
          platform?: string | null
          processed?: boolean | null
          processed_at?: string | null
          raw_data?: Json | null
          reach_count?: number | null
          recipient_page_id?: string | null
          state?: string
          story_url?: string | null
        }
        Update: {
          checks_count?: number | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          created_task_id?: string | null
          deep_link?: string | null
          engagement_score?: number | null
          expires_at?: string | null
          external_event_id?: string | null
          hashtag?: string | null
          id?: string
          inbox_link?: string | null
          instagram_media_id?: string | null
          instagram_story_id?: string | null
          instagram_user_id?: string | null
          instagram_username?: string | null
          last_check_at?: string | null
          matched_ambassador_id?: string | null
          matched_event_id?: string | null
          matched_fiesta_id?: string | null
          mention_type?: string
          mentioned_at?: string
          organization_id?: string
          platform?: string | null
          processed?: boolean | null
          processed_at?: string | null
          raw_data?: Json | null
          reach_count?: number | null
          recipient_page_id?: string | null
          state?: string
          story_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_social_mentions_ambassador"
            columns: ["matched_ambassador_id"]
            isOneToOne: false
            referencedRelation: "embassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_social_mentions_event"
            columns: ["matched_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_social_mentions_fiesta"
            columns: ["matched_fiesta_id"]
            isOneToOne: false
            referencedRelation: "fiestas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_social_mentions_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_social_mentions_task"
            columns: ["created_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          api_response: Json | null
          checked_by: string | null
          details: string | null
          id: string
          story_status: string | null
          task_id: string
          timestamp_checked: string | null
          was_active: boolean | null
        }
        Insert: {
          api_response?: Json | null
          checked_by?: string | null
          details?: string | null
          id?: string
          story_status?: string | null
          task_id: string
          timestamp_checked?: string | null
          was_active?: boolean | null
        }
        Update: {
          api_response?: Json | null
          checked_by?: string | null
          details?: string | null
          id?: string
          story_status?: string | null
          task_id?: string
          timestamp_checked?: string | null
          was_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completion_method: string | null
          created_at: string | null
          embassador_id: string
          engagement_score: number | null
          event_id: string
          expected_hashtag: string | null
          expiry_time: string | null
          id: string
          instagram_story_id: string | null
          last_status_update: string | null
          platform: string | null
          points_earned: number | null
          reach_count: number | null
          status: string | null
          story_url: string | null
          task_type: string
          upload_time: string | null
          verified_through_api: boolean | null
        }
        Insert: {
          completion_method?: string | null
          created_at?: string | null
          embassador_id: string
          engagement_score?: number | null
          event_id: string
          expected_hashtag?: string | null
          expiry_time?: string | null
          id?: string
          instagram_story_id?: string | null
          last_status_update?: string | null
          platform?: string | null
          points_earned?: number | null
          reach_count?: number | null
          status?: string | null
          story_url?: string | null
          task_type: string
          upload_time?: string | null
          verified_through_api?: boolean | null
        }
        Update: {
          completion_method?: string | null
          created_at?: string | null
          embassador_id?: string
          engagement_score?: number | null
          event_id?: string
          expected_hashtag?: string | null
          expiry_time?: string | null
          id?: string
          instagram_story_id?: string | null
          last_status_update?: string | null
          platform?: string | null
          points_earned?: number | null
          reach_count?: number | null
          status?: string | null
          story_url?: string | null
          task_type?: string
          upload_time?: string | null
          verified_through_api?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_embassador_id_fkey"
            columns: ["embassador_id"]
            isOneToOne: false
            referencedRelation: "embassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      token_rotation_logs: {
        Row: {
          ambassador_id: string | null
          created_at: string
          id: string
          new_token_hash: string | null
          old_token_hash: string | null
          organization_id: string | null
          reason: string | null
          rotated_by: string | null
          rotation_type: string
          success: boolean
        }
        Insert: {
          ambassador_id?: string | null
          created_at?: string
          id?: string
          new_token_hash?: string | null
          old_token_hash?: string | null
          organization_id?: string | null
          reason?: string | null
          rotated_by?: string | null
          rotation_type: string
          success?: boolean
        }
        Update: {
          ambassador_id?: string | null
          created_at?: string
          id?: string
          new_token_hash?: string | null
          old_token_hash?: string | null
          organization_id?: string | null
          reason?: string | null
          rotated_by?: string | null
          rotation_type?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "token_rotation_logs_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "embassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_rotation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_login: string | null
          name: string
          organization_id: string | null
          role: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          name: string
          organization_id?: string | null
          role?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          name?: string
          organization_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_oauth_states: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_ambassador_basic_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          completed_tasks: number
          created_at: string
          events_participated: number
          failed_tasks: number
          first_name: string
          follower_count: number
          global_category: string
          global_points: number
          id: string
          instagram_user: string
          instagram_user_id: string
          last_instagram_sync: string
          last_name: string
          organization_id: string
          performance_status: string
          profile_public: boolean
          status: string
        }[]
      }
      get_ambassador_safe_info: {
        Args: { org_id?: string }
        Returns: {
          completed_tasks: number
          created_at: string
          email: string
          events_participated: number
          failed_tasks: number
          first_name: string
          follower_count: number
          global_category: string
          global_points: number
          id: string
          instagram_user: string
          last_instagram_sync: string
          last_name: string
          organization_id: string
          performance_status: string
          profile_picture_url: string
          profile_public: boolean
          status: string
        }[]
      }
      get_ambassador_sensitive_data: {
        Args: { ambassador_id: string }
        Returns: {
          date_of_birth: string
          email: string
          id: string
          profile_picture_url: string
          rut: string
        }[]
      }
      get_ambassador_token_info: {
        Args: { ambassador_id: string }
        Returns: {
          access_token: string
          is_expired: boolean
          token_expiry: string
        }[]
      }
      get_org_meta_credentials_status: {
        Args: { p_organization_id: string }
        Returns: {
          has_credentials: boolean
          updated_at: string
        }[]
      }
      get_organization_credentials_by_instagram_user: {
        Args: { p_instagram_user_id: string }
        Returns: {
          meta_app_id: string
          meta_app_secret: string
          organization_id: string
          webhook_verify_token: string
        }[]
      }
      get_organization_credentials_secure: {
        Args: { p_organization_id: string }
        Returns: {
          meta_app_id: string
          meta_app_secret: string
          webhook_verify_token: string
        }[]
      }
      get_organization_hierarchy: {
        Args: { org_id: string }
        Returns: {
          description: string
          id: string
          is_main_account: boolean
          level: number
          name: string
          organization_type: string
        }[]
      }
      get_organization_safe_info: {
        Args: { org_id?: string }
        Returns: {
          created_at: string
          description: string
          id: string
          instagram_connected: boolean
          instagram_username: string
          last_instagram_sync: string
          logo_url: string
          name: string
          plan_type: string
          timezone: string
        }[]
      }
      get_organization_token_info: {
        Args: { org_id: string }
        Returns: {
          access_token: string
          is_expired: boolean
          token_expiry: string
        }[]
      }
      get_safe_ambassador_data: {
        Args: { user_organization_ids: string[] }
        Returns: {
          completed_tasks: number
          created_at: string
          created_by_user_id: string
          date_of_birth: string
          email: string
          events_participated: number
          failed_tasks: number
          first_name: string
          follower_count: number
          global_category: string
          global_points: number
          id: string
          instagram_access_token: string
          instagram_user: string
          instagram_user_id: string
          last_instagram_sync: string
          last_name: string
          organization_id: string
          performance_status: string
          profile_picture_url: string
          profile_public: boolean
          rut: string
          status: string
          token_expires_at: string
        }[]
      }
      get_safe_organization_data: {
        Args: { user_id: string }
        Returns: {
          created_at: string
          created_by: string
          description: string
          facebook_page_id: string
          id: string
          instagram_business_account_id: string
          instagram_user_id: string
          instagram_username: string
          last_instagram_sync: string
          logo_url: string
          meta_token: string
          name: string
          plan_type: string
          timezone: string
          token_expiry: string
        }[]
      }
      get_user_organization_ids: {
        Args: { user_id: string }
        Returns: {
          organization_id: string
        }[]
      }
      get_user_organizations: {
        Args: { user_auth_id: string }
        Returns: {
          is_owner: boolean
          organization_id: string
          role: string
        }[]
      }
      hash_token_for_audit: {
        Args: { token_text: string }
        Returns: string
      }
      is_organization_member: {
        Args: { org_id: string; user_auth_id: string }
        Returns: boolean
      }
      upsert_org_meta_credentials: {
        Args: {
          p_meta_app_id: string
          p_meta_app_secret: string
          p_organization_id: string
          p_webhook_verify_token: string
        }
        Returns: undefined
      }
    }
    Enums: {
      import_export_type: "import" | "export"
      user_role_extended: "admin" | "rrpp" | "cliente_viewer"
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
      import_export_type: ["import", "export"],
      user_role_extended: ["admin", "rrpp", "cliente_viewer"],
    },
  },
} as const
