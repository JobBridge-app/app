export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            applications: {
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
                    created_at: string
                    description: string
                    id: string
                    market_id: string
                    posted_by: string
                    status: Database["public"]["Enums"]["job_status"]
                    title: string
                    wage_hourly: number | null
                    public_location_label: string | null
                    public_lat: number | null
                    public_lng: number | null
                    category: string | null
                    address_reveal_policy: string | null
                }
                Insert: {
                    created_at?: string
                    description: string
                    id?: string
                    market_id: string
                    posted_by: string
                    status?: Database["public"]["Enums"]["job_status"]
                    title: string
                    wage_hourly?: number | null
                }
                Update: {
                    created_at?: string
                    description?: string
                    id?: string
                    market_id?: string
                    posted_by?: string
                    status?: Database["public"]["Enums"]["job_status"]
                    title?: string
                    wage_hourly?: number | null
                }
                Relationships: []
            }
            demo_sessions: {
                Row: {
                    created_at: string
                    demo_view: string
                    enabled: boolean
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    demo_view?: string
                    enabled?: boolean
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    demo_view?: string
                    enabled?: boolean
                    updated_at?: string
                    user_id?: string
                }
                Relationships: []
            }
            job_private_details: {
                Row: {
                    address_street: string | null
                    contact_email: string | null
                    contact_phone: string | null
                    job_id: string
                }
                Insert: {
                    address_street?: string | null
                    contact_email?: string | null
                    contact_phone?: string | null
                    job_id: string
                }
                Update: {
                    address_street?: string | null
                    contact_email?: string | null
                    contact_phone?: string | null
                    job_id?: string
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
                    address_reveal_policy: string
                    category: Database["public"]["Enums"]["job_category"]
                    created_at: string
                    description: string
                    distance_km: number | null
                    id: string
                    market_id: string | null
                    market_name: string | null
                    posted_by: string
                    public_location_label: string
                    status: Database["public"]["Enums"]["job_status"]
                    title: string
                    wage_hourly: number
                }
                Insert: {
                    address_reveal_policy: string
                    category: Database["public"]["Enums"]["job_category"]
                    created_at?: string
                    description: string
                    distance_km?: number | null
                    id?: string
                    market_id?: string | null
                    market_name?: string | null
                    posted_by: string
                    public_location_label: string
                    status: Database["public"]["Enums"]["job_status"]
                    title: string
                    wage_hourly: number
                }
                Update: {
                    address_reveal_policy?: string
                    category?: Database["public"]["Enums"]["job_category"]
                    created_at?: string
                    description?: string
                    distance_km?: number | null
                    id?: string
                    market_id?: string | null
                    market_name?: string | null
                    posted_by?: string
                    public_location_label?: string
                    status?: Database["public"]["Enums"]["job_status"]
                    title?: string
                    wage_hourly?: number
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
            moderation_actions: {
                Row: {
                    action: string
                    created_at: string
                    id: string
                    moderator_id: string
                    reason: string | null
                    target_id: string
                    target_type: string
                }
                Insert: {
                    action: string
                    created_at?: string
                    id?: string
                    moderator_id: string
                    reason?: string | null
                    target_id: string
                    target_type: string
                }
                Update: {
                    action?: string
                    created_at?: string
                    id?: string
                    moderator_id?: string
                    reason?: string | null
                    target_id?: string
                    target_type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "moderation_actions_moderator_id_fkey"
                        columns: ["moderator_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            notification_preferences: {
                Row: {
                    email_enabled: boolean
                    push_enabled: boolean
                    updated_at: string
                    user_id: string
                    email_application_updates?: boolean
                    email_messages?: boolean
                    digest_frequency?: string
                }
                Insert: {
                    email_enabled?: boolean
                    push_enabled?: boolean
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    email_enabled?: boolean
                    push_enabled?: boolean
                    updated_at?: string
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
                    created_at: string
                    id: string
                    payload: Json | null
                    read_at: string | null
                    type: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    payload?: Json | null
                    read_at?: string | null
                    type: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    payload?: Json | null
                    read_at?: string | null
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
                    bio: string | null
                    city: string | null
                    company_contact_email: string | null
                    company_message: string | null
                    company_name: string | null
                    country: string | null
                    created_at: string
                    email: string | null
                    email_verified_at: string | null
                    full_name: string | null
                    id: string
                    interests: string | null
                    skills: string | null
                    availability_note: string | null
                    guardian_id: string | null
                    guardian_status: Database["public"]["Enums"]["guardian_status"]
                    guardian_verified_at: string | null
                    account_type: Database["public"]["Enums"]["account_type"] | null
                    market_id: string | null
                    phone_verified_at: string | null
                    provider_kind: Database["public"]["Enums"]["provider_kind"] | null
                    provider_verification_status: Database["public"]["Enums"]["provider_verification_status"]
                    provider_verified_at: string | null
                    birthdate: string | null
                    updated_at: string | null
                    theme_preference?: "light" | "dark" | "system"
                }
                Insert: {
                    bio?: string | null
                    city?: string | null
                    company_contact_email?: string | null
                    company_message?: string | null
                    company_name?: string | null
                    country?: string | null
                    created_at?: string
                    email?: string | null
                    email_verified_at?: string | null
                    full_name?: string | null
                    id: string
                    interests?: string | null
                    skills?: string | null
                    availability_note?: string | null
                    guardian_id?: string | null
                    guardian_status?: Database["public"]["Enums"]["guardian_status"]
                    guardian_verified_at?: string | null
                    account_type?: Database["public"]["Enums"]["account_type"] | null
                    market_id?: string | null
                    phone_verified_at?: string | null
                    provider_kind?: Database["public"]["Enums"]["provider_kind"] | null
                    provider_verification_status?: Database["public"]["Enums"]["provider_verification_status"]
                    provider_verified_at?: string | null
                    birthdate?: string | null
                    updated_at?: string | null
                    theme_preference?: "light" | "dark" | "system"
                }
                Update: {
                    bio?: string | null
                    city?: string | null
                    company_contact_email?: string | null
                    company_message?: string | null
                    company_name?: string | null
                    country?: string | null
                    created_at?: string
                    email?: string | null
                    email_verified_at?: string | null
                    full_name?: string | null
                    id?: string
                    interests?: string | null
                    skills?: string | null
                    availability_note?: string | null
                    guardian_id?: string | null
                    guardian_status?: Database["public"]["Enums"]["guardian_status"]
                    guardian_verified_at?: string | null
                    account_type?: Database["public"]["Enums"]["account_type"] | null
                    market_id?: string | null
                    phone_verified_at?: string | null
                    provider_kind?: Database["public"]["Enums"]["provider_kind"] | null
                    provider_verification_status?: Database["public"]["Enums"]["provider_verification_status"]
                    provider_verified_at?: string | null
                    birthdate?: string | null
                    updated_at?: string | null
                    theme_preference?: "light" | "dark" | "system"
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
                    cnt_jobs: number | null
                    cnt_seekers: number | null
                    created_at: string
                    display_name: string
                    id: string
                    lat: number
                    lng: number
                    radius_km: number | null
                    slug: string | null
                    brand_prefix: string | null
                    city: string
                    centroid_lat: number | null
                    centroid_lng: number | null
                    is_live: boolean
                }
                Insert: {
                    cnt_jobs?: number | null
                    cnt_seekers?: number | null
                    created_at?: string
                    display_name: string
                    id: string
                    lat: number
                    lng: number
                    radius_km?: number | null
                    slug?: string | null
                    brand_prefix?: string | null
                    city: string
                    centroid_lat?: number | null
                    centroid_lng?: number | null
                    is_live?: boolean
                }
                Update: {
                    cnt_jobs?: number | null
                    cnt_seekers?: number | null
                    created_at?: string
                    display_name?: string
                    id?: string
                    lat?: number
                    lng?: number
                    radius_km?: number | null
                    slug?: string | null
                    brand_prefix?: string | null
                    city?: string
                    centroid_lat?: number | null
                    centroid_lng?: number | null
                    is_live?: boolean
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
            security_events: {
                Row: {
                    created_at: string
                    event_type: string
                    id: string
                    ip_address: string | null
                    metadata: Json | null
                    user_agent: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string
                    event_type: string
                    id?: string
                    ip_address?: string | null
                    metadata?: Json | null
                    user_agent?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string
                    event_type?: string
                    id?: string
                    ip_address?: string | null
                    metadata?: Json | null
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

            verification_attempts: {
                Row: {
                    id: string
                    attempts: number
                    last_attempt: string | null
                }
                Insert: {
                    id: string
                    attempts?: number
                    last_attempt?: string | null
                }
                Update: {
                    id?: string
                    attempts?: number
                    last_attempt?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_jobs_feed: {
                Args: {
                    p_market_id: string
                    p_user_lat?: number | null
                    p_user_lng?: number | null
                }
                Returns: Database["public"]["Tables"]["jobs"]["Row"][]
            }
            create_job_atomic: {
                Args: {
                    p_market_id: string
                    p_title: string
                    p_description: string
                    p_wage_hourly?: number | null
                    p_category?: string | null
                    p_address_reveal_policy?: string | null
                    p_public_location_label?: string | null
                    p_public_lat?: number | null
                    p_public_lng?: number | null
                    p_address_full?: string | null
                    p_private_lat?: number | null
                    p_private_lng?: number | null
                    p_notes?: string | null
                    p_location_id?: string | null
                }
                Returns: unknown
            }
            create_guardian_invitation: {
                Args: {
                    p_invited_email?: string | null
                }
                Returns: Json
            }
            redeem_guardian_invitation: {
                Args: {
                    token_input: string
                }
                Returns: Json
            }
        }
        Enums: {
            account_type: "job_seeker" | "job_provider"
            guardian_status: "none" | "pending" | "linked"
            provider_kind: "private" | "company"
            provider_verification_status: "none" | "pending" | "verified" | "rejected"
            application_status: "submitted" | "accepted" | "rejected" | "hired"
            job_category:
            | "gardening"
            | "shopping"
            | "tutoring"
            | "pet_sitting"
            | "cleaning"
            | "tech_help"
            | "moving_help"
            | "other"
            job_status: "open" | "closed" | "in_progress"
            user_role: "youth" | "company" | "admin"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
