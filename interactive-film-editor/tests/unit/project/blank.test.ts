import { describe, expect, it } from "vitest";
import { createBlankProject, newProjectId } from "@/domain/project/blank";
import { parseProjectDoc } from "@/domain/project/schema";

describe("空白工程", () => {
  it("生成合法文档并带一个起始节点", () => {
    const doc = createBlankProject("新项目");
    expect(() => parseProjectDoc(doc)).not.toThrow();
    expect(doc.scenes).toHaveLength(1);
    expect(doc.scenes[0]?.isStart).toBe(true);
    expect(doc.start.sceneId).toBe(doc.scenes[0]?.id);
    expect(doc.chapters?.[0]?.name).toBe("第一章");
  });

  it("id 唯一", () => {
    expect(newProjectId()).not.toBe(newProjectId());
    expect(createBlankProject("a").id).not.toBe(createBlankProject("a").id);
  });
});