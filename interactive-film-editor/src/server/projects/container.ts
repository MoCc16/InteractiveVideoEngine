import path from "node:path";
import { FileProjectStore } from "@/server/projects/store";
import { ProjectService } from "@/server/projects/service";

let cached: ProjectService | null = null;

/** Phase 1 容器：文件存储；迁移 morph 时替换为 PrismaProjectStore */
export function getProjectService(): ProjectService {
  if (!cached) {
    cached = new ProjectService(new FileProjectStore(path.join(process.cwd(), "data", "projects")));
  }
  return cached;
}