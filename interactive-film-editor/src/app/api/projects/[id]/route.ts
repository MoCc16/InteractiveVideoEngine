import { NextResponse } from "next/server";
import { apiHandler } from "@/server/http/api-handler";
import { requireUserAuth } from "@/server/auth/session";
import { getProjectService } from "@/server/projects/container";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (req, _meta, { params }: Params) => {
  requireUserAuth(req);
  const { id } = await params;
  const doc = await getProjectService().get(id);
  return NextResponse.json({ project: doc });
});

export const PATCH = apiHandler(async (req, _meta, { params }: Params) => {
  const session = requireUserAuth(req);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = await getProjectService().patch(id, body, session.userId);
  return NextResponse.json({ project: result.doc, revision: result.revision });
});

export const DELETE = apiHandler(async (req, _meta, { params }: Params) => {
  const session = requireUserAuth(req);
  const { id } = await params;
  await getProjectService().remove(id, session.userId);
  return NextResponse.json({ ok: true });
});