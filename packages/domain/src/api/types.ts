import type { UUID } from "@salecalendar/shared-types";

export type HttpMethod = "GET" | "POST" | "PATCH";
export type AuthPolicy = "public" | "authenticated" | "admin";

export interface ApiContractEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  auth: AuthPolicy;
  description: string;
}

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  auth?: {
    userId?: UUID;
    isAdmin?: boolean;
  };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiResponse<TBody = unknown> {
  status: number;
  body: TBody | ApiErrorBody;
}
