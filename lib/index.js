/* GENERATED FILE — do not edit by hand; built from src/index.js by scripts/build.mjs */

// src/typert.js
import * as z from "zod/mini";

// src/error-codes.js
var ERROR_CODES = Object.freeze([
  "bad-request",
  "session-not-found",
  "agent-unavailable",
  "agent-busy",
  "message-not-found",
  "message-pending",
  "target-shadowed",
  "not-user-message",
  "not-last-reply",
  "blank-text",
  "no-text",
  "internal"
]);
function assertCode(code) {
  if (!ERROR_CODES.includes(code)) {
    throw new TypeError(`dsh-resend: ${JSON.stringify(code)} is not one of the ${ERROR_CODES.length} result codes (spec \xA74.5)`);
  }
}

// src/typert.js
var PACKAGE = "dsh-resend";
var SERVICE = "resend";
var NAMESPACE = "resend";
var METHOD = "apply";
var endpointOf = (descriptor) => `${descriptor.namespace}/${descriptor.method}`;
var ENDPOINT = endpointOf({ namespace: NAMESPACE, method: METHOD });
var INVOCATION_ID = `${PACKAGE}#${ENDPOINT}`;
var schemas = [];
var requestSchema;
function resendApplyRequestSchema() {
  return requestSchema ??= z.strictObject({
    sessionId: z.readonly(z.string()),
    targetSeq: z.readonly(z.number()),
    op: z.readonly(z.enum(["edit", "regenerate"])),
    text: z.optional(z.readonly(z.string()))
  });
}
var resultSchema;
function resendApplyResultSchema() {
  return resultSchema ??= z.union([
    z.strictObject({
      ok: z.readonly(z.literal(true)),
      value: z.readonly(z.strictObject({
        carrierSeq: z.readonly(z.number()),
        shadowedSeqs: z.readonly(z.array(z.number())),
        resendMessageId: z.optional(z.readonly(z.string()))
      }))
    }),
    z.strictObject({
      ok: z.readonly(z.literal(false)),
      error: z.readonly(z.union(ERROR_CODES.map((code) => z.strictObject({ code: z.readonly(z.literal(code)) }))))
    })
  ]);
}
var descriptors = [
  {
    id: INVOCATION_ID,
    service: SERVICE,
    namespace: NAMESPACE,
    method: METHOD,
    // Unary: `invocation.kind` is `direct`, and `mode`, `scope`, `cancellation`
    // and lookup parameters are all omitted — the registry allows `mode` only as
    // `'stream'`, so a unary method omits it entirely (spec §6.3 rule 6).
    invocation: { kind: "direct" },
    parameters: [
      {
        name: "request",
        wire: "request",
        source: "json",
        codec: {
          mode: "strict",
          // Nothing verifies this string beyond non-emptiness (this plugin has no
          // lookup or Context provider). It is still the only human-readable trace
          // when a strict definition and its provider disagree, so it names the
          // type this schema actually is.
          typeSymbol: `${PACKAGE}/types#ResendApplyRequest`,
          create: resendApplyRequestSchema
        }
      }
    ],
    result: {
      mode: "strict",
      typeSymbol: `${PACKAGE}/types#ResendApplyResult`,
      create: resendApplyResultSchema
    }
  }
];
function rollbackRequestSchema() {
  return z.strictObject({
    sessionId: z.string(),
    carrierSeq: z.number(),
    phase: z.enum(["preview", "execute", "cancel"]),
    planId: z.optional(z.string())
  });
}
function rollbackResultSchema() {
  return z.union([
    z.strictObject({ ok: z.literal(false), error: z.strictObject({
      code: z.string(),
      files: z.optional(z.array(z.strictObject({ path: z.string(), action: z.enum(["restored", "refuse"]), reason: z.optional(z.string()) })))
    }) }),
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      planId: z.string(),
      files: z.array(z.strictObject({ path: z.string(), action: z.enum(["restore", "refuse"]), reason: z.optional(z.string()) }))
    }) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/rollback`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "rollback",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#RollbackRequest`,
    create: rollbackRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#RollbackResult`, create: rollbackResultSchema }
});

// src/resend.js
import { Service } from "@deepseek-ai/cordis";
import { randomUUID as randomUUID2 } from "@deepseek-ai/dsh-util-crypto";
import { describeError as describeError2, hostService as hostService2, logWarning as logWarning2 } from "./host.js";
import { carrierIdFor, resendIdFor } from "./marker.js";
import { resolveTarget } from "./resolve.js";

// src/session-lock.js
var tails = /* @__PURE__ */ new Map();
function withSessionLock(sessionId, task) {
  const previous = tails.get(sessionId) ?? Promise.resolve();
  const run = previous.then(task);
  const tail = run.then(
    () => void 0,
    () => void 0
  );
  tails.set(sessionId, tail);
  void tail.then(() => {
    if (tails.get(sessionId) === tail) tails.delete(sessionId);
  });
  return run;
}

// src/resend.js
import { traceTextNow } from "./trace-text.js";
import { writeRewindPair } from "./write.js";

// src/file-versions.js
import { randomUUID } from "node:crypto";
import { lstat, mkdir as mkdir2, readFile as readFile2, rename, unlink, writeFile as writeFile2 } from "node:fs/promises";
import { homedir } from "node:os";
import path2 from "node:path";

// src/file-snapshots.js
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
function git(args, cwd, input) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, GIT_CONFIG_COUNT: "0", GIT_TERMINAL_PROMPT: "0" };
    for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_NAMESPACE"]) delete env[key];
    const child = spawn("git", args, {
      cwd,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env
    });
    const output = [];
    const errors = [];
    const timeout = setTimeout(() => child.kill("SIGKILL"), 3e4);
    child.stdout.on("data", (bytes) => output.push(bytes));
    child.stderr.on("data", (bytes) => errors.push(bytes));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, output: Buffer.concat(output), error: Buffer.concat(errors).toString("utf8") });
    });
    child.stdin.on("error", () => {
    });
    child.stdin.end(input);
  });
}
var digest = (value) => createHash("sha256").update(value).digest("hex");
function createSnapshotStore(home) {
  const gitDir = path.join(home, "objects.git");
  let initialized;
  const checked = async (args, cwd, input) => {
    const result = await git(args, cwd, input);
    if (result.code !== 0) throw new Error(result.error || `git exited ${result.code}`);
    return result.output;
  };
  return {
    async backend(cwd) {
      try {
        const result = await git(["rev-parse", "--is-inside-work-tree"], cwd);
        if (result.code === 0 && result.output.toString("utf8").trim() === "true") {
          initialized ??= mkdir(home, { recursive: true }).then(() => checked(["init", "--bare", "--quiet", gitDir], home));
          await initialized;
          return "git";
        }
        if (result.code !== 0 && !result.error.includes("not a git repository")) throw new Error(result.error);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      return "cas";
    },
    async put(bytes, backend) {
      if (bytes === null) return null;
      if (backend === "git") {
        const oid2 = (await checked([`--git-dir=${gitDir}`, "hash-object", "-w", "--stdin"], home, bytes)).toString("utf8").trim();
        return `git:${oid2}`;
      }
      const oid = digest(bytes);
      const directory = path.join(home, "objects");
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, oid), bytes, { flag: "wx", mode: 384 }).catch((error) => {
        if (error.code !== "EEXIST") throw error;
      });
      return `cas:${oid}`;
    },
    async get(ref) {
      if (ref === null) return null;
      if (/^git:[a-f0-9]{40,64}$/.test(ref)) return checked([`--git-dir=${gitDir}`, "cat-file", "blob", ref.slice(4)], home);
      if (/^cas:[a-f0-9]{64}$/.test(ref)) {
        const bytes = await readFile(path.join(home, "objects", ref.slice(4)));
        if (digest(bytes) !== ref.slice(4)) throw new Error("snapshot content does not match its address");
        return bytes;
      }
      throw new Error("invalid private content reference");
    }
  };
}

// src/file-versions.js
import { readCoveringLog, eventAtSeq } from "./log-read.js";
import { describeError, hostService, logWarning } from "./host.js";
import { hasMarkerPrefix } from "./marker.js";
var refused = (code) => ({ ok: false, error: { code } });
var equal = (a, b) => a === null || b === null ? a === b : a.equals(b);
var normalizedText = (bytes, keepBom = false) => bytes === null ? null : new TextDecoder("utf-8", { fatal: true, ignoreBOM: keepBom }).decode(bytes).replaceAll("\r\n", "\n");
function editorPostState(args, before) {
  if (args.command === "create") return before === null ? args.file_text : void 0;
  if (before === null) return void 0;
  if (args.command === "str_replace") {
    const old = args.old_str;
    if (typeof old !== "string" || old === "") return void 0;
    const offset = before.indexOf(old);
    if (offset < 0 || before.indexOf(old, offset + old.length) >= 0) return void 0;
    return before.slice(0, offset) + (args.new_str ?? "") + before.slice(offset + old.length);
  }
  if (args.command === "insert") {
    const lines = before.split("\n");
    const index = args.insert_line;
    if (!Number.isInteger(index) || index < 0 || index > lines.length || typeof args.new_str !== "string") return void 0;
    return [...lines.slice(0, index), ...args.new_str.split("\n"), ...lines.slice(index)].join("\n");
  }
}
function mutationPath(name2, args) {
  if (name2 === "write" || name2 === "edit") return args?.file_path;
  if (name2 === "str_replace_editor" && ["create", "str_replace", "insert"].includes(args?.command)) return args.path;
}
async function fileTarget(cwd, name2) {
  if (typeof cwd !== "string" || !path2.isAbsolute(cwd) || typeof name2 !== "string" || name2 === "") throw new Error("unsafe-path");
  const absolute = path2.resolve(cwd, name2);
  const relative = path2.relative(cwd, absolute);
  const parts = relative.split(path2.sep);
  if (relative === "" || relative.startsWith(`..${path2.sep}`) || relative === ".." || path2.isAbsolute(relative) || parts.some((part) => part.toLowerCase() === ".git")) throw new Error("unsafe-path");
  let current = path2.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path2.sep)) {
    current = path2.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error("unsafe-path");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return absolute;
}
async function contents(cwd, name2) {
  const absolute = await fileTarget(cwd, name2);
  try {
    if (!(await lstat(absolute)).isFile()) throw new Error("not-regular-file");
    return await readFile2(absolute);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
function createFileVersions(ctx) {
  const home = path2.join(path2.resolve(process.env.DSH_HOME?.trim() || path2.join(homedir(), ".dsh")), "plugins", "dsh-resend");
  const snapshots = createSnapshotStore(home);
  const observations = /* @__PURE__ */ new Map();
  const plans = /* @__PURE__ */ new Map();
  const recordPath = (sessionId, id) => path2.join(home, "records", `${digest(JSON.stringify([sessionId, id]))}.json`);
  const observationKey = (sessionId, callId) => JSON.stringify([sessionId, callId]);
  ctx.on("tools/execute", async (exec, next) => {
    const session = exec.agent?.session;
    const name2 = mutationPath(exec.name, exec.arguments);
    if (session === void 0 || name2 === void 0) return next();
    const cwd = session.header.cwd;
    let before;
    let reason;
    let normalized = name2;
    try {
      normalized = path2.relative(cwd, await fileTarget(cwd, name2)).split(path2.sep).join("/");
      before = await contents(cwd, normalized);
    } catch (error) {
      reason = error.message === "unsafe-path" ? "unsafe-path" : "unreadable-file";
    }
    const result = await next();
    let after;
    try {
      after = await contents(cwd, normalized);
      if (result.isError && reason === void 0 && !equal(before, after)) reason = "write-outcome-unavailable";
      if (!result.isError && reason === void 0) {
        const prior = normalizedText(before);
        const post = normalizedText(after, true);
        if (exec.name === "str_replace_editor") {
          const rawPrior = before === null ? null : new TextDecoder("utf-8", { fatal: true }).decode(before);
          const expected = editorPostState(exec.arguments, rawPrior);
          if (typeof expected !== "string" || post !== expected.replaceAll("\r\n", "\n")) reason = "content-diverged";
        } else {
          const value = result.value;
          if (!Object.hasOwn(value ?? {}, "before") || typeof value.after !== "string") reason = "prior-state-unavailable";
          else if (prior !== value.before || post !== value.after.replaceAll("\r\n", "\n")) reason = "content-diverged";
        }
      }
    } catch {
      reason ??= "unreadable-file";
    }
    observations.set(observationKey(session.id, exec.callId), { path: normalized, before, after, reason });
    return result;
  });
  ctx.on("session/disposed", (session) => {
    for (const key of observations.keys()) if (JSON.parse(key)[0] === session.id) observations.delete(key);
    for (const [key, plan] of plans) if (plan.sessionId === session.id) plans.delete(key);
  });
  ctx.effect(() => () => {
    observations.clear();
    plans.clear();
  });
  async function prepare(session, plan, carrierId) {
    const covering = await readCoveringLog(ctx, session.id);
    if (covering.status !== "ok") throw new Error(covering.detail);
    const files = /* @__PURE__ */ new Map();
    const shadowed = new Set(plan.shadowedSeqs);
    const results = new Map(covering.log.filter((event) => event.type === "tool/result").map((event) => [event.data.message.callId, event]));
    for (const seq of shadowed) if (eventAtSeq(covering.log, seq) === void 0) throw new Error(`file version read does not cover seq ${seq}`);
    for (const event of covering.log) {
      if (event.type !== "tool/call" && event.type !== "tool/ptc-dispatch") continue;
      const callId = event.type === "tool/call" ? event.data.callId : event.data.subCallId;
      const rootCallId = event.type === "tool/call" ? callId : event.data.rootCallId;
      let args;
      try {
        args = event.type === "tool/call" ? JSON.parse(event.data.arguments) : event.data.arguments;
      } catch {
        continue;
      }
      const name2 = mutationPath(event.data.name, args);
      if (name2 === void 0) continue;
      const result = results.get(rootCallId);
      if (result === void 0 || !shadowed.has(result.seq)) continue;
      const observed = observations.get(observationKey(session.id, callId));
      const change = observed ?? { path: name2, reason: "prior-state-unavailable" };
      if (observed !== void 0 && observed.reason === void 0 && equal(observed.before, observed.after)) continue;
      const previous = files.get(change.path);
      if (previous === void 0) files.set(change.path, { ...change });
      else {
        if (previous.reason === void 0 && change.reason === void 0 && !equal(previous.after, change.before)) previous.reason = "diverged-between-writes";
        previous.reason ??= change.reason;
        previous.after = change.after;
      }
    }
    const backend = [...files.values()].some((file) => file.reason === void 0) ? await snapshots.backend(session.header.cwd) : "cas";
    const records = [];
    for (const file of files.values()) {
      if (file.reason !== void 0) records.push({ path: file.path, reason: file.reason });
      else records.push({ path: file.path, before: await snapshots.put(file.before, backend), after: await snapshots.put(file.after, backend) });
    }
    const target = recordPath(session.id, carrierId);
    await mkdir2(path2.dirname(target), { recursive: true });
    const staging = `${target}.${randomUUID()}.pending`;
    await writeFile2(staging, JSON.stringify(records), { flag: "wx", mode: 384 });
    await rename(staging, target);
    return {
      async discardUnlessWritten() {
        const read = await readCoveringLog(ctx, session.id);
        if (read.status === "ok" && !read.log.some((event) => event.type === "user/message" && event.data.id === carrierId)) await unlink(target);
      }
    };
  }
  async function rollback(request) {
    const { sessionId, carrierSeq, phase, planId } = request;
    if (typeof sessionId !== "string" || sessionId === "" || !Number.isSafeInteger(carrierSeq) || carrierSeq < 0) return refused("bad-request");
    const session = hostService(ctx, "sessions")?.get(sessionId);
    if (session === void 0) return refused("session-not-found");
    const agent = hostService(ctx, "agents")?.get(sessionId);
    if (agent?.status !== "idle") return refused("agent-busy");
    const covering = await readCoveringLog(ctx, sessionId);
    if (covering.status !== "ok") return refused("internal");
    const carrier = eventAtSeq(covering.log, carrierSeq);
    if (carrier?.type !== "user/message" || !hasMarkerPrefix(carrier.data?.id) || carrier.surfaceOp?.op !== "replace") return refused("no-target-state");
    if (phase !== "preview") {
      const plan = plans.get(planId);
      if (plan === void 0 || plan.sessionId !== sessionId || plan.carrierSeq !== carrierSeq) return refused("plan-not-found");
      plans.delete(planId);
      if (phase === "cancel") return { ok: true, value: plan.preview };
      if (phase !== "execute") return refused("bad-request");
      for (const file of plan.files) {
        if (file.action === "refuse") continue;
        try {
          if (!equal(await contents(session.header.cwd, file.path), file.after)) return refused("preview-stale");
        } catch {
          return refused("preview-stale");
        }
      }
      const processed = [];
      for (const file of plan.files) {
        if (file.action === "refuse") continue;
        try {
          const absolute = await fileTarget(session.header.cwd, file.path);
          if (!equal(await contents(session.header.cwd, file.path), file.after)) throw new Error("content-diverged");
          if (file.before === null) await unlink(absolute);
          else await writeFile2(absolute, file.before);
          processed.push(file.path);
        } catch (error) {
          const reason = error.message === "content-diverged" || error.message === "unsafe-path" ? error.message : "restore-failed";
          return { ok: false, error: { code: "execution-stopped", files: plan.files.map((entry) => processed.includes(entry.path) ? { path: entry.path, action: "restored" } : { path: entry.path, action: "refuse", reason: entry.reason ?? (entry.path === file.path ? reason : "execution-stopped") }) } };
        }
      }
      return { ok: true, value: plan.preview };
    }
    let record;
    try {
      record = JSON.parse(await readFile2(recordPath(sessionId, carrier.data.id), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return refused("no-target-state");
      throw error;
    }
    const files = [];
    for (const file of record) {
      let reason = file.reason;
      let before;
      let after;
      if (reason === void 0) {
        try {
          before = await snapshots.get(file.before);
          after = await snapshots.get(file.after);
          if (!equal(await contents(session.header.cwd, file.path), after)) reason = "content-diverged";
        } catch (error) {
          reason = error.message === "unsafe-path" ? "unsafe-path" : "snapshot-unavailable";
        }
      }
      files.push({ path: file.path, action: reason === void 0 ? "restore" : "refuse", ...reason === void 0 ? { before, after } : { reason } });
    }
    for (const [id2, plan] of plans) if (plan.sessionId === sessionId && plan.carrierSeq === carrierSeq) plans.delete(id2);
    const id = randomUUID();
    const preview = { planId: id, files: files.map(({ path: path3, action, reason }) => ({ path: path3, action, ...reason === void 0 ? {} : { reason } })) };
    plans.set(id, { sessionId, carrierSeq, files, preview });
    return { ok: true, value: preview };
  }
  return {
    prepare,
    async rollback(request) {
      try {
        return await rollback(request);
      } catch (error) {
        logWarning(ctx, `file rollback failed: ${describeError(error)}`);
        return refused("internal");
      }
    }
  };
}

// src/resend.js
var fileVersions = /* @__PURE__ */ new WeakMap();
var FIBER_ACTIVE = 2;
function failure(code) {
  assertCode(code);
  return Object.freeze({ ok: false, error: Object.freeze({ code }) });
}
function guarded(read) {
  try {
    return { value: read() };
  } catch (error) {
    return { code: "internal", detail: describeError2(error) };
  }
}
function handOffPrompt(ctx, { agent, sessionId, resendMessageId, text }) {
  try {
    agent.followup({ role: "user", id: resendMessageId, content: [{ type: "text", text }], source: { kind: "user" } });
    if (agent.status === "running") return true;
    logWarning2(
      ctx,
      `the rewind of ${JSON.stringify(sessionId)} stands, but the agent did not take the prompt (status ${JSON.stringify(agent.status)}): the re-send is owed and the client offers it (spec \xA79.4)`
    );
  } catch (error) {
    logWarning2(ctx, `the re-send for ${JSON.stringify(sessionId)} could not be handed to the agent: ${describeError2(error)}`);
  }
  return false;
}
function rewindResult({ carrierSeq, shadowedSeqs, resendMessageId }) {
  const value = resendMessageId === void 0 ? { carrierSeq, shadowedSeqs } : { carrierSeq, shadowedSeqs, resendMessageId };
  return Object.freeze({ ok: true, value: Object.freeze(value) });
}
async function rewind(ctx, { session, agent, sessions, sessionId, request }) {
  try {
    const { op } = request;
    const surfaceRead = guarded(() => session.surface.nodes);
    if (surfaceRead.code !== void 0) {
      logWarning2(ctx, `resend.apply could not read the live surface of ${JSON.stringify(sessionId)}: ${surfaceRead.detail}`);
      return failure(surfaceRead.code);
    }
    const resolution = await resolveTarget(ctx, request, surfaceRead.value);
    if (!resolution.ok) {
      if (resolution.error.code === "internal") {
        logWarning2(ctx, `resend.apply could not resolve the request: ${resolution.error.detail ?? "no detail"}`);
      }
      return failure(resolution.error.code);
    }
    const plan = resolution.value;
    if (plan.kind === "resend-only") {
      if (agent.status !== "idle") {
        logWarning2(ctx, `the re-send for ${JSON.stringify(sessionId)} was asked for while a turn was open on it (spec \xA74.4 rule 4)`);
        return failure("agent-busy");
      }
      const taken2 = handOffPrompt(ctx, { agent, sessionId, resendMessageId: plan.resendMessageId, text: plan.resendText });
      return rewindResult({
        carrierSeq: plan.carrierSeq,
        shadowedSeqs: plan.shadowedSeqs,
        resendMessageId: taken2 ? plan.resendMessageId : void 0
      });
    }
    if (agent.status !== "idle") {
      agent.cancel?.({ kind: "user" });
      await agent.whenIdle?.();
      if (agent.status !== "idle") {
        logWarning2(ctx, `resend.apply found a turn open on ${JSON.stringify(sessionId)} at the write boundary and it did not reach idle`);
        return failure("agent-busy");
      }
    }
    const carrierId = carrierIdFor(op, randomUUID2());
    const resendMessageId = resendIdFor(carrierId);
    const versions = await fileVersions.get(ctx).prepare(session, plan, carrierId);
    let write;
    try {
      write = await writeRewindPair(ctx, {
        sessions,
        session,
        sessionId,
        plan,
        carrierId,
        traceText: traceTextNow(ctx)
      });
    } catch (error) {
      await versions.discardUnlessWritten();
      throw error;
    }
    if (!write.ok) {
      await versions.discardUnlessWritten();
      if (write.error.code === "internal") {
        logWarning2(ctx, `resend.apply could not write the rewind pair for ${JSON.stringify(sessionId)}: ${write.error.detail ?? "no detail"}`);
      }
      return failure(write.error.code);
    }
    const taken = handOffPrompt(ctx, { agent, sessionId, resendMessageId, text: plan.resendText });
    return rewindResult({
      carrierSeq: write.value.carrierSeq,
      shadowedSeqs: write.value.shadowedSeqs,
      resendMessageId: taken ? resendMessageId : void 0
    });
  } catch (error) {
    logWarning2(ctx, `resend.apply failed unexpectedly while rewinding ${JSON.stringify(sessionId)}: ${describeError2(error)}`);
    return failure("internal");
  }
}
var ResendService = class extends Service {
  /**
   * @param ctx - the context this row was activated with. Captured rather than
   *   read back later: `ctx` is a property Cordis TRACES, so a read of it inside
   *   a method resolves to the CALLER's context, not this row's — and the
   *   caller's fiber is the root fiber, which is ACTIVE forever. §4.4 step 1 is
   *   only observable through the row's own fiber, and service resolution is
   *   only honest through the context the plugin was loaded with.
   */
  constructor(ctx) {
    super(ctx, SERVICE);
    this.hostCtx = ctx;
    this.ownerFiber = ctx.fiber;
    fileVersions.set(ctx, createFileVersions(ctx));
    this.typertRemote = Object.freeze({ service: this, serviceKey: SERVICE, namespace: NAMESPACE });
  }
  /**
   * One edit-and-resend or regenerate: rewind the range, then resend the prompt
   * — or, when the rewind already landed and its prompt never reached the agent,
   * only the resend (spec §5.5, §9.4).
   *
   * Every diagnosable line for an unexpected fault goes through `logWarning`
   * (spec §11, §12); every business refusal is legible to the user as one of the
   * closed codes and is never logged.
   * @param request - `ResendApplyRequest`, already boundary-validated by the
   *   Gateway through this descriptor's strict codec (spec §6.3 rule 5).
   * @returns `RemoteResult<ResendApplyResult>`; never a rejection for a business
   *   outcome (spec §4.5).
   */
  async apply(request) {
    const ctx = this.hostCtx;
    const fiber = this.ownerFiber;
    if (fiber !== void 0 && fiber.state !== FIBER_ACTIVE) return failure("internal");
    const sessionId = request?.sessionId;
    const targetSeq = request?.targetSeq;
    const op = request?.op;
    if (typeof sessionId !== "string" || sessionId === "") return failure("bad-request");
    if (op !== "edit" && op !== "regenerate") return failure("bad-request");
    if (op === "edit" && typeof request.text !== "string") return failure("bad-request");
    if (!Number.isSafeInteger(targetSeq) || targetSeq < 0) return failure("bad-request");
    const sessions = hostService2(ctx, "sessions");
    if (sessions === void 0) return failure("internal");
    const sessionRead = guarded(() => sessions.get(sessionId));
    if (sessionRead.code !== void 0) {
      logWarning2(ctx, `resend.apply could not read sessions.get(${JSON.stringify(sessionId)}): ${sessionRead.detail}`);
      return failure(sessionRead.code);
    }
    const session = sessionRead.value;
    if (session === void 0) return failure("session-not-found");
    const agents = hostService2(ctx, "agents");
    if (agents === void 0) return failure("internal");
    const agentRead = guarded(() => agents.get(sessionId));
    if (agentRead.code !== void 0) {
      logWarning2(ctx, `resend.apply could not read agents.get(${JSON.stringify(sessionId)}): ${agentRead.detail}`);
      return failure(agentRead.code);
    }
    const agent = agentRead.value;
    if (agent === void 0) return failure("agent-unavailable");
    if (agent.status !== "idle") return failure("agent-busy");
    return withSessionLock(sessionId, () => rewind(ctx, { session, agent, sessions, sessionId, request }));
  }
  async rollback(request) {
    if (this.ownerFiber !== void 0 && this.ownerFiber.state !== FIBER_ACTIVE) return failure("internal");
    return withSessionLock(request.sessionId, () => fileVersions.get(this.hostCtx).rollback(request));
  }
};

// src/typert.host.js
var TYPERT = {
  package: PACKAGE,
  face: "host",
  schemas,
  invocations: descriptors
};

// src/index.js
var name = "dsh-resend";
var inject = ["sessions", "agents", "sessionQuery", "sessionPersistence", "tokenMeter", "typert"];
function apply(ctx) {
  new ResendService(ctx);
  ctx.typert.register(TYPERT);
  const endpoints = ctx.typert.local.list().filter((descriptor) => descriptor.service === SERVICE).map(endpointOf);
  ctx.root.logger?.("dsh-resend")?.info(
    `dsh-resend host half loaded \u2014 Remote endpoints registered: ${endpoints.join(", ") || "none"}. ${ENDPOINT} resolves its target, its range and its resend text from a covering log read, then writes the rewind as one pair \u2014 the audit claim (compaction/prune) and its carrier (user/message) \u2014 validated together before either append and flushed once. The resend itself is ticket 05.`
  );
}
export {
  apply,
  inject,
  name
};
