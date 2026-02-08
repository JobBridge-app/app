export type StaffRole = "admin" | "moderator" | "analyst" | "staff";

export type DemoView = "job_seeker" | "job_provider";

export type MetricWidget = {
  value: number | null;
  error: string | null;
};

export type DashboardMetrics = {
  users: MetricWidget;
  jobs: MetricWidget;
  applications: MetricWidget;
};

export type StaffHeaderContext = {
  fullName: string;
  roles: string[];
  highestRole: StaffRole;
  demoEnabled: boolean;
  demoView: DemoView;
  error: string | null;
};

export type ActivityItem = {
  type: "user" | "job" | "application" | "report" | "moderation";
  entityId: string;
  title: string;
  subtitle?: string;
  createdAt: string;
  href: string;
};

export type ActivityResponse = {
  items: ActivityItem[];
  hasMore: boolean;
  error: string | null;
};

export type WorkQueueItem = {
  id: string;
  type: "report" | "verification" | "application";
  title: string;
  subtitle: string;
  priority: "high" | "medium" | "low";
  created_at: string;
  link: string;
};

export type AdminUserListItem = {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  account_type: string | null;
  provider_kind: string | null;
  guardian_status: string | null;
  provider_verification_status: string | null;
  email_verified_at: string | null;
  created_at: string;
  roles: string[];
};

export type AdminUserDetail = AdminUserListItem;

export type AdminJobListItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  posted_by: string;
  posted_by_name: string | null;
  created_at: string;
  location_label: string | null;
  market: string | null;
};

export type AdminJobDetail = AdminJobListItem & {
  posted_by_email: string | null;
  wage_hourly: number | null;
  category: string | null;
};

export type AdminApplicationListItem = {
  id: string;
  job_id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  job_title: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
};

export type AdminApplicationDetail = AdminApplicationListItem;

export type AdminReportListItem = {
  id: string;
  target_type: string;
  target_id: string;
  reason_code: string;
  details: string | null;
  status: string;
  reporter_user_id: string;
  reporter_name: string | null;
  created_at: string;
};

export type AdminRoleAssignment = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  role_name: string;
  role_description: string | null;
  created_at: string;
};

export type AdminSearchResult = {
  entity_type: "user" | "job";
  entity_id: string;
  title: string;
  subtitle: string;
  created_at: string;
  link: string;
};
