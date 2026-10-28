/**
 * 统一 API 出口（对齐 morph 的 apiHandler 约定）：
 * 鉴权/校验在 route，错误归一与日志在这里；业务逻辑下沉 src/server/**。
 */
import { NextResponse } from "next/server";
import { ApiError } from "@/server/http/api-error";

export interface RequestMeta {
  requestId: string;
  method: string;
  path: string;
}

function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: code, message, details }, { status });
}

/**
 * 包一个 route handler：捕获 ApiError 与未知异常，输出统一错误体。
 * 不使用 console.*（morph 的 no-console 约定）；错误通过响应体与调用方日志暴露。
 */
export function apiHandler<T extends unknown[]>(
  handler: (req: Request, meta: RequestMeta, ...args: T) => Promise<NextResponse>,
) {
  return async (req: Request, ...args: T): Promise<NextResponse> => {
    const url = new URL(req.url);
    const meta: RequestMeta = {
      requestId: req.headers.get("x-request-id") ?? newRequestId(),
      method: req.method,
      path: url.pathname,
    };
    try {
      const response = await handler(req, meta, ...args);
      response.headers.set("x-request-id", meta.requestId);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error.status, error.code, error.message, error.details);
      }
      return jsonError(500, "internal_error", "服务内部错误");
    }
  };
}