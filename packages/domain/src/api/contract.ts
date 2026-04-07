import type { ApiContractEndpoint } from "./types";

export const apiContract: ApiContractEndpoint[] = [
  {
    id: "getBrands",
    method: "GET",
    path: "/brands",
    auth: "public",
    description: "List active brands"
  },
  {
    id: "getBrandBySlug",
    method: "GET",
    path: "/brands/:slug",
    auth: "public",
    description: "Get a brand by slug"
  },
  {
    id: "getSaleEvents",
    method: "GET",
    path: "/sale-events",
    auth: "public",
    description: "List sale events by month and optional brand filter"
  },
  {
    id: "getSaleEventById",
    method: "GET",
    path: "/sale-events/:id",
    auth: "public",
    description: "Get a sale event by id"
  },
  {
    id: "createBrandSubscription",
    method: "POST",
    path: "/subscriptions/brands/:brandId",
    auth: "authenticated",
    description: "Create or enable a brand subscription"
  },
  {
    id: "patchBrandSubscription",
    method: "PATCH",
    path: "/subscriptions/brands/:brandId",
    auth: "authenticated",
    description: "Patch brand subscription settings"
  },
  {
    id: "getMySubscriptions",
    method: "GET",
    path: "/me/subscriptions",
    auth: "authenticated",
    description: "List subscriptions for current user"
  },
  {
    id: "getNotifications",
    method: "GET",
    path: "/notifications",
    auth: "authenticated",
    description: "List notifications for current user"
  },
  {
    id: "registerExpoPushToken",
    method: "POST",
    path: "/me/devices/expo-token",
    auth: "authenticated",
    description: "Register or refresh Expo push token"
  },
  {
    id: "runAdminSync",
    method: "POST",
    path: "/admin/sync/run",
    auth: "admin",
    description: "Create manual sync run"
  }
];
