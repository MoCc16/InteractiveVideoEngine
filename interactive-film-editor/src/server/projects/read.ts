import { cache } from "react";
import { notFound } from "next/navigation";
import { getProjectService } from "@/server/projects/container";
import type { ProjectDoc } from "@/domain/project/schema";

/**
 * 同一请求内复用文档读取（layout 与 page 都会要 doc）。
 * 读的是本地文件，cache() 保证一次请求只解析一次。
 */
export const getProjectDoc = cache(async (id: string): Promise<ProjectDoc> => {
  const service = getProjectService();
  try {
    return await service.get(id);
  } catch {
    notFound();
  }
});
