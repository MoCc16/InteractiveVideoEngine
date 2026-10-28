import { NextResponse } from "next/server";
import path from "node:path";
import { apiHandler } from "@/server/http/api-handler";
import { requireUserAuth } from "@/server/auth/session";
import { getProjectService } from "@/server/projects/container";
import { badRequest } from "@/server/http/api-error";
import { buildExportPackage } from "@/server/export/build";
import type { ExportTarget } from "@/domain/project/export";

export const dynamic = "force-dynamic";

const TARGETS: ExportTarget[] = ["web", "launcher", "desktop", "apk"];

type Params = { params: Promise<{ id: string }> };

export const POST = apiHandler(async (req, _meta, { params }: Params) => {
  requireUserAuth(req);
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { target?: string };
  const target = (body.target ?? "web") as ExportTarget;
  if (!TARGETS.includes(target)) throw badRequest(`不支持的导出目标：${body.target}`);

  const doc = await getProjectService().get(id);
  const result = await buildExportPackage({
    doc,
    target,
    uploadsDir: path.join(process.cwd(), "public", "uploads"),
  });

  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
      "x-export-scenes": String(result.manifest["scenes"]),
      "x-export-credits": String(result.manifest["credits"]),
      "x-export-warnings": String(result.warnings.length),
    },
  });
});