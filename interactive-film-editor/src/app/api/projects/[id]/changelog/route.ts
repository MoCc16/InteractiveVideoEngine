import { NextResponse } from "next/server";
import { apiHandler } from "@/server/http/api-handler";
import { requireUserAuth } from "@/server/auth/session";
import { getProjectService } from "@/server/projects/container";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (req, _meta, { params }: Params) => {
  requireUserAuth(req);
  const { id } = await params;
  const revisions = await getProjectService().changelog(id);
  return NextResponse.json({ revisions });
});
