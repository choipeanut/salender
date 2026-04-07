export class ApiDomainError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiDomainError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (message: string, details?: unknown): ApiDomainError =>
  new ApiDomainError(404, "not_found", message, details);

export const unauthorized = (message = "Authentication required."): ApiDomainError =>
  new ApiDomainError(401, "unauthorized", message);

export const forbidden = (message = "Insufficient permissions."): ApiDomainError =>
  new ApiDomainError(403, "forbidden", message);
