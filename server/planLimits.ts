export interface PlanLimits {
  maxTrackedGuilds: number;
  maxMembers: number;
  maxInvites: number;
  deathTrackerEnabled: boolean;
  onlineScraperEnabled: boolean;
  tibspyEnabled: boolean;
  webhooksEnabled: boolean;
}

const PLAN_CONFIGS: Record<string, PlanLimits> = {
  FREE: {
    maxTrackedGuilds: 1,
    maxMembers: 5,
    maxInvites: 3,
    deathTrackerEnabled: false,
    onlineScraperEnabled: false,
    tibspyEnabled: false,
    webhooksEnabled: false,
  },
  BASIC: {
    maxTrackedGuilds: 2,
    maxMembers: 15,
    maxInvites: 10,
    deathTrackerEnabled: true,
    onlineScraperEnabled: true,
    tibspyEnabled: false,
    webhooksEnabled: true,
  },
  PREMIUM: {
    maxTrackedGuilds: 5,
    maxMembers: 50,
    maxInvites: 50,
    deathTrackerEnabled: true,
    onlineScraperEnabled: true,
    tibspyEnabled: true,
    webhooksEnabled: true,
  },
  UNLIMITED: {
    maxTrackedGuilds: 999,
    maxMembers: 999,
    maxInvites: 999,
    deathTrackerEnabled: true,
    onlineScraperEnabled: true,
    tibspyEnabled: true,
    webhooksEnabled: true,
  },
};

export function getPlanLimits(subscriptionStatus: string): PlanLimits {
  return PLAN_CONFIGS[subscriptionStatus] || PLAN_CONFIGS.FREE;
}

export function checkPlanFeature(subscriptionStatus: string, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(subscriptionStatus);
  const val = limits[feature];
  return typeof val === "boolean" ? val : true;
}
