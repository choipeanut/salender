import type {
  JsonValue,
  NotificationRecord,
  NotificationType,
  SaleEvent,
  UserBrandSubscription
} from "@salecalendar/shared-types";

import type {
  BrandRepository,
  NotificationCreateInput,
  NotificationRepository,
  SubscriptionRepository,
  UserDeviceRepository
} from "../repositories/interfaces";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: JsonValue;
}

export interface PushSendResult {
  to: string;
  success: boolean;
  ticketId?: string | undefined;
  errorMessage?: string | undefined;
}

export interface PushGateway {
  send(messages: PushMessage[]): Promise<PushSendResult[]>;
}

export interface PushNotificationPipelineDependencies {
  brandRepository: BrandRepository;
  subscriptionRepository: SubscriptionRepository;
  notificationRepository: NotificationRepository;
  userDeviceRepository: UserDeviceRepository;
  pushGateway: PushGateway;
}

export interface ProcessSaleEventNotificationInput {
  previousEvent: SaleEvent | null;
  currentEvent: SaleEvent;
  now: Date;
}

export interface NotificationDispatchSummary {
  createdCount: number;
  sentCount: number;
  failedCount: number;
  dedupedCount: number;
  skippedCount: number;
  typeCounts: Record<NotificationType, number>;
}

interface NotificationCandidate {
  notificationType: NotificationType;
  dedupeKey: string;
}

const isExpoPushToken = (token: string): boolean =>
  /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token);

const parseTime = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const hoursUntil = (to: Date, from: Date): number => (to.getTime() - from.getTime()) / 3_600_000;

const buildDedupeKey = (
  notificationType: NotificationType,
  event: SaleEvent,
  subscription: UserBrandSubscription
): string => {
  if (notificationType === "ending_soon") {
    return `${notificationType}:${event.id}:${subscription.notifyBeforeEndHours}`;
  }
  if (notificationType === "discount_changed") {
    const discountValue =
      event.discountPercent === null ? "null" : String(event.discountPercent);
    return `${notificationType}:${event.id}:${discountValue}:${event.normalizedHash}`;
  }
  return `${notificationType}:${event.id}`;
};

const resolveCandidates = (params: {
  subscription: UserBrandSubscription;
  previousEvent: SaleEvent | null;
  currentEvent: SaleEvent;
  now: Date;
}): NotificationCandidate[] => {
  const { subscription, previousEvent, currentEvent, now } = params;
  if (!subscription.isEnabled) {
    return [];
  }

  const candidates: NotificationType[] = [];

  if (!previousEvent && subscription.notifyOnNewSale) {
    candidates.push("new_sale");
  }

  if (
    previousEvent &&
    subscription.notifyOnSaleStart &&
    previousEvent.status !== "active" &&
    currentEvent.status === "active"
  ) {
    candidates.push("sale_started");
  }

  if (
    previousEvent &&
    subscription.notifyOnDiscountChange &&
    previousEvent.discountPercent !== currentEvent.discountPercent
  ) {
    candidates.push("discount_changed");
  }

  const currentEndAt = parseTime(currentEvent.endAt);
  if (
    subscription.notifyBeforeEndHours > 0 &&
    currentEndAt &&
    currentEvent.status !== "ended"
  ) {
    const remainingHours = hoursUntil(currentEndAt, now);
    if (remainingHours > 0 && remainingHours <= subscription.notifyBeforeEndHours) {
      candidates.push("ending_soon");
    }
  }

  return candidates.map((notificationType) => ({
    notificationType,
    dedupeKey: buildDedupeKey(notificationType, currentEvent, subscription)
  }));
};

const buildNotificationCopy = (
  notificationType: NotificationType,
  brandName: string,
  event: SaleEvent
): { title: string; body: string } => {
  if (notificationType === "new_sale") {
    return {
      title: `[${brandName}] New sale`,
      body: `${event.title} is now listed.`
    };
  }
  if (notificationType === "sale_started") {
    return {
      title: `[${brandName}] Sale started`,
      body: `${event.title} is now active.`
    };
  }
  if (notificationType === "ending_soon") {
    return {
      title: `[${brandName}] Ending soon`,
      body: `${event.title} is ending soon.`
    };
  }
  return {
    title: `[${brandName}] Discount changed`,
    body: `${event.title} has a discount update.`
  };
};

const buildNotificationPayload = (params: {
  notificationType: NotificationType;
  dedupeKey: string;
  currentEvent: SaleEvent;
}): NotificationCreateInput["payloadJson"] => ({
  dedupeKey: params.dedupeKey,
  eventId: params.currentEvent.id,
  eventExternalId: params.currentEvent.externalId,
  normalizedHash: params.currentEvent.normalizedHash,
  notificationType: params.notificationType
});

const initialSummary = (): NotificationDispatchSummary => ({
  createdCount: 0,
  sentCount: 0,
  failedCount: 0,
  dedupedCount: 0,
  skippedCount: 0,
  typeCounts: {
    new_sale: 0,
    sale_started: 0,
    ending_soon: 0,
    discount_changed: 0
  }
});

export class PushNotificationPipelineService {
  private readonly dependencies: PushNotificationPipelineDependencies;

  constructor(dependencies: PushNotificationPipelineDependencies) {
    this.dependencies = dependencies;
  }

  async processSaleEventChange(
    input: ProcessSaleEventNotificationInput
  ): Promise<NotificationDispatchSummary> {
    const summary = initialSummary();
    const brand = await this.dependencies.brandRepository.findBrandById(input.currentEvent.brandId);
    const brandName = brand?.name ?? "Brand";

    const subscriptions = await this.dependencies.subscriptionRepository.listSubscriptionsByBrand(
      input.currentEvent.brandId
    );
    for (const subscription of subscriptions) {
      const candidates = resolveCandidates({
        subscription,
        previousEvent: input.previousEvent,
        currentEvent: input.currentEvent,
        now: input.now
      });

      if (candidates.length === 0) {
        summary.skippedCount += 1;
        continue;
      }

      for (const candidate of candidates) {
        const duplicate = await this.dependencies.notificationRepository.findNotificationByDedupeKey(
          subscription.userId,
          candidate.dedupeKey
        );
        if (duplicate) {
          summary.dedupedCount += 1;
          continue;
        }

        const copy = buildNotificationCopy(
          candidate.notificationType,
          brandName,
          input.currentEvent
        );
        const createdNotification = await this.dependencies.notificationRepository.createNotification(
          {
            userId: subscription.userId,
            brandId: input.currentEvent.brandId,
            saleEventId: input.currentEvent.id,
            notificationType: candidate.notificationType,
            title: copy.title,
            body: copy.body,
            payloadJson: buildNotificationPayload({
              notificationType: candidate.notificationType,
              dedupeKey: candidate.dedupeKey,
              currentEvent: input.currentEvent
            }),
            status: "queued",
            createdAt: input.now.toISOString()
          }
        );
        summary.createdCount += 1;
        summary.typeCounts[candidate.notificationType] += 1;

        await this.sendToUserDevices(createdNotification, input.now, summary);
      }
    }

    return summary;
  }

  private async sendToUserDevices(
    notification: NotificationRecord,
    now: Date,
    summary: NotificationDispatchSummary
  ): Promise<void> {
    const allDevices = await this.dependencies.userDeviceRepository.listUserDevicesByUser(
      notification.userId
    );
    const targetDevices = allDevices.filter(
      (device) => device.isActive && isExpoPushToken(device.pushToken)
    );

    if (targetDevices.length === 0) {
      await this.dependencies.notificationRepository.updateNotificationStatus({
        notificationId: notification.id,
        status: "failed"
      });
      summary.failedCount += 1;
      return;
    }

    const messages: PushMessage[] = targetDevices.map((device) => ({
      to: device.pushToken,
      title: notification.title,
      body: notification.body,
      data: {
        notificationId: notification.id,
        saleEventId: notification.saleEventId,
        notificationType: notification.notificationType
      }
    }));

    try {
      const results = await this.dependencies.pushGateway.send(messages);
      const hasSuccess = results.some((result) => result.success);
      const status = hasSuccess ? "sent" : "failed";
      await this.dependencies.notificationRepository.updateNotificationStatus({
        notificationId: notification.id,
        status,
        sentAt: hasSuccess ? now.toISOString() : null
      });
      if (hasSuccess) {
        summary.sentCount += 1;
      } else {
        summary.failedCount += 1;
      }
    } catch (_error) {
      await this.dependencies.notificationRepository.updateNotificationStatus({
        notificationId: notification.id,
        status: "failed",
        sentAt: null
      });
      summary.failedCount += 1;
    }
  }
}
