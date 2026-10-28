/**
 * 鉴权桩：Phase 1 用请求头 x-user-id 模拟会话（默认 u_demo）。
 * 迁移 morph 时替换为 requireUserAuth / requireProjectAuth，调用方不改。
 */
import { NextResponse } from "next/server";
import { unauthorized } from "@/server/http/api-error";

export interface Session {
  userId: string;
}

export function getSession(req: Request): Session | null {
  const userId = req.headers.get("x-user-id")?.trim() || "u_demo";
  return userId ? { userId } : null;
}

export function requireUserAuth(req: Request): Session {
  const session = getSession(req);
  if (!session) throw unauthorized();
  return session;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}