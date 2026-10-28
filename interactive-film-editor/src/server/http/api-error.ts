export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, "bad_request", message, details);
export const unauthorized = (message = "未登录") => new ApiError(401, "unauthorized", message);
export const notFound = (message = "资源不存在") => new ApiError(404, "not_found", message);
export const conflict = (message: string, details?: unknown) => new ApiError(409, "revision_conflict", message, details);
export const unprocessable = (message: string, details?: unknown) => new ApiError(422, "invalid_document", message, details);
export const inUse = (message: string, details?: unknown) => new ApiError(409, "asset_in_use", message, details);