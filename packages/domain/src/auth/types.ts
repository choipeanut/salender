import type { SubscriptionSettingsInput } from "../repositories/interfaces";
import type { UserBrandSubscription } from "@salecalendar/shared-types";
import type { UUID } from "@salecalendar/shared-types";

export type GuestMergeStrategy = "preferAccount" | "preferGuest" | "smartUnion";

export interface AuthSession {
  userId: UUID;
  email: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface AuthUser {
  userId: UUID;
  email: string | null;
}

export interface SignInWithPasswordInput {
  email: string;
  password: string;
}

export interface GuestSubscriptionDraft {
  brandId: UUID;
  settings: SubscriptionSettingsInput;
}

export interface GuestMergeSummary {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
}

export interface SignInAndMergeResult {
  session: AuthSession;
  mergeSummary: GuestMergeSummary;
  mergedSubscriptions: UserBrandSubscription[];
}
