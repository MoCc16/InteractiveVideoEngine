/**
 * JSON Patch（RFC 6902）—— 编辑器唯一的写通道。
 *
 * 目标产品的保存模型：前端把每次编辑表达成 patch 操作数组，
 * 服务端按 revision 追加，撤销/重做/历史回滚都建立在这条序列上。
 * 因此 patch 的正确性是"业务模型不重写"的关键：DB 只存 doc + patch 日志。
 */
export type JsonPatchOp =
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: unknown }
  | { op: "move"; from: string; path: string }
  | { op: "copy"; from: string; path: string }
  | { op: "test"; path: string; value: unknown };

export class JsonPatchError extends Error {
  constructor(
    message: string,
    readonly opIndex: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "JsonPatchError";
  }
}

/** JSON Pointer 解析（RFC 6901），支持 ~0/~1 转义 */
export function parsePointer(pointer: string): string[] {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) throw new Error(`非法 JSON Pointer: ${pointer}`);
  return pointer
    .slice(1)
    .split("/")
    .map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
}

type Container = Record<string, unknown> | unknown[];

function isContainer(value: unknown): value is Container {
  return typeof value === "object" && value !== null;
}

function getParent(doc: unknown, tokens: string[], opIndex: number, path: string): Container {
  if (tokens.length === 0) throw new JsonPatchError("根路径不能被父级替换", opIndex, path);
  let cursor: unknown = doc;
  for (const token of tokens.slice(0, -1)) {
    if (!isContainer(cursor)) throw new JsonPatchError(`路径不存在: ${path}`, opIndex, path);
    cursor = Array.isArray(cursor) ? cursor[Number(token)] : (cursor as Record<string, unknown>)[token];
  }
  if (!isContainer(cursor)) throw new JsonPatchError(`父级不是对象/数组: ${path}`, opIndex, path);
  return cursor;
}

function getValue(doc: unknown, tokens: string[], opIndex: number, path: string): unknown {
  let cursor: unknown = doc;
  for (const token of tokens) {
    if (!isContainer(cursor)) throw new JsonPatchError(`路径不存在: ${path}`, opIndex, path);
    if (Array.isArray(cursor)) {
      const index = Number(token);
      if (!Number.isInteger(index) || index < 0 || index >= cursor.length) {
        throw new JsonPatchError(`数组下标越界: ${path}`, opIndex, path);
      }
      cursor = cursor[index];
    } else {
      if (!Object.prototype.hasOwnProperty.call(cursor, token)) {
        throw new JsonPatchError(`字段不存在: ${path}`, opIndex, path);
      }
      cursor = (cursor as Record<string, unknown>)[token];
    }
  }
  return cursor;
}

function setChild(parent: Container, key: string, value: unknown, opIndex: number, path: string, insert: boolean) {
  if (Array.isArray(parent)) {
    if (key === "-") {
      if (!insert) throw new JsonPatchError("数组删除需要具体下标", opIndex, path);
      parent.push(value);
      return;
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index > parent.length) {
      throw new JsonPatchError(`数组下标非法: ${path}`, opIndex, path);
    }
    if (insert) parent.splice(index, 0, value);
    else {
      if (index >= parent.length) throw new JsonPatchError(`替换目标不存在: ${path}`, opIndex, path);
      parent[index] = value;
    }
    return;
  }
  if (!insert && !Object.prototype.hasOwnProperty.call(parent, key)) {
    throw new JsonPatchError(`替换目标不存在: ${path}`, opIndex, path);
  }
  (parent as Record<string, unknown>)[key] = value;
}

function deleteChild(parent: Container, key: string, opIndex: number, path: string) {
  if (Array.isArray(parent)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
      throw new JsonPatchError(`数组下标越界: ${path}`, opIndex, path);
    }
    parent.splice(index, 1);
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(parent, key)) {
    throw new JsonPatchError(`字段不存在: ${path}`, opIndex, path);
  }
  delete (parent as Record<string, unknown>)[key];
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const arrB = b as unknown[];
    if (a.length !== arrB.length) return false;
    return a.every((item, i) => deepEqual(item, arrB[i]));
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  if (keysA.length !== Object.keys(objB).length) return false;
  return keysA.every((key) => deepEqual(objA[key], objB[key]));
}

/**
 * 应用 patch。输入不被修改；任一操作失败则抛错（调用方不得写入半成品）。
 */
export function applyJsonPatch<T>(input: T, ops: readonly JsonPatchOp[]): T {
  const doc = structuredClone(input) as unknown;
  ops.forEach((op, opIndex) => {
    const path = "path" in op ? op.path : "";
    const tokens = parsePointer(path);
    switch (op.op) {
      case "add": {
        if (tokens.length === 0) throw new JsonPatchError("暂不支持根替换", opIndex, path);
        const parent = getParent(doc, tokens, opIndex, path);
        setChild(parent, tokens[tokens.length - 1] as string, structuredClone(op.value), opIndex, path, true);
        return;
      }
      case "remove": {
        if (tokens.length === 0) throw new JsonPatchError("根路径不可删除", opIndex, path);
        const parent = getParent(doc, tokens, opIndex, path);
        deleteChild(parent, tokens[tokens.length - 1] as string, opIndex, path);
        return;
      }
      case "replace": {
        if (tokens.length === 0) throw new JsonPatchError("根替换请用整文档写入", opIndex, path);
        const parent = getParent(doc, tokens, opIndex, path);
        setChild(parent, tokens[tokens.length - 1] as string, structuredClone(op.value), opIndex, path, false);
        return;
      }
      case "move":
      case "copy": {
        const fromTokens = parsePointer(op.from);
        const value = structuredClone(getValue(doc, fromTokens, opIndex, op.from));
        if (op.op === "move") {
          const fromParent = getParent(doc, fromTokens, opIndex, op.from);
          deleteChild(fromParent, fromTokens[fromTokens.length - 1] as string, opIndex, op.from);
        }
        const parent = getParent(doc, tokens, opIndex, path);
        setChild(parent, tokens[tokens.length - 1] as string, value, opIndex, path, true);
        return;
      }
      case "test": {
        const actual = getValue(doc, tokens, opIndex, path);
        if (!deepEqual(actual, op.value)) throw new JsonPatchError(`test 失败: ${path}`, opIndex, path);
        return;
      }
      default: {
        const unknownOp = op as { op: string };
        throw new JsonPatchError(`不支持的操作: ${unknownOp.op}`, opIndex, path);
      }
    }
  });
  return doc as T;
}

/** 反向 patch（用于撤销栈）：覆盖 add/remove/replace；move/copy/test 由上层处理 */
export function invertJsonPatch<T>(input: T, ops: readonly JsonPatchOp[]): JsonPatchOp[] {
  const inverse: JsonPatchOp[] = [];
  let current: T = input;
  for (const op of ops) {
    if (op.op === "add") {
      const next = applyJsonPatch(current, [op]);
      const tokens = parsePointer(op.path);
      const last = tokens[tokens.length - 1];
      if (last === "-") {
        const parentTokens = tokens.slice(0, -1);
        const parent = getValue(next, parentTokens, 0, op.path) as unknown[];
        const concrete = [...parentTokens, String(parent.length - 1)]
          .map((token) => "/" + token.replace(/~/g, "~0").replace(/\//g, "~1"))
          .join("");
        inverse.unshift({ op: "remove", path: concrete });
      } else {
        inverse.unshift({ op: "remove", path: op.path });
      }
      current = next;
      continue;
    }
    if (op.op === "remove") {
      const value = getValue(current, parsePointer(op.path), 0, op.path);
      inverse.unshift({ op: "add", path: op.path, value });
      current = applyJsonPatch(current, [op]);
      continue;
    }
    if (op.op === "replace") {
      const value = getValue(current, parsePointer(op.path), 0, op.path);
      inverse.unshift({ op: "replace", path: op.path, value });
      current = applyJsonPatch(current, [op]);
      continue;
    }
    // move/copy/test 的反演交由调用方按业务语义处理
    current = applyJsonPatch(current, [op]);
  }
  return inverse;
}