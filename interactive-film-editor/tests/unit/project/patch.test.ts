import { describe, expect, it } from "vitest";
import { applyJsonPatch, invertJsonPatch, JsonPatchError, parsePointer } from "@/domain/project/patch";

const base = () => ({
  canvas: { width: 1920, height: 1080 },
  scenes: [
    { id: "s1", flow: { kind: "auto" } },
    { id: "s2", flow: { kind: "choice", choices: [] as Array<Record<string, unknown>> } },
  ],
});

describe("JSON Patch（RFC 6902）", () => {
  it("parsePointer 处理转义", () => {
    expect(parsePointer("/a~1b/c~0d")).toEqual(["a/b", "c~d"]);
    expect(parsePointer("")).toEqual([]);
  });

  it("replace 深路径不改原对象", () => {
    const doc = base();
    const next = applyJsonPatch(doc, [{ op: "replace", path: "/canvas/width", value: 1080 }]);
    expect(next.canvas.width).toBe(1080);
    expect(doc.canvas.width).toBe(1920);
  });

  it("add 到数组末尾（目标产品的 /scenes/- 写法）", () => {
    const doc = base();
    const next = applyJsonPatch(doc, [
      { op: "add", path: "/scenes/-", value: { id: "s3", flow: { kind: "ending" } } },
    ]);
    expect(next.scenes).toHaveLength(3);
    expect(next.scenes[2]?.id).toBe("s3");
  });

  it("add 到数组指定下标是插入而非覆盖", () => {
    const doc = base();
    const next = applyJsonPatch(doc, [
      { op: "add", path: "/scenes/0", value: { id: "s0", flow: { kind: "ending" } } },
    ]);
    expect(next.scenes.map((s) => s.id)).toEqual(["s0", "s1", "s2"]);
  });

  it("remove 删除选项后其余项顺序保持", () => {
    const doc = base();
    const withChoices = applyJsonPatch(doc, [
      { op: "add", path: "/scenes/1/flow/choices/-", value: { id: "c1", text: "A" } },
      { op: "add", path: "/scenes/1/flow/choices/-", value: { id: "c2", text: "B" } },
    ]);
    const next = applyJsonPatch(withChoices, [{ op: "remove", path: "/scenes/1/flow/choices/0" }]);
    expect(next.scenes[1]?.flow).toEqual({ kind: "choice", choices: [{ id: "c2", text: "B" }] });
  });

  it("非法路径抛 JsonPatchError 且不产生部分写入", () => {
    const doc = base();
    expect(() =>
      applyJsonPatch(doc, [
        { op: "replace", path: "/canvas/width", value: 1 },
        { op: "replace", path: "/canvas/nope", value: 2 },
      ]),
    ).toThrowError(JsonPatchError);
    expect(doc.canvas.width).toBe(1920);
  });

  it("test 操作在值不符时失败", () => {
    const doc = base();
    expect(() => applyJsonPatch(doc, [{ op: "test", path: "/canvas/width", value: 1 }])).toThrowError(
      JsonPatchError,
    );
    expect(applyJsonPatch(doc, [{ op: "test", path: "/canvas/width", value: 1920 }])).toEqual(doc);
  });

  it("invert 能还原 add/replace/remove", () => {
    const doc = base();
    const ops = [
      { op: "replace" as const, path: "/canvas/height", value: 720 },
      { op: "add" as const, path: "/scenes/-", value: { id: "s9", flow: { kind: "ending" } } },
      { op: "remove" as const, path: "/scenes/0" },
    ];
    const forward = applyJsonPatch(doc, ops);
    const back = applyJsonPatch(forward, invertJsonPatch(doc, ops));
    expect(back).toEqual(doc);
  });
});
