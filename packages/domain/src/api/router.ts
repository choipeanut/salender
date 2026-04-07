import { ZodError } from "zod";

import { apiContract } from "./contract";
import { ApiDomainError } from "./errors";
import {
  adminSyncBodySchema,
  brandSlugParamsSchema,
  createSubscriptionBodySchema,
  notificationsQuerySchema,
  patchSubscriptionBodySchema,
  registerExpoPushTokenBodySchema,
  saleEventByIdParamsSchema,
  saleEventsQuerySchema,
  subscriptionBrandParamsSchema
} from "./schemas";
import type { ApiErrorBody, ApiRequest, ApiResponse, AuthPolicy } from "./types";
import { SaleCalendarApiService, type SaleCalendarApiServiceDependencies } from "../services/sale-calendar-api-service";

type RouteParams = Record<string, string>;

interface RouteDefinition {
  method: ApiRequest["method"];
  path: string;
  auth: AuthPolicy;
  run: (request: ApiRequest, params: RouteParams, service: SaleCalendarApiService) => Promise<ApiResponse>;
}

const trimSlash = (value: string): string => value.replace(/^\/+|\/+$/g, "");

const matchPath = (pattern: string, path: string): RouteParams | null => {
  const patternParts = trimSlash(pattern).split("/").filter(Boolean);
  const pathParts = trimSlash(path).split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: RouteParams = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (!patternPart || !pathPart) {
      return null;
    }

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = pathPart;
      continue;
    }

    if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
};

const formatErrorResponse = (status: number, code: string, message: string, details?: unknown): ApiResponse => {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      details
    }
  };
  return { status, body };
};

const ensureAuthPolicy = (request: ApiRequest, policy: AuthPolicy): void => {
  if (policy === "public") {
    return;
  }
  if (!request.auth?.userId) {
    throw new ApiDomainError(401, "unauthorized", "Authentication required.");
  }
  if (policy === "admin" && !request.auth.isAdmin) {
    throw new ApiDomainError(403, "forbidden", "Admin role is required.");
  }
};

const routeDefinitions: RouteDefinition[] = [
  {
    method: "GET",
    path: "/brands",
    auth: "public",
    run: async (_request, _params, service) => ({
      status: 200,
      body: { brands: await service.getBrands() }
    })
  },
  {
    method: "GET",
    path: "/brands/:slug",
    auth: "public",
    run: async (_request, params, service) => {
      const validated = brandSlugParamsSchema.parse(params);
      return {
        status: 200,
        body: { brand: await service.getBrandBySlug(validated.slug) }
      };
    }
  },
  {
    method: "GET",
    path: "/sale-events",
    auth: "public",
    run: async (request, _params, service) => {
      const validated = saleEventsQuerySchema.parse(request.query ?? {});
      return {
        status: 200,
        body: { saleEvents: await service.getSaleEvents(validated) }
      };
    }
  },
  {
    method: "GET",
    path: "/sale-events/:id",
    auth: "public",
    run: async (_request, params, service) => {
      const validated = saleEventByIdParamsSchema.parse(params);
      return {
        status: 200,
        body: { saleEvent: await service.getSaleEventById(validated.id) }
      };
    }
  },
  {
    method: "POST",
    path: "/subscriptions/brands/:brandId",
    auth: "authenticated",
    run: async (request, params, service) => {
      const validatedParams = subscriptionBrandParamsSchema.parse(params);
      const validatedBody = createSubscriptionBodySchema.parse(request.body ?? {});
      return {
        status: 200,
        body: {
          subscription: await service.createOrEnableSubscription(
            request.auth ?? {},
            validatedParams.brandId,
            validatedBody
          )
        }
      };
    }
  },
  {
    method: "PATCH",
    path: "/subscriptions/brands/:brandId",
    auth: "authenticated",
    run: async (request, params, service) => {
      const validatedParams = subscriptionBrandParamsSchema.parse(params);
      const validatedBody = patchSubscriptionBodySchema.parse(request.body ?? {});
      return {
        status: 200,
        body: {
          subscription: await service.patchSubscription(
            request.auth ?? {},
            validatedParams.brandId,
            validatedBody
          )
        }
      };
    }
  },
  {
    method: "GET",
    path: "/me/subscriptions",
    auth: "authenticated",
    run: async (request, _params, service) => ({
      status: 200,
      body: { subscriptions: await service.getMySubscriptions(request.auth ?? {}) }
    })
  },
  {
    method: "GET",
    path: "/notifications",
    auth: "authenticated",
    run: async (request, _params, service) => {
      const validated = notificationsQuerySchema.parse(request.query ?? {});
      return {
        status: 200,
        body: { notifications: await service.getNotifications(request.auth ?? {}, validated) }
      };
    }
  },
  {
    method: "POST",
    path: "/me/devices/expo-token",
    auth: "authenticated",
    run: async (request, _params, service) => {
      const validatedBody = registerExpoPushTokenBodySchema.parse(request.body ?? {});
      return {
        status: 200,
        body: {
          userDevice: await service.registerExpoPushToken(request.auth ?? {}, validatedBody)
        }
      };
    }
  },
  {
    method: "POST",
    path: "/admin/sync/run",
    auth: "admin",
    run: async (request, _params, service) => {
      const validated = adminSyncBodySchema.parse(request.body ?? {});
      return {
        status: 201,
        body: { syncRun: await service.runAdminSync(request.auth ?? {}, validated) }
      };
    }
  }
];

const resolveRoute = (request: ApiRequest): { route: RouteDefinition; params: RouteParams } | null => {
  for (const route of routeDefinitions) {
    if (route.method !== request.method) {
      continue;
    }
    const params = matchPath(route.path, request.path);
    if (params) {
      return { route, params };
    }
  }
  return null;
};

export interface ApiRouter {
  handle(request: ApiRequest): Promise<ApiResponse>;
}

export const createApiRouter = (dependencies: SaleCalendarApiServiceDependencies): ApiRouter => {
  const service = new SaleCalendarApiService(dependencies);

  return {
    handle: async (request: ApiRequest): Promise<ApiResponse> => {
      const matched = resolveRoute(request);
      if (!matched) {
        return formatErrorResponse(404, "route_not_found", `No route for ${request.method} ${request.path}`);
      }

      try {
        ensureAuthPolicy(request, matched.route.auth);
        return await matched.route.run(request, matched.params, service);
      } catch (error) {
        if (error instanceof ZodError) {
          return formatErrorResponse(400, "invalid_request", "Request validation failed.", error.flatten());
        }
        if (error instanceof ApiDomainError) {
          return formatErrorResponse(error.status, error.code, error.message, error.details);
        }
        return formatErrorResponse(500, "internal_error", "Unhandled API error.");
      }
    }
  };
};

export const listImplementedEndpointContracts = (): typeof apiContract => apiContract;
