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
                    read: boolean
                    type: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    payload?: Json | null
                    read?: boolean
                    type: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    payload?: Json | null
                    read?: boolean
                    type: string
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
                    city: string | null
                    created_at: string
                    email: string
                    full_name: string
                    id: string
                    is_verified: boolean | null
                    market_id: string | null
                    user_type: Database["public"]["Enums"]["user_role"]
                    theme_preference?: "light" | "dark" | "system"
                }
                Insert: {
                    city?: string | null
                    created_at?: string
                    email: string
                    full_name: string
                    id: string
                    is_verified?: boolean | null
                    market_id?: string | null
                    user_type: Database["public"]["Enums"]["user_role"]
                    theme_preference?: "light" | "dark" | "system"
                }
                Update: {
                    city?: string | null
                    created_at?: string
                    email?: string
                    full_name?: string
                    id?: string
                    is_verified?: boolean | null
                    market_id?: string | null
                    user_type?: Database["public"]["Enums"]["user_role"]
                    theme_preference?: "light" | "dark" | "system"
                }
                Relationships: [
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
        }
        Enums: {
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
