export const QUERY_KEYS = {
  ambassadors: (organizationId: string) => ['ambassadors', organizationId] as const,
  ambassador: (ambassadorId: string) => ['ambassador', ambassadorId] as const,
  ambassadorMetrics: (ambassadorId: string) => ['ambassadorMetrics', ambassadorId] as const,
  ambassadorRanking: (organizationId: string) => ['ambassadorRanking', organizationId] as const,
  ambassadorRequests: (organizationId: string) => ['ambassadorRequests', organizationId] as const,

  currentOrganization: (userId: string) => ['currentOrganization', userId] as const,
  organizations: (userId: string) => ['organizations', userId] as const,
  organizationMembers: (organizationId: string) => ['organizationMembers', organizationId] as const,
  organizationSettings: (organizationId: string) =>
    ['organizationSettings', organizationId] as const,

  events: (organizationId: string) => ['events', organizationId] as const,
  event: (eventId: string) => ['event', eventId] as const,
  fiestas: (organizationId: string) => ['fiestas', organizationId] as const,
  fiesta: (fiestaId: string) => ['fiesta', fiestaId] as const,
  fiestaMetrics: (fiestaId: string) => ['fiestaMetrics', fiestaId] as const,

  instagramTokenStatus: (organizationId: string) =>
    ['instagramTokenStatus', organizationId] as const,
  instagramConnection: (organizationId: string) => ['instagramConnection', organizationId] as const,
  instagramProfile: (organizationId: string) => ['instagramProfile', organizationId] as const,
  ambassadorInstagramStatus: (ambassadorId: string) =>
    ['ambassadorInstagramStatus', ambassadorId] as const,

  storyMentions: (organizationId: string) => ['storyMentions', organizationId] as const,
  storyInsights: (organizationId: string) => ['storyInsights', organizationId] as const,
  socialMentions: (organizationId: string) => ['socialMentions', organizationId] as const,
  socialMentionsFiltered: (
    organizationId: string,
    search: string,
    typeFilter: string,
    statusFilter: string
  ) => ['socialMentions', organizationId, search, typeFilter, statusFilter] as const,

  dashboardStats: (userId: string) => ['dashboardStats', userId] as const,
  analytics: (organizationId: string) => ['analytics', organizationId] as const,

  notifications: (userId: string) => ['notifications', userId] as const,
  unreadNotifications: (userId: string) => ['unreadNotifications', userId] as const,

  userProfile: (userId: string) => ['userProfile', userId] as const,

  tasks: (organizationId: string) => ['tasks', organizationId] as const,
  ambassadorTasks: (ambassadorId: string) => ['ambassadorTasks', ambassadorId] as const,

  systemChecks: (organizationId: string) => ['systemChecks', organizationId] as const,
  onboardingStatus: (userId: string) => ['onboardingStatus', userId] as const,
} as const;

export type QueryKey = ReturnType<(typeof QUERY_KEYS)[keyof typeof QUERY_KEYS]>;
