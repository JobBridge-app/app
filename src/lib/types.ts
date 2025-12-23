export type UserType = "youth" | "adult" | "senior" | "company" | "admin";
export type JobStatus = "draft" | "open" | "closed";
export type ApplicationStatus = "submitted" | "withdrawn" | "accepted" | "rejected";
export type SystemRoleType = "admin" | "moderator" | "analyst";

export type Profile = {
  id: string;
  full_name: string | null;
  birthdate: string | null;
  city: string | null;
  user_type: UserType | null;
  is_verified: boolean | null;
  market_id: string | null;
  theme_preference?: "light" | "dark" | "system";
  created_at: string | null;
  email?: string; // Often joined from auth.users or waitlist, keeping optional
};

export type Job = {
  id: string;
  title: string;
  description: string;
  posted_by: string; // uuid
  status: JobStatus;
  created_at: string;
};

export type Application = {
  id: string;
  job_id: string; // uuid
  user_id: string; // uuid
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
};

export type SystemRole = {
  id: string;
  name: SystemRoleType;
  description: string;
  created_at: string;
};

export type UserSystemRole = {
  user_id: string;
  role_id: string;
  created_at: string;
};

export type SecurityEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          birthdate?: string | null;
          city?: string | null;
          user_type?: UserType | null;
          is_verified?: boolean | null;
          market_id?: string | null;
          theme_preference?: "light" | "dark" | "system";
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: {
          id?: string;
          title: string;
          description: string;
          posted_by: string;
          status?: JobStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "jobs_posted_by_fkey";
            columns: ["posted_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      applications: {
        Row: Application;
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          message?: string | null;
          status?: ApplicationStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      regions: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["regions"]["Insert"]>;
        Relationships: [];
      };
      regions_live: {
        Row: {
          id: string;
          city: string;
          postal_code: string | null;
          federal_state: string;
          country: string;
          openplz_municipality_key: string | null;
          is_live: boolean;
          slug?: string | null;
          display_name?: string | null;
          brand_prefix?: string | null;
          centroid_lat?: number | null;
          centroid_lng?: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          city: string;
          postal_code?: string | null;
          federal_state: string;
          country?: string;
          openplz_municipality_key?: string | null;
          is_live?: boolean;
          slug?: string | null;
          display_name?: string | null;
          brand_prefix?: string | null;
          centroid_lat?: number | null;
          centroid_lng?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["regions_live"]["Insert"]>;
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          city: string;
          federal_state: string | null;
          country: string | null;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          city: string;
          federal_state?: string | null;
          country?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waitlist"]["Insert"]>;
        Relationships: [];
      };
      verification_attempts: {
        Row: {
          id: string;
          attempts: number;
          last_attempt: string | null;
        };
        Insert: {
          id: string;
          attempts?: number;
          last_attempt?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["verification_attempts"]["Insert"]>;
        Relationships: [];
      };
      system_roles: {
        Row: SystemRole;
        Insert: {
          id?: string;
          name: SystemRoleType;
          description?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_roles"]["Insert"]>;
        Relationships: [];
      };
      user_system_roles: {
        Row: UserSystemRole;
        Insert: {
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_system_roles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_system_roles_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "system_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_system_roles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      security_events: {
        Row: SecurityEvent;
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["security_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      demo_sessions: {
        Row: {
          user_id: string;
          enabled: boolean;
          demo_view: "job_seeker" | "job_provider";
          updated_at: string;
        };
        Insert: {
          user_id: string;
          enabled?: boolean;
          demo_view?: "job_seeker" | "job_provider";
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["demo_sessions"]["Insert"]>;
        Relationships: [];
      };
      demo_jobs: Database["public"]["Tables"]["jobs"]; // Reusing structure
      demo_applications: Database["public"]["Tables"]["applications"];
    };
    Views: Record<string, never>;
    Functions: {
      get_jobs_feed: {
        Args: {
          p_market_id: string;
          p_user_lat?: number | null;
          p_user_lng?: number | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: any[];
      };
    };
    Enums: {
      user_type: UserType;
      job_status: JobStatus;
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export const isProfileComplete = (profile: Profile | null) =>
  Boolean(
    profile?.full_name &&
    profile.birthdate &&
    profile.user_type
  );

export type Market = {
  id: string;
  slug: string;
  display_name: string;
  brand_prefix: string;
  is_live: boolean;
};
