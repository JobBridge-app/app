import type { StaffRole } from "@/lib/data/adminTypes";

export type AdminSection = "overview" | "statistics" | "management" | "operations" | "system";
export type AdminIconKey =
  | "dashboard"
  | "chart"
  | "users"
  | "jobs"
  | "applications"
  | "moderation"
  | "activity"
  | "communications"
  | "drops"
  | "roles"
  | "demo";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: AdminIconKey;
};

export type AdminNavGroup = {
  key: AdminSection;
  label: string;
  items: AdminNavItem[];
};

export type AdminNavGroupWithAccess = AdminNavGroup & {
  accessible: boolean;
};

const ADMIN_SECTION_LABELS: Record<AdminSection, string> = {
  overview: "Overview",
  statistics: "Statistiken",
  management: "Management",
  operations: "Operations",
  system: "System",
};

const ROLE_ACCESS_PRESETS: Record<string, AdminSection[]> = {
  admin: ["overview", "statistics", "management", "operations", "system"],
  moderator: ["overview", "management", "operations"],
  analyst: ["overview", "statistics"],
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    items: [{ icon: "dashboard", label: "Dashboard", href: "/staff" }],
  },
  {
    key: "statistics",
    label: "Statistiken",
    items: [{ icon: "chart", label: "Statistiken", href: "/staff/statistics" }],
  },
  {
    key: "management",
    label: "Management",
    items: [
      { icon: "users", label: "Users", href: "/staff/users" },
      { icon: "jobs", label: "Jobs", href: "/staff/jobs" },
      { icon: "applications", label: "Applications", href: "/staff/applications" },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    items: [
      { icon: "moderation", label: "Moderation", href: "/staff/moderation" },
      { icon: "activity", label: "Activity", href: "/staff/activity" },
      { icon: "communications", label: "Communications", href: "/staff/communications" },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { icon: "drops", label: "Drops", href: "/staff/drops" },
      { icon: "roles", label: "Roles", href: "/staff/roles" },
      { icon: "demo", label: "Demo Mode", href: "/staff/demo" },
    ],
  },
];

export const adminNavItems = adminNavGroups.flatMap((group) => group.items);

export function getAccessibleAdminSections(highestRole: StaffRole) {
  if (highestRole === "staff") {
    return new Set<AdminSection>();
  }

  return new Set<AdminSection>(ROLE_ACCESS_PRESETS[highestRole] ?? ["overview"]);
}

export function canAccessAdminSection(highestRole: StaffRole, section: AdminSection) {
  return getAccessibleAdminSections(highestRole).has(section);
}

export function getAdminNavGroupsWithAccess(highestRole: StaffRole): AdminNavGroupWithAccess[] {
  return adminNavGroups.map((group) => ({
    ...group,
    accessible: canAccessAdminSection(highestRole, group.key),
  }));
}

export function getDefaultAdminHref(highestRole: StaffRole) {
  const accessibleSections = [...getAccessibleAdminSections(highestRole)];

  if (accessibleSections.length === 0) {
    return "/app-home";
  }

  const firstAccessibleGroup = adminNavGroups.find((group) => accessibleSections.includes(group.key));
  return firstAccessibleGroup?.items[0]?.href ?? "/staff";
}

export function formatStaffRole(role: StaffRole) {
  if (!role || role === "staff") {
    return "Staff";
  }

  return role
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getStaffRoleScope(role: StaffRole) {
  const sections = [...getAccessibleAdminSections(role)];

  if (sections.length === 0) {
    return "keinen Staff-Zugriff";
  }

  const labels = sections.map((section) => ADMIN_SECTION_LABELS[section]);

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} und ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")} und ${labels.at(-1)}`;
}

export function getStaffRoleDescription(role: StaffRole) {
  switch (role) {
    case "admin":
      return "Vollzugriff auf alle Bereiche.";
    case "moderator":
      return "Zugriff auf Management und Operations.";
    case "analyst":
      return "Zugriff auf Overview und Statistiken.";
    case "staff":
      return "Kein Staff-Zugriff.";
    default:
      return `Zugriff auf ${getStaffRoleScope(role)}.`;
  }
}
