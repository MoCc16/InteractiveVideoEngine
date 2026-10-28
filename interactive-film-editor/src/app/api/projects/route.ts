import { NextResponse } from "next/server";
import { apiHandler } from "@/server/http/api-handler";
import { requireUserAuth } from "@/server/auth/session";
import { getProjectService } from "@/server/projects/container";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (req) => {
  const session = requireUserAuth(req);
  const projects = await getProjectService().list(session.userId);
  return NextResponse.json({ projects });
});

export const POST = apiHandler(async (req) => {
  const session = requireUserAuth(req);
  const body = await req.json().catch(() => null);
  const doc = await getProjectService().create(body, session.userId);
  return NextResponse.json({ project: doc }, { status: 201 });
});