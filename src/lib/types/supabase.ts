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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          message: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          message?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          message?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          message: string | null
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          message?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: []
      }
      demo_jobs: {
        Row: {
          address_reveal_policy: string | null
          category: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          filled_at: string | null
          filled_by: string | null
          hiring_mode: Database["public"]["Enums"]["hiring_mode"]
          id: string
          market_id: string | null
          max_applicants: number | null
          payment_type: string
          posted_by: string
          public_lat: number | null
          public_lng: number | null
          public_location_label: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          wage_hourly: number | null
        }
        Insert: {
          address_reveal_policy?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          filled_at?: string | null
          filled_by?: string | null
          hiring_mode?: Database["public"]["Enums"]["hiring_mode"]
          id?: string
          market_id?: string | null
          max_applicants?: number | null
          payment_type?: string
          posted_by: string
          public_lat?: number | null
          public_lng?: number | null
          public_location_label?: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          wage_hourly?: number | null
        }
        Update: {
          address_reveal_policy?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          filled_at?: string | null
          filled_by?: string | null
          hiring_mode?: Database["public"]["Enums"]["hiring_mode"]
          id?: string
          market_id?: string | null
          max_applicants?: number | null
          payment_type?: string
          posted_by?: string
          public_lat?: number | null
          public_lng?: number | null
          public_location_label?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          wage_hourly?: number | null
        }
        Relationships: []
      }
      demo_sessions: {
        Row: {
          demo_view: string | null
          enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          demo_view?: string | null
          enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          demo_view?: string | null
          enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_invitations: {
        Row: {
          child_id: string
          created_at: string | null
          expires_at: string
          id: string
          redeemed_by: string | null
          status: string
          token: string
          updated_at: string | null
          used_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          redeemed_by?: string | null
          status?: string
          token: string
          updated_at?: string | null
          used_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          redeemed_by?: string | null
          status?: string
          token?: string
          updated_at?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_invitations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_invitations_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_relationships: {
        Row: {
          child_id: string | null
          created_at: string | null
          guardian_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          guardian_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          guardian_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_relationships_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_relationships_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_private_details: {
        Row: {
          address_full: string | null
          created_at: string | null
          job_id: string
          notes: string | null
          private_lat: number | null
          private_lng: number | null
        }
        Insert: {
          address_full?: string | null
          created_at?: string | null
          job_id: string
          notes?: string | null
          private_lat?: number | null
          private_lng?: number | null
        }
        Update: {
          address_full?: string | null
          created_at?: string | null
          job_id?: string
          notes?: string | null
          private_lat?: number | null
          private_lng?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_private_details_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address_reveal_policy: string | null
          category: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          filled_at: string | null
          filled_by: string | null
          hiring_mode: Database["public"]["Enums"]["hiring_mode"]
          id: string
          market_id: string | null
          max_applicants: number | null
          payment_type: string
          posted_by: string
          public_lat: number | null
          public_lng: number | null
          public_location_label: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          wage_hourly: number | null
        }
        Insert: {
          address_reveal_policy?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          filled_at?: string | null
          filled_by?: string | null
          hiring_mode?: Database["public"]["Enums"]["hiring_mode"]
          id?: string
          market_id?: string | null
          max_applicants?: number | null
          payment_type?: string
          posted_by: string
          public_lat?: number | null
          public_lng?: number | null
          public_location_label?: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          wage_hourly?: number | null
        }
        Update: {
          address_reveal_policy?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          filled_at?: string | null
          filled_by?: string | null
          hiring_mode?: Database["public"]["Enums"]["hiring_mode"]
          id?: string
          market_id?: string | null
          max_applicants?: number | null
          payment_type?: string
          posted_by?: string
          public_lat?: number | null
          public_lng?: number | null
          public_location_label?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          wage_hourly?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "regions_live"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          application_id: string
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          moderator_user_id: string
          notes: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          moderator_user_id: string
          notes?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          moderator_user_id?: string
          notes?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_moderator_user_id_fkey"
            columns: ["moderator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          digest_frequency: string | null
          email_application_updates: boolean | null
          email_enabled: boolean | null
          email_job_updates: boolean | null
          email_messages: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          digest_frequency?: string | null
          email_application_updates?: boolean | null
          email_enabled?: boolean | null
          email_job_updates?: boolean | null
          email_messages?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          digest_frequency?: string | null
          email_application_updates?: boolean | null
          email_enabled?: boolean | null
          email_job_updates?: boolean | null
          email_messages?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          availability_note: string | null
          bio: string | null
          birthdate: string | null
          city: string | null
          company_contact_email: string | null
          company_message: string | null
          company_name: string | null
          country: string
          created_at: string
          email: string | null
          email_verified_at: string | null
          full_name: string | null
          guardian_id: string | null
          guardian_status: Database["public"]["Enums"]["guardian_status"]
          guardian_verified_at: string | null
          id: string
          interests: string | null
          market_id: string | null
          phone_verified_at: string | null
          provider_kind: Database["public"]["Enums"]["provider_kind"] | null
          provider_verification_status: Database["public"]["Enums"]["provider_verification_status"]
          provider_verified_at: string | null
          skills: string | null
          theme_preference: string | null
          updated_at: string
          user_type: string | null
          avatar_url: string | null
          lat: number | null
          lng: number | null
          street: string | null
          house_number: string | null
          zip: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          availability_note?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          company_contact_email?: string | null
          company_message?: string | null
          company_name?: string | null
          country?: string
          created_at?: string
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          guardian_id?: string | null
          guardian_status?: Database["public"]["Enums"]["guardian_status"]
          guardian_verified_at?: string | null
          id: string
          interests?: string | null
          market_id?: string | null
          phone_verified_at?: string | null
          provider_kind?: Database["public"]["Enums"]["provider_kind"] | null
          provider_verification_status?: Database["public"]["Enums"]["provider_verification_status"]
          provider_verified_at?: string | null
          skills?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_type?: string | null
          avatar_url?: string | null
          lat?: number | null
          lng?: number | null
          street?: string | null
          house_number?: string | null
          zip?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          availability_note?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          company_contact_email?: string | null
          company_message?: string | null
          company_name?: string | null
          country?: string
          created_at?: string
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          guardian_id?: string | null
          guardian_status?: Database["public"]["Enums"]["guardian_status"]
          guardian_verified_at?: string | null
          id?: string
          interests?: string | null
          market_id?: string | null
          phone_verified_at?: string | null
          provider_kind?: Database["public"]["Enums"]["provider_kind"] | null
          provider_verification_status?: Database["public"]["Enums"]["provider_verification_status"]
          provider_verified_at?: string | null
          skills?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_type?: string | null
          avatar_url?: string | null
          lat?: number | null
          lng?: number | null
          street?: string | null
          house_number?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "regions_live"
            referencedColumns: ["id"]
          },
        ]
      }
      regions_live: {
        Row: {
          brand_prefix: string | null
          city: string
          country: string
          created_at: string
          display_name: string | null
          federal_state: string
          id: string
          is_live: boolean
          openplz_municipality_key: string | null
          postal_code: string | null
        }
        Insert: {
          brand_prefix?: string | null
          city: string
          country?: string
          created_at?: string
          display_name?: string | null
          federal_state: string
          id?: string
          is_live?: boolean
          openplz_municipality_key?: string | null
          postal_code?: string | null
        }
        Update: {
          brand_prefix?: string | null
          city?: string
          country?: string
          created_at?: string
          display_name?: string | null
          federal_state?: string
          id?: string
          is_live?: boolean
          openplz_municipality_key?: string | null
          postal_code?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason_code: string
          reporter_user_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason_code: string
          reporter_user_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason_code?: string
          reporter_user_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_overrides: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          reason: string | null
          user_id: string
          view_as: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          reason?: string | null
          user_id: string
          view_as: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          reason?: string | null
          user_id?: string
          view_as?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_system_roles: {
        Row: {
          created_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_system_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "system_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_system_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          city: string
          country: string | null
          created_at: string
          email: string
          federal_state: string | null
          id: string
          role: string | null
        }
        Insert: {
          city: string
          country?: string | null
          created_at?: string
          email: string
          federal_state?: string | null
          id?: string
          role?: string | null
        }
        Update: {
          city?: string
          country?: string | null
          created_at?: string
          email?: string
          federal_state?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_recent_activity: {
        Row: {
          created_at: string | null
          link: string | null
          reference_id: string | null
          subtitle: string | null
          title: string | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_applicant: { Args: { p_application_id: string }; Returns: Json }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      can_act_as: { Args: { p_view_as: string }; Returns: boolean }
      create_guardian_invitation: {
        Args: { p_invited_email?: string }
        Returns: Json
      }
      create_job_atomic:
      | {
        Args: {
          p_address_full?: string
          p_address_reveal_policy: string
          p_category: string
          p_description: string
          p_location_id?: string
          p_market_id: string
          p_notes?: string
          p_private_lat?: number
          p_private_lng?: number
          p_public_lat: number
          p_public_lng: number
          p_public_location_label: string
          p_title: string
          p_wage_hourly: number
        }
        Returns: Json
      }
      | {
        Args: {
          p_address_full?: string
          p_address_reveal_policy: string
          p_category: string
          p_description: string
          p_market_id: string
          p_notes?: string
          p_private_lat?: number
          p_private_lng?: number
          p_public_lat: number
          p_public_lng: number
          p_public_location_label: string
          p_title: string
          p_wage_hourly: number
        }
        Returns: Json
      }
      get_effective_role: { Args: { target_user_id: string }; Returns: string }
      get_guardian_invitation_info: {
        Args: { token_input: string }
        Returns: Json
      }
      get_my_effective_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_demo_user: { Args: never; Returns: boolean }
      is_staff:
      | { Args: never; Returns: boolean }
      | { Args: { p_uid: string }; Returns: boolean }
      redeem_guardian_invitation: {
        Args: { token_input: string }
        Returns: Json
      }
    }
    Enums: {
      account_type: "job_seeker" | "job_provider"
      account_type_legacy: "teen" | "parent" | "provider" | "org"
      application_status:
      | "submitted"
      | "withdrawn"
      | "accepted"
      | "rejected"
      | "auto_rejected"
      | "completed"
      | "cancelled"
      | "negotiating"
      | "waitlisted"
      guardian_status: "none" | "pending" | "linked"
      hiring_mode: "open_pool" | "first_come" | "direct_hire"
      job_status:
      | "draft"
      | "open"
      | "closed"
      | "reviewing"
      | "reserved"
      | "filled"
      provider_kind: "private" | "company"
      provider_verification_status: "none" | "pending" | "verified" | "rejected"
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
      account_type: ["job_seeker", "job_provider"],
      account_type_legacy: ["teen", "parent", "provider", "org"],
      application_status: [
        "submitted",
        "withdrawn",
        "accepted",
        "rejected",
        "auto_rejected",
        "completed",
        "cancelled",
        "negotiating",
        "waitlisted",
      ],
      guardian_status: ["none", "pending", "linked"],
      hiring_mode: ["open_pool", "first_come", "direct_hire"],
      job_status: [
        "draft",
        "open",
        "closed",
        "reviewing",
        "reserved",
        "filled",
      ],
      provider_kind: ["private", "company"],
      provider_verification_status: ["none", "pending", "verified", "rejected"],
    },
  },
} as const
