export type UserType = "youth" | "adult" | "senior" | "company";

export type Profile = {
  id: string;
  full_name: string | null;
  birthdate: string | null;
  city: string | null;
  user_type: UserType | null;
  is_verified: boolean | null;
  created_at: string | null;
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
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const isProfileComplete = (profile: Profile | null) =>
  Boolean(
    profile?.full_name &&
    profile.birthdate &&
    profile.city &&
    profile.user_type
  );
