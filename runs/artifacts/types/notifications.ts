// ============================================================
// types/notifications.ts
// Central type definitions for the notifications & alerts system
// ============================================================

export type AlertSeverity = "info" | "warning" | "critical" | "success";

export type AlertCategory =
  | "milestone"
  | "performance_drop"
  | "injury_risk"
  | "recovery"
  | "load_management"
  | "streak"
  | "personal_best";

export type DeliveryChannel = "in_app" | "email" | "push" | "sms";

export type NotificationStatus =
  | "unread"
  | "read"
  | "acknowledged"
  | "snoozed"
  | "dismissed";

export type RecipientRole =
  | "athlete"
  | "coach"
  | "physio"
  | "admin"
  | "parent";

// ─── Core Alert / Notification ────────────────────────────────────────────────

export interface AlertThreshold {
  metric: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "pct_change";
  value: number;
  /** For pct_change: window in days to compare against */
  windowDays?: number;
  /** Minimum number of consecutive readings before firing */
  minConsecutive?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  thresholds: AlertThreshold[];
  /** All thresholds must match (AND) vs any (OR) */
  thresholdLogic: "AND" | "OR";
  channels: DeliveryChannel[];
  recipientRoles: RecipientRole[];
  /** Minimum minutes between repeated firings for same athlete */
  cooldownMinutes: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  ruleId: string;
  athleteId: string;
  athleteName: string;
  teamId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Structured context data used to build the message */
  payload: Record<string, unknown>;
  status: NotificationStatus;
  channels: DeliveryChannel[];
  /** ISO timestamps */
  createdAt: string;
  readAt?: string;
  acknowledgedAt?: string;
  snoozedUntil?: string;
  dismissedAt?: string;
  /** Who acknowledged / dismissed */
  actorId?: string;
  actorName?: string;
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

export interface DeliveryReceipt {
  notificationId: string;
  channel: DeliveryChannel;
  recipientId: string;
  recipientRole: RecipientRole;
  sentAt: string;
  deliveredAt?: string;
  failedAt?: string;
  error?: string;
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export interface ChannelPreference {
  channel: DeliveryChannel;
  enabled: boolean;
  /** Quiet hours (24h format, e.g. "22:00") */
  quietFrom?: string;
  quietTo?: string;
}

export interface CategoryPreference {
  category: AlertCategory;
  enabled: boolean;
  minSeverity: AlertSeverity;
  channels: ChannelPreference[];
}

export interface NotificationPreferences {
  userId: string;
  role: RecipientRole;
  globalEnabled: boolean;
  timezone: string;
  categories: CategoryPreference[];
  updatedAt: string;
}

// ─── Metrics snapshot (fed into the engine) ───────────────────────────────────

export interface AthleteMetricSnapshot {
  athleteId: string;
  athleteName: string;
  teamId: string;
  recordedAt: string;
  metrics: {
    // Performance
    vo2Max?: number;
    sprintSpeed?: number; // m/s
    powerOutput?: number; // watts
    verticalJump?: number; // cm
    reactionTime?: number; // ms
    // Load
    trainingLoad?: number; // arbitrary units
    acuteLoad?: number;
    chronicLoad?: number;
    acwrRatio?: number; // Acute:Chronic Workload Ratio
    // Recovery & Injury Risk
    rpe?: number; // Rate of Perceived Exertion 1-10
    hrv?: number; // Heart Rate Variability (ms)
    restingHR?: number; // bpm
    sleepScore?: number; // 0-100
    muscleSoreness?: number; // 1-10
    injuryRiskScore?: number; // 0-100
    // Milestones
    sessionCount?: number;
    distanceCumulative?: number; // km
    goalCompletionPct?: number; // 0-100
  };
}

// ─── Engine result ────────────────────────────────────────────────────────────

export interface EvaluationResult {
  ruleId: string;
  athleteId: string;
  fired: boolean;
  matchedThresholds: AlertThreshold[];
  currentValues: Record<string, number>;
  notification?: Notification;
}

// ─── Summary / Stats ──────────────────────────────────────────────────────────

export interface NotificationSummary {
  total: number;
  unread: number;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<AlertCategory, number>;
  recentAlerts: Notification[];
}
