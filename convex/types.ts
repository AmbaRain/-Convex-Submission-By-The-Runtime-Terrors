import { Id } from "./_generated/dataModel";

/**
 * Shared Opportunity Contract (Canonical Format)
 */
export type Opportunity = {
  id: string;
  title: string;
  organization: string;
  description: string;
  category: string; // "hackathon" | "job" | "scholarship" | "grant" | "fellowship" | "other"
  deadline: string | null;
  eligibility: string;
  location: string;
  url: string;
  source: string;
  salary?: string;
  tags?: string[];
  createdAt?: number;
};

/**
 * Shared Match Contract (Canonical Format)
 */
export type MatchResult = {
  opportunityId: string;
  matchScore: number; // 0 - 100
  matchReasons: string[];
};

/**
 * User Profile Contract
 */
export type UserProfile = {
  id?: string;
  email: string;
  name?: string;
  skills: string[];
  interests: string[];
  experienceLevel: string; // "entry" | "mid" | "senior" | "student" | string
  location: string;
  remoteOnly: boolean;
  bio?: string;
  targetRoles?: string[];
  alertSettings?: {
    minMatchScore: number;
    emailAlertsEnabled: boolean;
  };
};

/**
 * Application Tracking Statuses
 */
export type ApplicationStatus =
  | "saved"
  | "preparing"
  | "applied"
  | "interviewing"
  | "accepted"
  | "rejected";

export type ApplicationItem = {
  id: string;
  userId: string;
  opportunityId: string;
  status: ApplicationStatus;
  appliedDate?: string;
  followUpDate?: string;
  notes?: string;
  submissionUrl?: string;
  opportunity?: Opportunity;
};

/**
 * Alert / Notification Statuses
 */
export type AlertStatus = "unread" | "read" | "dismissed";
export type EmailDispatchStatus = "pending" | "sent" | "failed" | "skipped";
