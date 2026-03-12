let jobsWarmPromise: Promise<unknown> | null = null;
let activityWarmPromise: Promise<unknown> | null = null;

export function warmJobsUI() {
  if (!jobsWarmPromise) {
    jobsWarmPromise = Promise.all([
      import("@/components/jobs/JobDetailModal"),
      import("@/components/jobs/JobApplicationModal"),
      import("@/components/jobs/JobFilterSortPanel"),
    ]);
  }

  return jobsWarmPromise;
}

export function warmActivityUI() {
  if (!activityWarmPromise) {
    activityWarmPromise = Promise.all([
      import("@/components/activity/ApplicationChatModal"),
      import("@/components/activity/ApplicationChat"),
    ]);
  }

  return activityWarmPromise;
}

export function warmRouteAdjacentUI(href: string) {
  if (href.startsWith("/app-home/jobs") || href.startsWith("/app-home/offers")) {
    return warmJobsUI();
  }

  if (href.startsWith("/app-home/activities")) {
    return warmActivityUI();
  }

  return Promise.resolve();
}
