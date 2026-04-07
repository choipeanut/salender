import type {
  Brand,
  NotificationRecord,
  NotificationStatus,
  SaleEvent,
  SyncRun,
  UserBrandSubscription,
  UserDevice,
  UUID
} from "@salecalendar/shared-types";

import { forbidden, notFound, unauthorized } from "../api/errors";
import type {
  BrandRepository,
  CreateSyncRunInput,
  NotificationRepository,
  NotificationListQuery,
  SaleEventRepository,
  SubscriptionPatchInput,
  SubscriptionRepository,
  SubscriptionSettingsInput,
  SyncRunRepository,
  UserDeviceRepository
} from "../repositories/interfaces";

export interface AuthContext {
  userId?: UUID;
  isAdmin?: boolean;
}

export interface SaleCalendarApiServiceDependencies {
  brandRepository: BrandRepository;
  saleEventRepository: SaleEventRepository;
  subscriptionRepository: SubscriptionRepository;
  notificationRepository: NotificationRepository;
  syncRunRepository: SyncRunRepository;
  userDeviceRepository: UserDeviceRepository;
}

export interface GetSaleEventsInput {
  month: string;
  brandIds?: UUID[] | undefined;
}

export interface ListNotificationsInput {
  status?: NotificationStatus | undefined;
  limit: number;
  offset: number;
}

export interface RegisterExpoPushTokenInput {
  platform: "ios" | "android" | "web" | "unknown";
  expoPushToken: string;
  appVersion?: string | undefined;
}

export class SaleCalendarApiService {
  private readonly dependencies: SaleCalendarApiServiceDependencies;

  constructor(dependencies: SaleCalendarApiServiceDependencies) {
    this.dependencies = dependencies;
  }

  async getBrands(): Promise<Brand[]> {
    const brands = await this.dependencies.brandRepository.listBrands();
    return brands
      .filter((brand) => brand.isActive)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async getBrandBySlug(slug: string): Promise<Brand> {
    const brand = await this.dependencies.brandRepository.findBrandBySlug(slug);
    if (!brand || !brand.isActive) {
      throw notFound(`Brand not found for slug: ${slug}`);
    }
    return brand;
  }

  async getSaleEvents(input: GetSaleEventsInput): Promise<SaleEvent[]> {
    if (input.brandIds) {
      return this.dependencies.saleEventRepository.listSaleEvents({
        month: input.month,
        brandIds: input.brandIds
      });
    }
    return this.dependencies.saleEventRepository.listSaleEvents({ month: input.month });
  }

  async getSaleEventById(id: UUID): Promise<SaleEvent> {
    const event = await this.dependencies.saleEventRepository.findSaleEventById(id);
    if (!event) {
      throw notFound(`Sale event not found for id: ${id}`);
    }
    return event;
  }

  async createOrEnableSubscription(
    context: AuthContext,
    brandId: UUID,
    settings: SubscriptionSettingsInput
  ): Promise<UserBrandSubscription> {
    const userId = context.userId;
    if (!userId) {
      throw unauthorized();
    }

    const brand = await this.dependencies.brandRepository.findBrandById(brandId);
    if (!brand || !brand.isActive) {
      throw notFound(`Brand not found for id: ${brandId}`);
    }

    return this.dependencies.subscriptionRepository.upsertSubscription(userId, brandId, settings);
  }

  async patchSubscription(
    context: AuthContext,
    brandId: UUID,
    patch: SubscriptionPatchInput
  ): Promise<UserBrandSubscription> {
    const userId = context.userId;
    if (!userId) {
      throw unauthorized();
    }

    const brand = await this.dependencies.brandRepository.findBrandById(brandId);
    if (!brand || !brand.isActive) {
      throw notFound(`Brand not found for id: ${brandId}`);
    }

    const updated = await this.dependencies.subscriptionRepository.patchSubscription(
      userId,
      brandId,
      patch
    );
    if (!updated) {
      throw notFound(`Subscription not found for user/brand: ${userId}/${brandId}`);
    }
    return updated;
  }

  async getMySubscriptions(context: AuthContext): Promise<UserBrandSubscription[]> {
    const userId = context.userId;
    if (!userId) {
      throw unauthorized();
    }

    return this.dependencies.subscriptionRepository.listSubscriptionsByUser(userId);
  }

  async getNotifications(
    context: AuthContext,
    query: NotificationListQuery
  ): Promise<NotificationRecord[]> {
    const userId = context.userId;
    if (!userId) {
      throw unauthorized();
    }

    return this.dependencies.notificationRepository.listNotificationsByUser(userId, query);
  }

  async registerExpoPushToken(
    context: AuthContext,
    input: RegisterExpoPushTokenInput
  ): Promise<UserDevice> {
    const userId = context.userId;
    if (!userId) {
      throw unauthorized();
    }

    return this.dependencies.userDeviceRepository.upsertUserDevice(userId, {
      platform: input.platform,
      pushToken: input.expoPushToken,
      ...(input.appVersion !== undefined ? { appVersion: input.appVersion } : {})
    });
  }

  async runAdminSync(context: AuthContext, input: CreateSyncRunInput): Promise<SyncRun> {
    if (!context.userId) {
      throw unauthorized();
    }
    if (!context.isAdmin) {
      throw forbidden("Admin role is required for manual sync.");
    }

    const brand = await this.dependencies.brandRepository.findBrandById(input.brandId);
    if (!brand || !brand.isActive) {
      throw notFound(`Brand not found for id: ${input.brandId}`);
    }

    return this.dependencies.syncRunRepository.createManualSyncRun(input);
  }
}
