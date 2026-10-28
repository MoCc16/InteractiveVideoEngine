import { NextResponse } from "next/server";
import path from "node:path";
import { apiHandler } from "@/server/http/api-handler";
import { badRequest, inUse, notFound, unprocessable } from "@/server/http/api-error";
import { requireUserAuth } from "@/server/auth/session";
import { getProjectService } from "@/server/projects/container";
import { AssetRepository, bucketFor } from "@/server/assets/repository";
import { findAssetReferences } from "@/domain/project/references";
import type { ProjectAsset } from "@/domain/project/schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function repository() {
  return new AssetRepository(path.join(process.cwd(), "public", "uploads"));
}

export const POST = apiHandler(async (req, _meta, { params }: Params) => {
  const session = requireUserAuth(req);
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw badRequest("缺少 file 字段（multipart/form-data）");

  const bytes = Buffer.from(await file.arrayBuffer());
  let asset;
  try {
    asset = await repository().save({ name: file.name || "asset", mime: file.type, bytes });
  } catch (error) {
    throw unprocessable(error instanceof Error ? error.message : "素材保存失败");
  }

  const bucket = bucketFor(asset.kind);
  const result = await getProjectService().patch(
    id,
    { ops: [{ op: "add", path: `/assets/${bucket}/${asset.id}`, value: asset }] },
    session.userId,
  );
  return NextResponse.json({ asset, project: result.doc, revision: result.revision }, { status: 201 });
});

export const DELETE = apiHandler(async (req, _meta, { params }: Params) => {
  requireUserAuth(req);
  const { id } = await params;
  const url = new URL(req.url);
  const assetId = url.searchParams.get("assetId");
  if (!assetId) throw badRequest("缺少 assetId");

  const doc = await getProjectService().get(id);
  const buckets = ["videos", "images", "audio", "lotties"] as const;
  let found: { bucket: (typeof buckets)[number]; asset: ProjectAsset } | null = null;
  for (const bucket of buckets) {
    const asset = doc.assets?.[bucket]?.[assetId];
    if (asset) {
      found = { bucket, asset };
      break;
    }
  }
  if (!found) throw notFound(`素材 ${assetId} 不存在`);

  const references = findAssetReferences(doc, assetId);
  if (references.length > 0) {
    throw inUse("素材仍被引用，不能删除", { references });
  }

  const result = await getProjectService().patch(
    id,
    { ops: [{ op: "remove", path: `/assets/${found.bucket}/${assetId}` }] },
    "u_demo",
  );
  await repository().remove(found.asset.src);
  return NextResponse.json({ deleted: true, project: result.doc, revision: result.revision });
});
