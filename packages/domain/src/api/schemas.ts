import { z } from "zod";

import type { UUID } from "@salecalendar/shared-types";

const uuidSchema = z.string().uuid();

const parseInteger = (value: unknown): unknown => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return value;
};

const parseUuidList = (value: string): UUID[] => {
  const chunks = value
    .split(",")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  if (chunks.length === 0) {
    throw new Error("brandIds must contain at least one UUID.");
  }

  for (const chunk of chunks) {
    if (!uuidSchema.safeParse(chunk).success) {
      throw new Error(`Invalid UUID in brandIds: ${chunk}`);
    }
  }

  return chunks;
};

export const brandSlugParamsSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
});

export const saleEventByIdParamsSchema = z.object({
  id: uuidSchema
});

export const saleEventsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must follow YYYY-MM format."),
  brandIds: z
    .string()
    .optional()
    .transform((value) => (value ? parseUuidList(value) : undefined))
});

export const subscriptionBrandParamsSchema = z.object({
  brandId: uuidSchema
});

const subscriptionSettingsBaseSchema = z.object({
  isEnabled: z.boolean().optional(),
  notifyOnNewSale: z.boolean().optional(),
  notifyOnSaleStart: z.boolean().optional(),
  notifyBeforeEndHours: z.number().int().min(0).max(168).optional(),
  notifyOnDiscountChange: z.boolean().optional()
});

const subscriptionDefaults = {
  isEnabled: true,
  notifyOnNewSale: true,
  notifyOnSaleStart: true,
  notifyBeforeEndHours: 24,
  notifyOnDiscountChange: false
} as const;

export const createSubscriptionBodySchema = subscriptionSettingsBaseSchema
  .default({})
  .transform((value) => ({
    isEnabled: value.isEnabled ?? subscriptionDefaults.isEnabled,
    notifyOnNewSale: value.notifyOnNewSale ?? subscriptionDefaults.notifyOnNewSale,
    notifyOnSaleStart: value.notifyOnSaleStart ?? subscriptionDefaults.notifyOnSaleStart,
    notifyBeforeEndHours: value.notifyBeforeEndHours ?? subscriptionDefaults.notifyBeforeEndHours,
    notifyOnDiscountChange: value.notifyOnDiscountChange ?? subscriptionDefaults.notifyOnDiscountChange
  }));

export const patchSubscriptionBodySchema = subscriptionSettingsBaseSchema.refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided for PATCH."
);

export const notificationsQuerySchema = z.object({
  status: z.enum(["queued", "sent", "failed", "read"]).optional(),
  limit: z.preprocess(parseInteger, z.number().int().min(1).max(100)).optional().default(20),
  offset: z.preprocess(parseInteger, z.number().int().min(0)).optional().default(0)
});

const expoPushTokenRegex = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export const registerExpoPushTokenBodySchema = z.object({
  platform: z.enum(["ios", "android", "web", "unknown"]),
  expoPushToken: z
    .string()
    .regex(expoPushTokenRegex, "expoPushToken must match Expo push token format."),
  appVersion: z.string().min(1).optional()
});

export const adminSyncBodySchema = z.object({
  brandId: uuidSchema,
  sourceId: uuidSchema.optional()
});

export type BrandSlugParams = z.infer<typeof brandSlugParamsSchema>;
export type SaleEventByIdParams = z.infer<typeof saleEventByIdParamsSchema>;
export type SaleEventsQuery = z.infer<typeof saleEventsQuerySchema>;
export type SubscriptionBrandParams = z.infer<typeof subscriptionBrandParamsSchema>;
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBodySchema>;
export type PatchSubscriptionBody = z.infer<typeof patchSubscriptionBodySchema>;
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;
export type RegisterExpoPushTokenBody = z.infer<typeof registerExpoPushTokenBodySchema>;
export type AdminSyncBody = z.infer<typeof adminSyncBodySchema>;
