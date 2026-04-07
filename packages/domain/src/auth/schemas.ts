import { z } from "zod";

const subscriptionSettingsSchema = z.object({
  isEnabled: z.boolean(),
  notifyOnNewSale: z.boolean(),
  notifyOnSaleStart: z.boolean(),
  notifyBeforeEndHours: z.number().int().min(0).max(168),
  notifyOnDiscountChange: z.boolean()
});

const expoPushTokenRegex = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export const authCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const guestMergeStrategySchema = z.enum(["preferAccount", "preferGuest", "smartUnion"]);

export const guestSubscriptionDraftSchema = z.object({
  brandId: z.string().uuid(),
  settings: subscriptionSettingsSchema
});

export const deviceRegistrationSchema = z.object({
  platform: z.enum(["ios", "android", "web", "unknown"]),
  pushToken: z
    .string()
    .regex(expoPushTokenRegex, "pushToken must match Expo push token format."),
  appVersion: z.string().min(1).optional()
});

export const guestSubscriptionDraftListSchema = z.array(guestSubscriptionDraftSchema);
