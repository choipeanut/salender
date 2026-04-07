import { notFound } from "../api/errors";
import {
  authCredentialsSchema,
  deviceRegistrationSchema,
  guestSubscriptionDraftListSchema
} from "../auth/schemas";
import type { AuthGateway } from "../auth/interfaces";
import type {
  AuthSession,
  GuestMergeStrategy,
  GuestMergeSummary,
  GuestSubscriptionDraft,
  SignInAndMergeResult
} from "../auth/types";
import type {
  BrandRepository,
  DeviceRegistrationInput,
  SubscriptionRepository,
  SubscriptionSettingsInput,
  UserDeviceRepository
} from "../repositories/interfaces";
import type { UserBrandSubscription, UserDevice, UUID } from "@salecalendar/shared-types";

export interface SignInAndMergeInput {
  email: string;
  password: string;
  guestSubscriptions?: GuestSubscriptionDraft[] | undefined;
  mergeStrategy?: GuestMergeStrategy | undefined;
}

const toSettings = (subscription: UserBrandSubscription): SubscriptionSettingsInput => ({
  isEnabled: subscription.isEnabled,
  notifyOnNewSale: subscription.notifyOnNewSale,
  notifyOnSaleStart: subscription.notifyOnSaleStart,
  notifyBeforeEndHours: subscription.notifyBeforeEndHours,
  notifyOnDiscountChange: subscription.notifyOnDiscountChange
});

const isSameSettings = (
  left: SubscriptionSettingsInput,
  right: SubscriptionSettingsInput
): boolean =>
  left.isEnabled === right.isEnabled &&
  left.notifyOnNewSale === right.notifyOnNewSale &&
  left.notifyOnSaleStart === right.notifyOnSaleStart &&
  left.notifyBeforeEndHours === right.notifyBeforeEndHours &&
  left.notifyOnDiscountChange === right.notifyOnDiscountChange;

const mergeSettings = (
  existing: SubscriptionSettingsInput,
  guest: SubscriptionSettingsInput,
  strategy: GuestMergeStrategy
): SubscriptionSettingsInput => {
  if (strategy === "preferAccount") {
    return existing;
  }
  if (strategy === "preferGuest") {
    return guest;
  }

  return {
    isEnabled: existing.isEnabled || guest.isEnabled,
    notifyOnNewSale: existing.notifyOnNewSale || guest.notifyOnNewSale,
    notifyOnSaleStart: existing.notifyOnSaleStart || guest.notifyOnSaleStart,
    notifyBeforeEndHours: Math.min(existing.notifyBeforeEndHours, guest.notifyBeforeEndHours),
    notifyOnDiscountChange: existing.notifyOnDiscountChange || guest.notifyOnDiscountChange
  };
};

export interface AuthSubscriptionServiceDependencies {
  authGateway: AuthGateway;
  brandRepository: BrandRepository;
  subscriptionRepository: SubscriptionRepository;
  userDeviceRepository: UserDeviceRepository;
}

export class AuthSubscriptionService {
  private readonly dependencies: AuthSubscriptionServiceDependencies;

  constructor(dependencies: AuthSubscriptionServiceDependencies) {
    this.dependencies = dependencies;
  }

  async signInAndMergeGuestState(input: SignInAndMergeInput): Promise<SignInAndMergeResult> {
    const credentials = authCredentialsSchema.parse({
      email: input.email,
      password: input.password
    });
    const guestSubscriptions = guestSubscriptionDraftListSchema.parse(input.guestSubscriptions ?? []);
    const mergeStrategy: GuestMergeStrategy = input.mergeStrategy ?? "smartUnion";

    const session = await this.dependencies.authGateway.signInWithPassword(credentials);
    const mergeSummary = await this.mergeGuestSubscriptions(session.userId, guestSubscriptions, mergeStrategy);
    const mergedSubscriptions = await this.dependencies.subscriptionRepository.listSubscriptionsByUser(
      session.userId
    );

    return {
      session,
      mergeSummary,
      mergedSubscriptions
    };
  }

  async signOut(session: AuthSession): Promise<void> {
    await this.dependencies.authGateway.signOut(session.accessToken);
  }

  async saveBrandSubscription(
    userId: UUID,
    brandId: UUID,
    settings: SubscriptionSettingsInput
  ): Promise<UserBrandSubscription> {
    const brand = await this.dependencies.brandRepository.findBrandById(brandId);
    if (!brand || !brand.isActive) {
      throw notFound(`Brand not found for id: ${brandId}`);
    }
    return this.dependencies.subscriptionRepository.upsertSubscription(userId, brandId, settings);
  }

  async mergeGuestSubscriptions(
    userId: UUID,
    guestSubscriptions: GuestSubscriptionDraft[],
    strategy: GuestMergeStrategy
  ): Promise<GuestMergeSummary> {
    const deduped = new Map<UUID, GuestSubscriptionDraft>();
    for (const subscription of guestSubscriptions) {
      deduped.set(subscription.brandId, subscription);
    }

    const summary: GuestMergeSummary = {
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0
    };

    for (const draft of deduped.values()) {
      const brand = await this.dependencies.brandRepository.findBrandById(draft.brandId);
      if (!brand || !brand.isActive) {
        summary.skippedCount += 1;
        continue;
      }

      const existing = await this.dependencies.subscriptionRepository.findSubscription(
        userId,
        draft.brandId
      );

      if (!existing) {
        await this.dependencies.subscriptionRepository.upsertSubscription(
          userId,
          draft.brandId,
          draft.settings
        );
        summary.createdCount += 1;
        continue;
      }

      const mergedSettings = mergeSettings(toSettings(existing), draft.settings, strategy);
      if (isSameSettings(toSettings(existing), mergedSettings)) {
        summary.skippedCount += 1;
        continue;
      }

      await this.dependencies.subscriptionRepository.patchSubscription(userId, draft.brandId, {
        isEnabled: mergedSettings.isEnabled,
        notifyOnNewSale: mergedSettings.notifyOnNewSale,
        notifyOnSaleStart: mergedSettings.notifyOnSaleStart,
        notifyBeforeEndHours: mergedSettings.notifyBeforeEndHours,
        notifyOnDiscountChange: mergedSettings.notifyOnDiscountChange
      });
      summary.updatedCount += 1;
    }

    return summary;
  }

  async registerUserDevice(userId: UUID, input: DeviceRegistrationInput): Promise<UserDevice> {
    const validatedInput = deviceRegistrationSchema.parse(input);
    return this.dependencies.userDeviceRepository.upsertUserDevice(userId, validatedInput);
  }

  async listUserDevices(userId: UUID): Promise<UserDevice[]> {
    return this.dependencies.userDeviceRepository.listUserDevicesByUser(userId);
  }
}
