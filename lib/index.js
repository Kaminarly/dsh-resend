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
  "not-last-user-message",
  "not-assistant-message",
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
    phase: z.enum(["status", "preview", "execute", "cancel"]),
    scope: z.optional(z.literal("artifacts")),
    planId: z.optional(z.string()),
    // The confirmed restore subset (spec §10): omitted keeps the legacy
    // full-restore behavior; an explicit set is validated by the business layer
    // against the plan it addresses, so the codec only carries its shape.
    selected: z.optional(z.array(z.string()))
  });
}
function rollbackResultSchema() {
  return z.union([
    z.strictObject({ ok: z.literal(false), error: z.strictObject({
      code: z.string(),
      files: z.optional(z.array(z.strictObject({ path: z.string(), action: z.enum(["restored", "refuse", "kept"]), reason: z.optional(z.string()) })))
    }) }),
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      planId: z.string(),
      scope: z.optional(z.literal("artifacts")),
      completed: z.optional(z.boolean()),
      empty: z.optional(z.boolean()),
      // Only a preview answer carries it: the selection identity recorded by an
      // interrupted run, so a re-check does not default back to "everything".
      selected: z.optional(z.array(z.string())),
      // 'kept' is the user's own choice to keep a file; 'refuse' with a reason
      // is the system being unable to restore it. The two are never conflated.
      files: rollbackFileListSchema()
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
function conversationRequestSchema() {
  return z.strictObject({ sessionId: z.readonly(z.string()) });
}
function conversationResultSchema() {
  return z.union([
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      assistantSeqs: z.array(z.number()),
      lastReplySeq: z.optional(z.number()),
      userSeqs: z.array(z.number()),
      lastUserSeq: z.optional(z.number())
    }) }),
    z.strictObject({ ok: z.literal(false), error: z.union(ERROR_CODES.map((code) => z.strictObject({ code: z.literal(code) }))) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/conversation`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "conversation",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#ConversationRequest`,
    create: conversationRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#ConversationResult`, create: conversationResultSchema }
});
function cleanupRequestSchema() {
  return z.strictObject({
    phase: z.enum(["list", "preview", "execute", "cancel"]),
    mode: z.enum(["residue", "sessions"]),
    sessionIds: z.optional(z.array(z.string())),
    planId: z.optional(z.string())
  });
}
function cleanupResultSchema() {
  const session = z.strictObject({
    sessionId: z.string(),
    title: z.string(),
    projectPath: z.string(),
    records: z.number(),
    bytes: z.number(),
    noSnapshots: z.boolean()
  });
  return z.union([
    z.strictObject({ ok: z.literal(false), error: z.strictObject({ code: z.string() }) }),
    z.strictObject({ ok: z.literal(true), value: z.union([
      z.strictObject({ phase: z.literal("list"), sessions: z.array(session), unreadableSessions: z.number() }),
      z.strictObject({ phase: z.literal("cancel") }),
      z.strictObject({
        phase: z.literal("preview"),
        planId: z.string(),
        sessions: z.array(session),
        categories: z.array(z.strictObject({ kind: z.enum(["records", "outcomes", "objects", "temporary"]), count: z.number(), bytes: z.number() })),
        estimatedBytes: z.number(),
        itemCount: z.number(),
        protectedObjects: z.boolean(),
        unreadableSessions: z.number()
      }),
      z.strictObject({
        phase: z.literal("execute"),
        releasedBytes: z.number(),
        results: z.array(z.strictObject({ sessionId: z.string(), title: z.string(), status: z.enum(["cleaned", "skipped", "failed"]), reason: z.string(), bytes: z.number() })),
        failures: z.array(z.strictObject({ item: z.string(), reason: z.string() })),
        changedCount: z.number(),
        protectedObjects: z.boolean()
      })
    ]) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/cleanup`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "cleanup",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#CleanupRequest`,
    create: cleanupRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#CleanupResult`, create: cleanupResultSchema }
});
function replayRequestSchema() {
  return z.union([
    z.strictObject({ phase: z.literal("start"), request: resendApplyRequestSchema() }),
    z.strictObject({
      phase: z.enum(["preview", "restore", "keep", "cancel"]),
      sessionId: z.string(),
      preflightId: z.string(),
      // The confirmed restore subset for `restore` (spec §10): the business layer
      // validates it against the plan before anything is consumed.
      selected: z.optional(z.array(z.string()))
    })
  ]);
}
function replayResultSchema() {
  return z.union([
    resendApplyResultSchema(),
    rollbackResultSchema(),
    z.strictObject({ ok: z.literal(true), value: z.strictObject({ canceled: z.literal(true) }) }),
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      preflight: z.literal(true),
      preflightId: z.string(),
      userSeq: z.number(),
      op: z.enum(["edit", "regenerate"]),
      planId: z.string(),
      completed: z.optional(z.boolean()),
      scope: z.optional(z.literal("artifacts")),
      // The same real per-member outcomes the history entry reports (spec §9),
      // and the selection identity an interrupted run recorded (spec §8).
      selected: z.optional(z.array(z.string())),
      files: rollbackFileListSchema()
    }) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/replay`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "replay",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#ReplayRequest`,
    create: replayRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#ReplayResult`, create: replayResultSchema }
});
function rollbackFileListSchema() {
  return z.array(z.strictObject({
    path: z.string(),
    action: z.enum(["restore", "refuse", "kept", "restored"]),
    reason: z.optional(z.string()),
    operation: z.optional(z.literal("delete"))
  }));
}
function contentRequestSchema() {
  const member = { sessionId: z.string(), planId: z.string(), path: z.string() };
  return z.union([
    z.strictObject({ ...member, source: z.literal("history"), carrierSeq: z.number() }),
    z.strictObject({ ...member, source: z.literal("preflight"), preflightId: z.string() })
  ]);
}
function contentResultSchema() {
  const sizes = z.strictObject({ current: z.number(), target: z.number() });
  const action = z.enum(["delete", "create", "empty", "restore"]);
  const version = z.strictObject({
    exists: z.boolean(),
    bytes: z.number(),
    lines: z.number(),
    bom: z.boolean(),
    eol: z.enum(["none", "lf", "crlf", "cr", "mixed"]),
    finalNewline: z.boolean()
  });
  return z.union([
    z.strictObject({ ok: z.literal(false), error: z.strictObject({ code: z.string() }) }),
    z.strictObject({ ok: z.literal(true), value: z.union([
      z.strictObject({ status: z.literal("unavailable"), reason: z.enum(["too-large", "too-many-lines", "line-too-long", "non-text", "computation-limited"]), sizes, action }),
      z.strictObject({
        status: z.literal("ready"),
        sizes,
        action,
        current: version,
        target: version,
        rows: z.array(z.strictObject({ kind: z.enum(["context", "delete", "add"]), text: z.string(), oldLine: z.optional(z.number()), newLine: z.optional(z.number()) }))
      })
    ]) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/content`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "content",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#ContentRequest`,
    create: contentRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#ContentResult`, create: contentResultSchema }
});

// src/resend.js
import { Service } from "@deepseek-ai/cordis";
import { randomUUID as randomUUID7 } from "@deepseek-ai/dsh-util-crypto";
import { describeError as describeError4, hostService as hostService5, logWarning as logWarning4 } from "./host.js";
import { carrierIdFor, resendIdFor } from "./marker.js";
import { editPromptDigest, effectiveConversationEligibility, resolveTarget } from "./resolve.js";

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
import { randomUUID as randomUUID6 } from "node:crypto";
import { mkdir as mkdir4, readFile as readFile4, readdir, rename as rename4, unlink as unlink4, writeFile as writeFile2 } from "node:fs/promises";
import path7 from "node:path";

// src/file-snapshots.js
import { spawn } from "node:child_process";
import { createHash as createHash2 } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path2 from "node:path";

// src/private-storage.js
import { createHash, randomUUID } from "node:crypto";
import { existsSync, linkSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { hostService } from "./host.js";
var digest = (value) => createHash("sha256").update(value).digest("hex");
function privateHome() {
  return path.join(path.resolve(process.env.DSH_HOME?.trim() || path.join(homedir(), ".dsh")), "plugins", "dsh-resend");
}
function safePrivatePath(home, relative = "") {
  const target = path.resolve(home, relative);
  const inside = path.relative(home, target);
  if (inside === ".." || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) throw new Error("unsafe-storage");
  let current = path.parse(target).root;
  for (const part of target.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error("unsafe-storage");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return target;
}
var alive = (pid) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("invalid-coordination");
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    return true;
  }
};
var pause = () => new Promise((resolve) => setTimeout(resolve, 15));
function createPrivateStorage(ctx, home = privateHome()) {
  const owner = `${process.pid}-${randomUUID()}`;
  const active = /* @__PURE__ */ new Map();
  const agents = /* @__PURE__ */ new Map();
  let disposed = false;
  const dir = () => {
    const target = safePrivatePath(home, "coordination");
    mkdirSync(target, { recursive: true });
    safePrivatePath(home, "coordination");
    return target;
  };
  const publish = () => {
    if (disposed) return;
    const target = path.join(dir(), `${owner}.json`);
    const staging = safePrivatePath(home, `coordination/${owner}.pending`);
    const sessions = Object.fromEntries([...agents].filter(([, status]) => status !== "idle").map(([id]) => [id, "generating"]));
    for (const [id, entries] of active) sessions[id] = [...entries.values()][0];
    writeFileSync(staging, JSON.stringify({ pid: process.pid, sessions }), { flag: "w", mode: 384 });
    renameSync(staging, safePrivatePath(home, `coordination/${owner}.json`));
  };
  const updateAgent = (agent, status = agent?.status) => {
    const id = agent?.session?.id ?? agent?.id;
    if (typeof id !== "string") return;
    agents.set(id, status);
    publish();
  };
  ctx.on("agent/created", ({ agent }) => updateAgent(agent));
  ctx.on("agent/status", ({ agent, status }) => updateAgent(agent, status));
  ctx.on("agent/disposed", ({ agent }) => {
    agents.delete(agent.session?.id ?? agent.id);
    publish();
  });
  for (const agent of hostService(ctx, "agents")?.list?.() ?? []) updateAgent(agent);
  ctx.effect(() => () => {
    disposed = true;
    if (active.size === 0) {
      try {
        unlinkSync(safePrivatePath(home, `coordination/${owner}.json`));
      } catch {
      }
    }
  });
  async function exclusive(task, name2 = "storage.lock") {
    const lock = path.join(dir(), name2);
    const recovery = safePrivatePath(home, `coordination/${name2}.recovery`);
    const candidate = safePrivatePath(home, `coordination/${name2}.${randomUUID()}.pending`);
    writeFileSync(candidate, JSON.stringify({ pid: process.pid, owner }), { flag: "wx", mode: 384 });
    const readOwner = () => {
      const legacy = lstatSync(lock).isDirectory();
      try {
        const saved = JSON.parse(readFileSync(safePrivatePath(home, `coordination/${name2}${legacy ? "/owner.json" : ""}`), "utf8"));
        if (!Number.isSafeInteger(saved?.pid) || saved.pid <= 0 || typeof saved?.owner !== "string") throw new Error("invalid-coordination");
        return { saved, legacy };
      } catch (error) {
        if (error instanceof SyntaxError || error.code === "ENOENT" || error.message === "invalid-coordination") throw new Error("storage-recovery-required");
        throw error;
      }
    };
    const started = Date.now();
    try {
      while (true) {
        safePrivatePath(home, `coordination/${name2}`);
        if (existsSync(recovery)) {
          if (lstatSync(recovery).isDirectory()) throw new Error("storage-recovery-required");
          let saved;
          try {
            saved = JSON.parse(readFileSync(recovery, "utf8"));
          } catch (error) {
            if (error.code === "ENOENT") continue;
            throw new Error("storage-recovery-required");
          }
          if (!Number.isSafeInteger(saved?.pid) || saved.pid <= 0 || !alive(saved.pid)) throw new Error("storage-recovery-required");
        }
        if (!existsSync(recovery)) {
          try {
            linkSync(candidate, lock);
            break;
          } catch (error) {
            if (error.code !== "EEXIST") throw error;
            try {
              linkSync(candidate, recovery);
              try {
                const { saved, legacy } = readOwner();
                if (!alive(saved.pid)) {
                  if (legacy) {
                    unlinkSync(path.join(lock, "owner.json"));
                    rmdirSync(lock);
                  } else unlinkSync(lock);
                }
              } finally {
                unlinkSync(recovery);
              }
            } catch (error2) {
              if (!(error2 instanceof SyntaxError) && !["ENOENT", "EEXIST"].includes(error2.code)) throw error2;
            }
          }
        }
        if (Date.now() - started > 1e4) throw new Error("storage-busy");
        await pause();
      }
      try {
        return await task();
      } finally {
        unlinkSync(safePrivatePath(home, `coordination/${name2}`));
      }
    } finally {
      try {
        unlinkSync(candidate);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
  async function activity(sessionId, reason, task) {
    if (disposed) throw new Error("storage-disposed");
    const token = randomUUID();
    const entries = active.get(sessionId) ?? /* @__PURE__ */ new Map();
    entries.set(token, reason);
    active.set(sessionId, entries);
    publish();
    try {
      return await task();
    } finally {
      entries.delete(token);
      if (entries.size === 0) active.delete(sessionId);
      const agent = hostService(ctx, "agents")?.get(sessionId);
      if (agent) agents.set(sessionId, agent.status);
      if (!disposed) publish();
      else if (active.size === 0) {
        try {
          unlinkSync(safePrivatePath(home, `coordination/${owner}.json`));
        } catch {
        }
      }
    }
  }
  return {
    home,
    exclusive,
    activity,
    // Publish before the barrier. Cleanup either observes and skips this
    // session, or finishes and invalidates it before the operation can read.
    // A long file restore never blocks cleanup of unrelated conversations.
    operation: (sessionId, reason, task) => activity(sessionId, reason, () => exclusive(async () => {
      await exclusive(() => {
      });
      return task();
    }, `session-${digest(sessionId)}.lock`)),
    busy(sessionId) {
      try {
        const local = hostService(ctx, "agents")?.get(sessionId);
        if (local && local.status !== "idle") return "generating";
        for (const name2 of readdirSync(dir())) {
          if (!/^\d+-[a-f0-9-]+\.json$/.test(name2)) continue;
          let entry;
          try {
            entry = JSON.parse(readFileSync(safePrivatePath(home, `coordination/${name2}`), "utf8"));
          } catch (error) {
            if (error.code === "ENOENT") continue;
            throw error;
          }
          if (alive(entry.pid) && entry.sessions[sessionId]) return entry.sessions[sessionId];
        }
      } catch {
        return "coordination-unavailable";
      }
    },
    generation(sessionId) {
      try {
        return readFileSync(safePrivatePath(home, `generations/${digest(sessionId)}`), "utf8");
      } catch (error) {
        if (error.code === "ENOENT") return "";
        throw error;
      }
    },
    invalidate(sessionId) {
      const directory = safePrivatePath(home, "generations");
      mkdirSync(directory, { recursive: true });
      const target = safePrivatePath(home, `generations/${digest(sessionId)}`);
      const staging = `${target}.${randomUUID()}.pending`;
      writeFileSync(staging, randomUUID(), { flag: "wx", mode: 384 });
      renameSync(staging, target);
    }
  };
}

// src/file-snapshots.js
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
var digest2 = (value) => createHash2("sha256").update(value).digest("hex");
function createSnapshotStore(home) {
  const gitDir = path2.join(home, "objects.git");
  let initialized;
  const checked = async (args, cwd, input) => {
    const result = await git(args, cwd, input);
    if (result.code !== 0) throw new Error(result.error || `git exited ${result.code}`);
    return result.output;
  };
  return {
    async backend(cwd) {
      safePrivatePath(home, "objects.git/objects");
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
      safePrivatePath(home, backend === "git" ? "objects.git/objects" : "objects");
      if (bytes === null) return null;
      if (backend === "git") {
        const oid2 = (await checked([`--git-dir=${gitDir}`, "hash-object", "-w", "--stdin"], home, bytes)).toString("utf8").trim();
        return `git:${oid2}`;
      }
      const oid = digest2(bytes);
      const directory = path2.join(home, "objects");
      await mkdir(directory, { recursive: true });
      await writeFile(safePrivatePath(home, `objects/${oid}`), bytes, { flag: "wx", mode: 384 }).catch((error) => {
        if (error.code !== "EEXIST") throw error;
      });
      return `cas:${oid}`;
    },
    async get(ref) {
      safePrivatePath(home, "objects.git/objects");
      if (ref === null) return null;
      if (/^git:(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(ref)) {
        const oid = ref.slice(4);
        const bytes = await checked([`--git-dir=${gitDir}`, "cat-file", "blob", oid], home);
        const address = createHash2(oid.length === 40 ? "sha1" : "sha256").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
        if (address !== oid) throw new Error("snapshot content does not match its address");
        return bytes;
      }
      if (/^cas:[a-f0-9]{64}$/.test(ref)) {
        const bytes = await readFile(safePrivatePath(home, `objects/${ref.slice(4)}`));
        if (digest2(bytes) !== ref.slice(4)) throw new Error("snapshot content does not match its address");
        return bytes;
      }
      throw new Error("invalid private content reference");
    }
  };
}

// src/file-versions.js
import { readCoveringLog as readCoveringLog3, eventAtSeq as eventAtSeq2 } from "./log-read.js";
import { describeError as describeError3, hostService as hostService4, logWarning as logWarning3 } from "./host.js";

// src/storage-cleanup.js
import { randomUUID as randomUUID2 } from "node:crypto";
import { lstatSync as lstatSync2, readFileSync as readFileSync2, readdirSync as readdirSync2, unlinkSync as unlinkSync2 } from "node:fs";
import path3 from "node:path";
import { hostService as hostService2, logWarning, describeError } from "./host.js";
import { readCoveringLog } from "./log-read.js";
import { hasMarkerPrefix } from "./marker.js";
var fail = (code) => ({ ok: false, error: { code } });
var refPattern = /^(cas:[a-f0-9]{64}|git:[a-f0-9]{40,64})$/;
var filesInRecord = (record) => Array.isArray(record) ? record : record?.files;
function createStorageCleanup(ctx, storage) {
  const { home } = storage;
  const plans = /* @__PURE__ */ new Map();
  ctx.effect(() => () => plans.clear());
  function list(directory) {
    try {
      const target = safePrivatePath(home, directory);
      if (!lstatSync2(target).isDirectory()) throw new Error("unsafe-storage");
      return readdirSync2(target);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }
  function item(relative, kind, ref) {
    const target = safePrivatePath(home, relative);
    const stat = lstatSync2(target);
    if (!stat.isFile() || stat.nlink !== 1) throw new Error("unsafe-storage");
    const bytes = readFileSync2(target);
    return {
      relative,
      kind,
      ref,
      bytes: bytes.length,
      fingerprint: digest2(bytes),
      identity: `${stat.dev}:${stat.ino}:${stat.birthtimeMs}:${stat.mtimeMs}`
    };
  }
  function refs(entry) {
    const record = JSON.parse(readFileSync2(safePrivatePath(home, entry.relative), "utf8"));
    const files = filesInRecord(record);
    if (!Array.isArray(files)) throw new Error("invalid-record");
    const found = /* @__PURE__ */ new Set();
    for (const file of files) {
      if (!file || typeof file.path !== "string") throw new Error("invalid-record");
      if (file.reason !== void 0) {
        if (typeof file.reason !== "string") throw new Error("invalid-record");
      } else if (!Object.hasOwn(file, "before") || !Object.hasOwn(file, "after")) throw new Error("invalid-record");
      for (const key of ["before", "after"]) {
        const ref = file[key];
        if (ref === null || ref === void 0 && file.reason !== void 0) continue;
        if (typeof ref !== "string" || !refPattern.test(ref)) throw new Error("invalid-record");
        found.add(ref);
      }
    }
    return { record, found };
  }
  async function scan() {
    safePrivatePath(home);
    const query = hostService2(ctx, "sessionQuery");
    const corpus = await query.listSessions();
    if (!Array.isArray(corpus) || corpus.some((entry) => typeof entry?.header?.id !== "string")) throw new Error("scan-failed");
    const sessions = new Map(corpus.map(({ header }) => [header.id, {
      sessionId: header.id,
      title: header.id,
      projectPath: header.cwd ?? "",
      records: 0,
      bytes: 0,
      noSnapshots: true
    }]));
    const owners = /* @__PURE__ */ new Map();
    let readable = 0;
    let unreadable = 0;
    for (const { header } of corpus) {
      const read = await readCoveringLog(ctx, header.id);
      if (read.status !== "ok" || read.log.some((event, index) => event.seq !== index)) {
        unreadable++;
        continue;
      }
      readable++;
      for (const event of read.log) {
        if (event.type === "session/title" && typeof event.data?.title === "string") sessions.get(header.id).title = event.data.title || header.id;
        if (event.type === "user/message" && hasMarkerPrefix(event.data?.id) && event.surfaceOp?.op === "replace") {
          owners.set(digest2(JSON.stringify([header.id, event.data.id])), header.id);
        }
      }
    }
    if (corpus.length > 0 && readable === 0) throw new Error("scan-failed");
    const entries = [];
    for (const directory of ["records", "outcomes", "observations"]) for (const name2 of list(directory)) {
      if (/^[a-f0-9]{64}\.json$/.test(name2)) {
        const entry = item(`${directory}/${name2}`, directory === "observations" ? "records" : directory);
        if (directory !== "observations") entry.sessionId = owners.get(name2.slice(0, 64));
        if (entry.kind === "records") {
          try {
            const { record, found } = refs(entry);
            if (!Array.isArray(record) && sessions.has(record.sessionId) && typeof record.carrierId === "string" && digest2(JSON.stringify([record.sessionId, record.carrierId])) === name2.slice(0, 64)) entry.sessionId = record.sessionId;
            if (directory === "observations" && record.kind === "file-observation" && record.version === 1 && sessions.has(record.sessionId) && typeof record.callId === "string" && digest2(JSON.stringify([record.sessionId, record.callId])) === name2.slice(0, 64)) entry.sessionId = record.sessionId;
            entry.refs = found;
          } catch {
            entry.refs = null;
          }
        }
        entries.push(entry);
      } else if (/^[a-f0-9]{64}\.json\.[a-f0-9-]{36}\.pending$/.test(name2)) entries.push(item(`${directory}/${name2}`, "temporary"));
    }
    const recordOwners = new Map(entries.filter((e) => e.relative.startsWith("records/")).map((e) => [path3.basename(e.relative), e.sessionId]));
    for (const entry of entries) if (entry.kind === "outcomes") entry.sessionId ??= recordOwners.get(path3.basename(entry.relative));
    for (const name2 of list("objects")) if (/^[a-f0-9]{64}$/.test(name2)) entries.push(item(`objects/${name2}`, "objects", `cas:${name2}`));
    for (const prefix of list("objects.git/objects")) {
      if (!/^[a-f0-9]{2}$/.test(prefix)) continue;
      for (const suffix of list(`objects.git/objects/${prefix}`)) if (/^[a-f0-9]{38}$/.test(suffix) || /^[a-f0-9]{62}$/.test(suffix)) {
        entries.push(item(`objects.git/objects/${prefix}/${suffix}`, "objects", `git:${prefix}${suffix}`));
      }
    }
    for (const session of sessions.values()) {
      const owned = entries.filter((e) => e.sessionId === session.sessionId);
      session.records = owned.filter((e) => e.kind === "records").length;
      const referenced = new Set(owned.flatMap((e) => [...e.refs ?? []]));
      session.noSnapshots = referenced.size === 0 && owned.every((e) => e.kind !== "records" || e.refs !== null);
      session.bytes = owned.reduce((sum, e) => sum + e.bytes, 0) + entries.filter((e) => referenced.has(e.ref)).reduce((sum, e) => sum + e.bytes, 0);
    }
    return { entries, sessions: [...sessions.values()].filter((s) => entries.some((e) => e.sessionId === s.sessionId)), unreadable };
  }
  function candidates(scan2, mode, ids) {
    const selected = new Set(ids);
    const metadata = scan2.entries.filter((e) => ["records", "outcomes"].includes(e.kind) && (mode === "residue" ? e.sessionId === void 0 : selected.has(e.sessionId)));
    const removed = new Set(metadata.map((e) => e.relative));
    const retained = scan2.entries.filter((e) => e.kind === "records" && !removed.has(e.relative));
    const protectedObjects = retained.some((e) => e.refs === null);
    const references = new Set(retained.flatMap((e) => [...e.refs ?? []]));
    const selectedRefs = new Set(metadata.flatMap((e) => [...e.refs ?? []]));
    return { protectedObjects, entries: [...metadata, ...scan2.entries.filter((e) => e.kind === "objects" && !protectedObjects && !references.has(e.ref) && (mode === "residue" || selectedRefs.has(e.ref)) || mode === "residue" && e.kind === "temporary")] };
  }
  const categories = (entries) => ["records", "outcomes", "objects", "temporary"].map((kind) => ({
    kind,
    count: entries.filter((e) => e.kind === kind).length,
    bytes: entries.filter((e) => e.kind === kind).reduce((sum, e) => sum + e.bytes, 0)
  }));
  async function handle(request) {
    if (!request || !["list", "preview", "execute", "cancel"].includes(request.phase) || !["residue", "sessions"].includes(request.mode)) return fail("bad-request");
    if (request.phase === "cancel") {
      plans.delete(request.planId);
      return { ok: true, value: { phase: "cancel" } };
    }
    if (request.phase === "execute") {
      const plan = plans.get(request.planId);
      if (!plan || plan.mode !== request.mode || Date.now() - plan.created > 15 * 6e4) return fail("plan-not-found");
      plans.delete(request.planId);
      const current2 = await scan();
      const results = [];
      const eligible = [];
      const skipped = /* @__PURE__ */ new Set();
      for (const session of plan.sessions) {
        const reason = storage.busy(session.sessionId);
        if (reason) {
          skipped.add(session.sessionId);
          results.push({ sessionId: session.sessionId, title: session.title, status: "skipped", reason, bytes: 0 });
        } else eligible.push(session.sessionId);
      }
      const fresh = candidates(current2, plan.mode, eligible);
      const allowed = new Map(fresh.entries.map((e) => [e.relative, e]));
      const confirmed = plan.entries.filter((e) => allowed.get(e.relative)?.fingerprint === e.fingerprint && allowed.get(e.relative)?.identity === e.identity);
      const changed = /* @__PURE__ */ new Set();
      for (const id of eligible) {
        const before = plan.entries.filter((e) => e.sessionId === id);
        const now = current2.entries.filter((e) => e.sessionId === id);
        if (before.length !== now.length || before.some((e) => !confirmed.includes(e))) changed.add(id);
      }
      for (const id of changed) results.push({ sessionId: id, title: plan.sessions.find((s) => s.sessionId === id).title, status: "skipped", reason: "preview-stale", bytes: 0 });
      const deleting = confirmed.filter((e) => !changed.has(e.sessionId));
      let released = 0;
      const failures = [];
      const deletedRecords = /* @__PURE__ */ new Set();
      const failedSessions = /* @__PURE__ */ new Set();
      const invalidated = /* @__PURE__ */ new Set();
      const noteFailure = (entry) => {
        failures.push({ item: entry.relative, reason: "delete-failed" });
        if (entry.sessionId) failedSessions.add(entry.sessionId);
        if (entry.ref) for (const record of plan.entries) {
          if (record.sessionId && record.refs?.has(entry.ref)) failedSessions.add(record.sessionId);
        }
      };
      for (const entry of deleting.filter((e) => e.kind === "records")) {
        if (skipped.has(entry.sessionId)) continue;
        const reason = entry.sessionId && storage.busy(entry.sessionId);
        if (reason) {
          skipped.add(entry.sessionId);
          failedSessions.add(entry.sessionId);
          results.push({ sessionId: entry.sessionId, title: plan.sessions.find((s) => s.sessionId === entry.sessionId)?.title ?? entry.sessionId, status: "skipped", reason, bytes: 0 });
          continue;
        }
        try {
          if (entry.sessionId && !invalidated.has(entry.sessionId)) {
            storage.invalidate(entry.sessionId);
            invalidated.add(entry.sessionId);
          }
          unlinkSync2(safePrivatePath(home, entry.relative));
          released += entry.bytes;
          deletedRecords.add(entry.relative);
        } catch {
          noteFailure(entry);
        }
      }
      const remaining = current2.entries.filter((e) => e.kind === "records" && !deletedRecords.has(e.relative));
      const protectAll = remaining.some((e) => e.refs === null);
      const keepRefs = new Set(remaining.flatMap((e) => [...e.refs ?? []]));
      for (const entry of deleting.filter((e) => e.kind !== "records")) {
        if (entry.kind === "outcomes" && (failedSessions.has(entry.sessionId) || remaining.some((e) => path3.basename(e.relative) === path3.basename(entry.relative)))) continue;
        if (entry.kind === "objects" && (protectAll || keepRefs.has(entry.ref))) continue;
        try {
          const reason = entry.sessionId && storage.busy(entry.sessionId);
          if (reason) {
            skipped.add(entry.sessionId);
            failedSessions.add(entry.sessionId);
            results.push({
              sessionId: entry.sessionId,
              title: plan.sessions.find((s) => s.sessionId === entry.sessionId)?.title ?? entry.sessionId,
              status: "skipped",
              reason,
              bytes: 0
            });
            continue;
          }
          if (entry.sessionId && !invalidated.has(entry.sessionId)) {
            storage.invalidate(entry.sessionId);
            invalidated.add(entry.sessionId);
          }
          unlinkSync2(safePrivatePath(home, entry.relative));
          released += entry.bytes;
        } catch {
          noteFailure(entry);
        }
      }
      for (const id of eligible.filter((id2) => !changed.has(id2))) {
        if (results.some((r) => r.sessionId === id && r.status === "skipped")) continue;
        results.push({
          sessionId: id,
          title: plan.sessions.find((s) => s.sessionId === id).title,
          status: failedSessions.has(id) ? "failed" : "cleaned",
          reason: failedSessions.has(id) ? "delete-failed" : "",
          bytes: 0
        });
      }
      return { ok: true, value: {
        phase: "execute",
        releasedBytes: released,
        results,
        failures,
        changedCount: plan.entries.length - confirmed.length,
        protectedObjects: protectAll
      } };
    }
    const current = await scan();
    if (request.phase === "list") return { ok: true, value: { phase: "list", sessions: current.sessions, unreadableSessions: current.unreadable } };
    const ids = [...new Set(request.sessionIds ?? [])];
    if (request.mode === "sessions" && (ids.length === 0 || ids.some((id) => !current.sessions.some((s) => s.sessionId === id)))) return fail("bad-request");
    const selection = candidates(current, request.mode, ids);
    const planId = randomUUID2();
    const sessions = current.sessions.filter((s) => ids.includes(s.sessionId));
    for (const [id, plan] of plans) if (Date.now() - plan.created > 15 * 6e4) plans.delete(id);
    if (plans.size >= 32) plans.delete(plans.keys().next().value);
    plans.set(planId, { mode: request.mode, created: Date.now(), entries: selection.entries, sessions });
    return { ok: true, value: {
      phase: "preview",
      planId,
      sessions,
      categories: categories(selection.entries),
      estimatedBytes: selection.entries.reduce((sum, e) => sum + e.bytes, 0),
      itemCount: selection.entries.length,
      protectedObjects: selection.protectedObjects,
      unreadableSessions: current.unreadable
    } };
  }
  return async (request) => {
    try {
      return await storage.exclusive(() => handle(request));
    } catch (error) {
      logWarning(ctx, `storage cleanup failed: ${describeError(error)}`);
      return fail(["storage-busy", "unsafe-storage"].includes(error.message) ? error.message : "scan-failed");
    }
  };
}

// src/rollback-files.js
import { randomUUID as randomUUID3 } from "node:crypto";
import { lstat, open, rename, unlink } from "node:fs/promises";
import path4 from "node:path";
var sameContents = (a, b) => a === null || b === null ? a === b : a.equals(b);
var sameFile = (a, b) => a === null || b === null ? a === b : a.dev === b.dev && a.ino === b.ino && a.birthtimeMs === b.birthtimeMs;
async function fileTarget(cwd, name2) {
  if (typeof cwd !== "string" || !path4.isAbsolute(cwd) || typeof name2 !== "string" || name2 === "") throw new Error("unsafe-path");
  const absolute = path4.resolve(cwd, name2);
  const relative = path4.relative(cwd, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path4.sep}`) || path4.isAbsolute(relative) || relative.split(path4.sep).some((part) => part.toLowerCase() === ".git")) throw new Error("unsafe-path");
  let current = path4.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path4.sep)) {
    current = path4.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error("unsafe-path");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return absolute;
}
async function inspect(cwd, name2) {
  const absolute = await fileTarget(cwd, name2);
  let handle;
  try {
    const entry = await lstat(absolute);
    if (!entry.isFile() || entry.nlink !== 1) throw new Error("unsafe-path");
    handle = await open(absolute, "r");
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || !sameFile(entry, stat)) throw new Error("unsafe-path");
    const bytes = await handle.readFile();
    const current = await lstat(await fileTarget(cwd, name2));
    if (!sameFile(stat, current) || current.nlink !== 1) throw new Error("content-diverged");
    return { absolute, bytes, stat };
  } catch (error) {
    if (error.code === "ENOENT") return { absolute, bytes: null, stat: null };
    throw error;
  } finally {
    await handle?.close();
  }
}
async function contents(cwd, name2) {
  return (await inspect(cwd, name2)).bytes;
}
async function restoreFile(cwd, file, idle) {
  const initial = await inspect(cwd, file.path);
  if (!sameContents(initial.bytes, file.after)) throw new Error("content-diverged");
  let staging;
  let handle;
  let committed = false;
  try {
    if (file.before !== null) {
      staging = `${initial.absolute}.dsh-resend-${randomUUID3()}.pending`;
      await fileTarget(cwd, path4.relative(cwd, staging));
      handle = await open(staging, "wx", initial.stat === null ? 384 : initial.stat.mode & 511);
      await handle.writeFile(file.before);
      if (initial.stat !== null) await handle.chmod(initial.stat.mode & 511);
      await handle.sync();
      await handle.close();
      handle = void 0;
    }
    const current = await inspect(cwd, file.path);
    if (!sameContents(current.bytes, file.after) || !sameFile(current.stat, initial.stat)) throw new Error("content-diverged");
    if (!idle()) throw new Error("agent-busy");
    if (file.before === null) await unlink(current.absolute);
    else {
      await rename(staging, current.absolute);
      staging = void 0;
    }
    committed = true;
    if (!sameContents(await contents(cwd, file.path), file.before)) throw new Error("content-diverged");
  } catch (error) {
    error.restored = committed;
    throw error;
  } finally {
    await handle?.close();
    if (staging !== void 0) await unlink(staging).catch(() => {
    });
  }
}

// src/file-rollback.js
import { randomUUID as randomUUID4 } from "node:crypto";
import { mkdir as mkdir2, open as open2, readFile as readFile2, rename as rename2, unlink as unlink2 } from "node:fs/promises";
import path5 from "node:path";
import { readCoveringLog as readCoveringLog2, eventAtSeq } from "./log-read.js";
import { describeError as describeError2, hostService as hostService3, logWarning as logWarning2 } from "./host.js";
import { hasMarkerPrefix as hasMarkerPrefix2 } from "./marker.js";

// src/content-diff.js
var MAX_BYTES = 3 * 1024 * 1024;
var MAX_LINES = 1e4;
var MAX_LINE_POINTS = 2e4;
var MAX_CELLS = 2e6;
function textVersion(bytes) {
  if (bytes === null) return { exists: false, bytes: 0, lines: 0, bom: false, eol: "none", finalNewline: false, text: [] };
  const raw = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(raw)) throw new Error("non-text");
  const bom = raw.startsWith("\uFEFF");
  const text = bom ? raw.slice(1) : raw;
  const finalNewline = /(?:\r\n|\r|\n)$/.test(text);
  const lines = text === "" ? [] : text.split(/\r\n|\r|\n/);
  if (finalNewline) lines.pop();
  if (lines.length > MAX_LINES) throw new Error("too-many-lines");
  for (const line of lines) {
    let count = 0;
    for (const point of line) {
      void point;
      if (++count > MAX_LINE_POINTS) throw new Error("line-too-long");
    }
  }
  const endings = new Set(text.match(/\r\n|\r|\n/g) ?? []);
  const eol = endings.size > 1 ? "mixed" : endings.has("\r\n") ? "crlf" : endings.has("\n") ? "lf" : endings.has("\r") ? "cr" : "none";
  return { exists: true, bytes: bytes.length, lines: lines.length, bom, eol, finalNewline, text: lines };
}
function diffLines(current, target) {
  let prefix = 0;
  while (prefix < current.length && prefix < target.length && current[prefix] === target[prefix]) prefix++;
  let suffix = 0;
  while (suffix < current.length - prefix && suffix < target.length - prefix && current[current.length - 1 - suffix] === target[target.length - 1 - suffix]) suffix++;
  const a = current.slice(prefix, current.length - suffix);
  const b = target.slice(prefix, target.length - suffix);
  if (a.length * b.length > MAX_CELLS) throw new Error("computation-limited");
  const width = b.length + 1;
  const table = new Uint16Array((a.length + 1) * width);
  for (let i2 = a.length - 1; i2 >= 0; i2--) for (let j2 = b.length - 1; j2 >= 0; j2--) {
    table[i2 * width + j2] = a[i2] === b[j2] ? 1 + table[(i2 + 1) * width + j2 + 1] : Math.max(table[(i2 + 1) * width + j2], table[i2 * width + j2 + 1]);
  }
  const rows = [];
  let oldLine = 0;
  let newLine = 0;
  const row = (kind, text) => rows.push({
    kind,
    text,
    ...kind === "add" ? {} : { oldLine: ++oldLine },
    ...kind === "delete" ? {} : { newLine: ++newLine }
  });
  for (let i2 = 0; i2 < prefix; i2++) row("context", current[i2]);
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      row("context", a[i++]);
      j++;
    } else if (i < a.length && (j === b.length || table[(i + 1) * width + j] >= table[i * width + j + 1])) row("delete", a[i++]);
    else row("add", b[j++]);
  }
  for (let k = current.length - suffix; k < current.length; k++) row("context", current[k]);
  return rows;
}
function contentDiff(current, target) {
  const sizes = { current: current?.length ?? 0, target: target?.length ?? 0 };
  const action = target === null ? "delete" : current === null ? "create" : target.length === 0 ? "empty" : "restore";
  const unavailable = (reason) => ({ status: "unavailable", reason, sizes, action });
  if (sizes.current + sizes.target > MAX_BYTES) return unavailable("too-large");
  try {
    const before = textVersion(current);
    const after = textVersion(target);
    const rows = diffLines(before.text, after.text);
    const { text: oldText, ...currentInfo } = before;
    const { text: newText, ...targetInfo } = after;
    void oldText;
    void newText;
    return { status: "ready", sizes, action, current: currentInfo, target: targetInfo, rows };
  } catch (error) {
    return unavailable(["too-many-lines", "line-too-long", "computation-limited"].includes(error.message) ? error.message : "non-text");
  }
}

// src/file-rollback.js
var refused = (code) => ({ ok: false, error: { code } });
var refusedFiles = (files, reasons = /* @__PURE__ */ new Map()) => files.map((file) => ({
  path: file.path,
  action: "refuse",
  reason: file.reason ?? reasons.get(file.path) ?? "execution-stopped"
}));
var selectionReport = (files, states) => files.map((file) => {
  const state = states.get(file.path);
  if (state === void 0) return { path: file.path, action: "refuse", reason: file.reason ?? "execution-stopped" };
  if (state.state === "restored") return { path: file.path, action: "restored" };
  if (state.state === "kept") return { path: file.path, action: "kept" };
  return {
    path: file.path,
    action: "refuse",
    reason: state.state === "uncertain" ? "restore-outcome-unavailable" : state.reason ?? file.reason ?? "execution-stopped"
  };
});
function createFileRollback(ctx, { home, snapshots }) {
  const plans = /* @__PURE__ */ new Map();
  const completed = /* @__PURE__ */ new Map();
  const progress = /* @__PURE__ */ new Map();
  const owners = /* @__PURE__ */ new Map();
  const persisted = /* @__PURE__ */ new Set();
  const sessionRevisions = /* @__PURE__ */ new Map();
  let disposed = false;
  const versioned = /* @__PURE__ */ new Set();
  const resultSchema2 = rollbackResultSchema();
  const recordPath = (sessionId, id) => safePrivatePath(home, `records/${digest2(JSON.stringify([sessionId, id]))}.json`);
  const outcomePath = (sessionId, id) => safePrivatePath(home, `outcomes/${digest2(JSON.stringify([sessionId, id]))}.json`);
  function invalidate(sessionId) {
    for (const [id, plan] of plans) if (plan.sessionId === sessionId) plans.delete(id);
    for (const [target, owner] of owners) if (owner === sessionId) {
      completed.delete(target);
      progress.delete(target);
      persisted.delete(target);
      versioned.delete(target);
      owners.delete(target);
    }
  }
  ctx.on("session/disposed", (session) => {
    sessionRevisions.set(session.id, (sessionRevisions.get(session.id) ?? 0) + 1);
    for (const [id, plan] of plans) if (plan.sessionId === session.id) plans.delete(id);
  });
  ctx.effect(() => () => {
    disposed = true;
    plans.clear();
    completed.clear();
    progress.clear();
    owners.clear();
    persisted.clear();
    versioned.clear();
  });
  async function save(target, value) {
    const staging = `${target}.${randomUUID4()}.pending`;
    let handle;
    try {
      await mkdir2(path5.dirname(target), { recursive: true });
      safePrivatePath(home, path5.relative(home, staging));
      handle = await open2(staging, "wx", 384);
      await handle.writeFile(JSON.stringify(value));
      await handle.sync();
      await handle.close();
      handle = void 0;
      safePrivatePath(home, path5.relative(home, target));
      await rename2(staging, target);
    } finally {
      await handle?.close();
      await unlink2(staging).catch(() => {
      });
    }
  }
  const executionFiles = (files, processed, failedPath, reason) => files.map((file) => processed.has(file.path) ? { path: file.path, action: "restored" } : { path: file.path, action: "refuse", reason: file.reason ?? (file.path === failedPath ? reason : "execution-stopped") });
  async function saveCompletion(target, answer, record = answer) {
    try {
      await save(target, record);
      persisted.add(target);
      progress.delete(target);
      return answer;
    } catch (error) {
      logWarning2(ctx, `file rollback result could not be saved: ${describeError2(error)}`);
      return { ok: false, error: { code: "result-save-failed", files: answer.value.files.map((file) => file.action === "restore" ? { path: file.path, action: "restored" } : file.action === "refuse" ? { path: file.path, action: "refuse", reason: file.reason } : { path: file.path, action: file.action }) } };
    }
  }
  const legalState = (entry) => ["pending", "kept", "refused", "uncertain", "restored"].includes(entry.state) && (entry.reason === void 0 || typeof entry.reason === "string");
  async function loadOutcome(target, sessionId) {
    if (completed.has(target)) return;
    try {
      const saved = JSON.parse(await readFile2(target, "utf8"));
      if (saved.kind === "file-rollback-progress" && (saved.version === 1 || saved.version === 2)) {
        const { value } = resultSchema2.parse({ ok: true, value: saved.value });
        if (!Array.isArray(saved.states) || saved.states.length !== value.files.length || saved.states.some((entry, index) => entry.path !== value.files[index].path || !legalState(entry))) throw new Error("invalid rollback progress");
        if (saved.version === 2 && (!Array.isArray(saved.selected) || new Set(saved.selected).size !== saved.selected.length || saved.selected.some((member) => typeof member !== "string" || !value.files.some((file) => file.path === member)))) throw new Error("invalid rollback progress");
        const terminal = saved.version === 2 ? ["restored", "kept", "refused"] : ["restored", "refused"];
        if (saved.states.every((file) => terminal.includes(file.state))) {
          if (saved.version === 2) {
            completed.set(target, { ok: true, value: {
              ...value,
              completed: true,
              files: selectionReport(value.files, new Map(saved.states.map((entry) => [entry.path, entry])))
            } });
            versioned.add(target);
          } else completed.set(target, { ok: true, value: { ...value, completed: true } });
          progress.delete(target);
        } else progress.set(target, { ...saved, value });
      } else if (saved.kind === "file-rollback-result" && saved.version === 2) {
        const answer = resultSchema2.parse(saved.value);
        if (!answer.ok || answer.value.completed !== true) throw new Error("invalid completion record");
        completed.set(target, answer);
        persisted.add(target);
        versioned.add(target);
        progress.delete(target);
      } else {
        const answer = resultSchema2.parse(saved);
        if (!answer.ok || answer.value.completed !== true) throw new Error("invalid completion record");
        completed.set(target, answer);
        persisted.add(target);
        progress.delete(target);
      }
      owners.set(target, sessionId);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  async function rollback(request, preparedId) {
    const { sessionId, carrierSeq, phase, planId } = request;
    if (request.scope !== void 0 && request.scope !== "artifacts" || !["status", "preview", "execute", "cancel", "keep"].includes(phase)) return refused("bad-request");
    if (typeof sessionId !== "string" || sessionId === "" || !Number.isSafeInteger(carrierSeq) || carrierSeq < 0) return refused("bad-request");
    const session = hostService3(ctx, "sessions")?.get(sessionId);
    if (session === void 0) return refused("session-not-found");
    const revision = sessionRevisions.get(sessionId);
    const alive2 = () => !disposed && sessionRevisions.get(sessionId) === revision && hostService3(ctx, "sessions")?.get(sessionId) === session;
    if (!alive2()) return refused("plan-not-found");
    const agent = hostService3(ctx, "agents")?.get(sessionId);
    if (phase !== "status" && agent?.status !== "idle") {
      const pending = plans.get(planId);
      return phase === "execute" && pending?.sessionId === sessionId && pending.carrierSeq === carrierSeq ? { ok: false, error: { code: "agent-busy", files: refusedFiles(pending.files) } } : refused("agent-busy");
    }
    let carrier;
    if (preparedId !== void 0) carrier = { data: { id: preparedId } };
    else {
      const covering = await readCoveringLog2(ctx, sessionId);
      if (covering.status !== "ok") return refused("internal");
      carrier = eventAtSeq(covering.log, carrierSeq);
      if (carrier?.type !== "user/message" || !hasMarkerPrefix2(carrier.data?.id) || carrier.surfaceOp?.op !== "replace") return refused("no-target-state");
    }
    const outcome = outcomePath(sessionId, carrier.data.id);
    await loadOutcome(outcome, sessionId);
    if (completed.has(outcome)) {
      const answer = completed.get(outcome);
      return persisted.has(outcome) ? answer : saveCompletion(
        outcome,
        answer,
        versioned.has(outcome) ? { kind: "file-rollback-result", version: 2, value: answer } : answer
      );
    }
    if (phase === "status") {
      const interrupted = progress.get(outcome);
      if (interrupted) return { ok: false, error: { code: "execution-stopped", files: selectionReport(
        interrupted.value.files,
        new Map((interrupted.states ?? []).map((entry) => [entry.path, entry]))
      ) } };
      let empty = false;
      try {
        empty = filesInRecord(JSON.parse(await readFile2(recordPath(sessionId, carrier.data.id), "utf8"))).length === 0;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      return { ok: true, value: { planId: "", completed: false, files: [], ...empty ? { empty: true } : {} } };
    }
    if (phase !== "preview") {
      const plan = plans.get(planId);
      if (phase === "keep" && progress.get(outcome)?.states.some((entry) => entry.state === "restored" || entry.state === "uncertain")) {
        const interrupted = progress.get(outcome);
        if (plan !== void 0 && plan.sessionId === sessionId && plan.carrierSeq === carrierSeq) plans.delete(planId);
        for (const entry of interrupted.states) if (entry.state === "pending") {
          entry.state = "kept";
          delete entry.reason;
        }
        const states = new Map(interrupted.states.map((entry) => [entry.path, entry]));
        const files2 = selectionReport(interrupted.value.files, states);
        if (interrupted.states.some((entry) => entry.state === "uncertain")) {
          try {
            await save(outcome, interrupted);
          } catch (error) {
            logWarning2(ctx, `file rollback progress could not be saved: ${describeError2(error)}`);
            return { ok: false, error: { code: "progress-save-failed", files: files2 } };
          }
          progress.set(outcome, structuredClone(interrupted));
          return { ok: false, error: { code: "execution-stopped", files: files2 } };
        }
        const answer2 = { ok: true, value: { ...interrupted.value, completed: true, files: files2 } };
        completed.set(outcome, answer2);
        owners.set(outcome, sessionId);
        versioned.add(outcome);
        return await saveCompletion(outcome, answer2, { kind: "file-rollback-result", version: 2, value: answer2 });
      }
      if (plan === void 0 || plan.sessionId !== sessionId || plan.carrierSeq !== carrierSeq) return refused("plan-not-found");
      if (request.selected !== void 0 && phase === "execute") {
        const restorable = new Set(plan.files.filter((file) => file.action === "restore").map((file) => file.path));
        if (request.selected.length === 0 || new Set(request.selected).size !== request.selected.length || request.selected.some((member) => !restorable.has(member))) return refused("invalid-selection");
      }
      plans.delete(planId);
      if (phase === "cancel" || phase === "keep") return { ok: true, value: plan.preview };
      if (phase !== "execute") return refused("bad-request");
      const currentProgress = progress.get(outcome);
      if (JSON.stringify(currentProgress) !== plan.progress) return { ok: false, error: {
        code: "preview-stale",
        files: selectionReport(currentProgress.value.files, new Map(currentProgress.states.map((entry) => [entry.path, entry])))
      } };
      if (request.selected !== void 0) {
        const selected = new Set(request.selected);
        const previous = new Map((progress.get(outcome)?.states ?? []).map((entry) => [entry.path, entry]));
        const stateOf = (file) => {
          const state = previous.get(file.path)?.state;
          if (state === "restored" || state === "uncertain") return { state };
          if (file.action === "refuse") return { state: "refused" };
          return selected.has(file.path) ? { state: "pending" } : { state: "kept" };
        };
        const stateEntries = plan.files.map((file) => ({ path: file.path, ...stateOf(file) }));
        const states = new Map(stateEntries.map((entry) => [entry.path, entry]));
        const divergences2 = /* @__PURE__ */ new Map();
        for (const file of plan.files) {
          if (states.get(file.path).state !== "pending") continue;
          try {
            if (!sameContents(await contents(session.header.cwd, file.path), file.after)) divergences2.set(file.path, "content-diverged");
          } catch (error) {
            divergences2.set(file.path, error.message === "unsafe-path" ? "unsafe-path" : "unreadable-file");
          }
        }
        if (divergences2.size > 0) return { ok: false, error: { code: "preview-stale", files: plan.files.map((file) => file.action === "restore" && !selected.has(file.path) ? { path: file.path, action: "kept" } : { path: file.path, action: "refuse", reason: file.reason ?? divergences2.get(file.path) ?? "execution-stopped" }) } };
        if (agent.status !== "idle") return { ok: false, error: { code: "agent-busy", files: selectionReport(plan.files, states) } };
        const journal2 = {
          kind: "file-rollback-progress",
          version: 2,
          selected: [...request.selected],
          value: plan.preview,
          states: stateEntries
        };
        const checkpoint2 = async () => {
          await save(outcome, journal2);
          progress.set(outcome, structuredClone(journal2));
          owners.set(outcome, sessionId);
        };
        const savedProgress = async () => {
          try {
            await checkpoint2();
          } catch (error) {
            logWarning2(ctx, `file rollback progress could not be saved: ${describeError2(error)}`);
            return { ok: false, error: { code: "progress-save-failed", files: selectionReport(plan.files, states) } };
          }
        };
        let failed = await savedProgress();
        if (failed) return failed;
        for (const file of plan.files) {
          if (states.get(file.path).state !== "pending") continue;
          const state = states.get(file.path);
          state.state = "uncertain";
          delete state.reason;
          failed = await savedProgress();
          if (failed) return failed;
          try {
            await restoreFile(session.header.cwd, file, () => alive2() && agent.status === "idle");
          } catch (error) {
            state.state = error.restored ? "uncertain" : "pending";
            state.reason = ["content-diverged", "unsafe-path", "agent-busy"].includes(error.message) ? error.message : "restore-failed";
            try {
              await checkpoint2();
            } catch (saving) {
              logWarning2(ctx, `file rollback progress could not be saved: ${describeError2(saving)}`);
            }
            return { ok: false, error: { code: "execution-stopped", files: selectionReport(plan.files, states) } };
          }
          state.state = "restored";
          delete state.reason;
          failed = await savedProgress();
          if (failed) return failed;
        }
        const answer2 = { ok: true, value: { ...plan.preview, completed: true, files: selectionReport(plan.files, states) } };
        completed.set(outcome, answer2);
        owners.set(outcome, sessionId);
        versioned.add(outcome);
        return await saveCompletion(outcome, answer2, { kind: "file-rollback-result", version: 2, value: answer2 });
      }
      const divergences = /* @__PURE__ */ new Map();
      for (const file of plan.files) {
        if (file.action === "refuse") continue;
        try {
          if (!sameContents(await contents(session.header.cwd, file.path), file.after)) divergences.set(file.path, "content-diverged");
        } catch (error) {
          divergences.set(file.path, error.message === "unsafe-path" ? "unsafe-path" : "unreadable-file");
        }
      }
      if (divergences.size > 0) return { ok: false, error: { code: "preview-stale", files: refusedFiles(plan.files, divergences) } };
      if (agent.status !== "idle") return { ok: false, error: { code: "agent-busy", files: refusedFiles(plan.files) } };
      const processed = /* @__PURE__ */ new Set();
      const previousStates2 = new Map(progress.get(outcome)?.states.map((file) => [file.path, file.state]));
      const journal = {
        kind: "file-rollback-progress",
        version: 1,
        value: plan.preview,
        states: plan.files.map((file) => ({ path: file.path, state: file.action === "restore" ? "pending" : ["restored", "uncertain"].includes(previousStates2.get(file.path)) ? previousStates2.get(file.path) : "refused" }))
      };
      const checkpoint = async () => {
        await save(outcome, journal);
        progress.set(outcome, structuredClone(journal));
        owners.set(outcome, sessionId);
      };
      try {
        await checkpoint();
      } catch (error) {
        logWarning2(ctx, `file rollback progress could not be saved: ${describeError2(error)}`);
        return { ok: false, error: { code: "progress-save-failed", files: refusedFiles(plan.files) } };
      }
      for (const file of plan.files) {
        if (file.action === "refuse") continue;
        const state = journal.states.find((entry) => entry.path === file.path);
        state.state = "uncertain";
        try {
          await checkpoint();
        } catch (error) {
          logWarning2(ctx, `file rollback progress could not be saved: ${describeError2(error)}`);
          return { ok: false, error: { code: "progress-save-failed", files: executionFiles(plan.files, processed) } };
        }
        try {
          await restoreFile(session.header.cwd, file, () => alive2() && agent.status === "idle");
          processed.add(file.path);
        } catch (error) {
          if (error.restored) processed.add(file.path);
          state.state = error.restored ? "uncertain" : "pending";
          try {
            await checkpoint();
          } catch (saving) {
            logWarning2(ctx, `file rollback progress could not be saved: ${describeError2(saving)}`);
          }
          const reason = ["content-diverged", "unsafe-path", "agent-busy"].includes(error.message) ? error.message : "restore-failed";
          return { ok: false, error: { code: "execution-stopped", files: executionFiles(plan.files, processed, file.path, reason) } };
        }
        state.state = "restored";
        try {
          await checkpoint();
        } catch (error) {
          logWarning2(ctx, `file rollback progress could not be saved: ${describeError2(error)}`);
          return { ok: false, error: { code: "progress-save-failed", files: executionFiles(plan.files, processed) } };
        }
      }
      const answer = { ok: true, value: { ...plan.preview, completed: true } };
      completed.set(outcome, answer);
      owners.set(outcome, sessionId);
      const saved = await saveCompletion(outcome, answer);
      if (!saved.ok) return saved;
      return { ok: true, value: plan.preview };
    }
    let record;
    try {
      record = filesInRecord(JSON.parse(await readFile2(recordPath(sessionId, carrier.data.id), "utf8")));
    } catch (error) {
      if (error.code === "ENOENT") return refused("no-target-state");
      throw error;
    }
    if (!Array.isArray(record) || record.some((file) => typeof file?.path !== "string" || file.reason !== void 0 && typeof file.reason !== "string") || new Set(record.map((file) => process.platform === "win32" ? file.path.toLowerCase() : file.path)).size !== record.length) throw new Error("invalid file record");
    const previousStates = new Map(progress.get(outcome)?.states.map((file) => [file.path, file.state]));
    const files = [];
    for (const file of record) {
      const previous = previousStates.get(file.path);
      let reason = previous === "restored" ? "already-restored" : previous === "uncertain" ? "restore-outcome-unavailable" : file.reason;
      let before;
      let after;
      if (reason === void 0) {
        try {
          before = await snapshots.get(file.before);
          after = await snapshots.get(file.after);
          if (!sameContents(await contents(session.header.cwd, file.path), after)) reason = "content-diverged";
        } catch (error) {
          reason = error.message === "unsafe-path" ? "unsafe-path" : "snapshot-unavailable";
        }
      }
      files.push({ path: file.path, action: reason === void 0 ? "restore" : "refuse", ...reason === void 0 ? { before, after } : { reason } });
    }
    if (!alive2()) return refused("plan-not-found");
    for (const [id2, plan] of plans) if (plan.sessionId === sessionId && plan.carrierSeq === carrierSeq) plans.delete(id2);
    const id = randomUUID4();
    const preview = {
      planId: id,
      ...request.scope === void 0 ? {} : { scope: "artifacts" },
      files: files.map(({ path: path8, action, reason, before }) => ({
        path: path8,
        action,
        ...reason === void 0 ? {} : { reason },
        ...action === "restore" && before === null ? { operation: "delete" } : {}
      }))
    };
    plans.set(id, { sessionId, carrierSeq, files, preview, preparedId, outcome, progress: JSON.stringify(progress.get(outcome)) });
    const recorded = progress.get(outcome);
    return { ok: true, value: { ...preview, ...recorded?.version === 2 ? { selected: recorded.selected } : {} } };
  }
  async function guardedRollback(request, preparedId) {
    try {
      return await rollback(request, preparedId);
    } catch (error) {
      logWarning2(ctx, `file rollback failed: ${describeError2(error)}`);
      return refused("internal");
    }
  }
  async function content(request, preparedId) {
    try {
      const plan = plans.get(request.planId);
      if (!plan || plan.sessionId !== request.sessionId || plan.preparedId !== preparedId || preparedId === void 0 && plan.carrierSeq !== request.carrierSeq) return refused("plan-not-found");
      const file = plan.files.find((file2) => file2.path === request.path && file2.action === "restore");
      if (!file) return refused("invalid-member");
      const session = hostService3(ctx, "sessions")?.get(request.sessionId);
      if (!session) return refused("plan-not-found");
      if (hostService3(ctx, "agents")?.get(request.sessionId)?.status !== "idle") return refused("agent-busy");
      await loadOutcome(plan.outcome, request.sessionId);
      const state = progress.get(plan.outcome)?.states.find((entry) => entry.path === file.path)?.state;
      if (completed.has(plan.outcome) || ["restored", "uncertain"].includes(state)) return refused("plan-not-found");
      const current = await contents(session.header.cwd, file.path);
      if (!sameContents(current, file.after)) return refused("preview-stale");
      if (disposed || plans.get(request.planId) !== plan || hostService3(ctx, "sessions")?.get(request.sessionId) !== session) return refused("plan-not-found");
      if (hostService3(ctx, "agents")?.get(request.sessionId)?.status !== "idle") return refused("agent-busy");
      return { ok: true, value: contentDiff(current, file.before) };
    } catch (error) {
      return refused(error.message === "unsafe-path" || error.message === "content-diverged" ? "preview-stale" : "read-failed");
    }
  }
  return { invalidate, rollback: guardedRollback, prepared: guardedRollback, content };
}

// src/file-observations.js
import { randomUUID as randomUUID5 } from "node:crypto";
import { mkdir as mkdir3, open as open3, readFile as readFile3, rename as rename3, unlink as unlink3 } from "node:fs/promises";
import path6 from "node:path";
var ordered = (value) => Array.isArray(value) ? value.map(ordered) : value !== null && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, ordered(value[key])])) : value;
var signature = (cwd, name2, args) => digest2(JSON.stringify([cwd, name2, ordered(args)]));
function createObservationStore(home, snapshots) {
  const target = (sessionId, callId) => safePrivatePath(home, `observations/${digest2(JSON.stringify([sessionId, callId]))}.json`);
  return {
    async put(session, exec, observation) {
      const backend = observation.reason === void 0 ? await snapshots.backend(session.header.cwd) : "cas";
      const file = observation.reason === void 0 ? { path: observation.path, before: await snapshots.put(observation.before, backend), after: await snapshots.put(observation.after, backend) } : { path: observation.path, reason: observation.reason };
      const destination = target(session.id, exec.callId);
      const staging = `${destination}.${randomUUID5()}.pending`;
      let handle;
      try {
        await mkdir3(path6.dirname(destination), { recursive: true });
        safePrivatePath(home, path6.relative(home, staging));
        handle = await open3(staging, "wx", 384);
        await handle.writeFile(JSON.stringify({
          kind: "file-observation",
          version: 1,
          sessionId: session.id,
          callId: exec.callId,
          signature: signature(session.header.cwd, exec.name, exec.arguments),
          files: [file]
        }));
        await handle.sync();
        await handle.close();
        handle = void 0;
        safePrivatePath(home, path6.relative(home, destination));
        await rename3(staging, destination);
      } finally {
        await handle?.close();
        await unlink3(staging).catch(() => {
        });
      }
    },
    async get(session, callId, name2, args) {
      let record;
      try {
        record = JSON.parse(await readFile3(target(session.id, callId), "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
      if (record.kind !== "file-observation" || record.version !== 1 || record.sessionId !== session.id || record.callId !== callId || record.signature !== signature(session.header.cwd, name2, args) || !Array.isArray(record.files) || record.files.length !== 1 || typeof record.files[0]?.path !== "string" || record.files[0].reason !== void 0 && typeof record.files[0].reason !== "string") {
        throw new Error("invalid file observation");
      }
      const file = record.files[0];
      if (file.reason !== void 0) return { path: file.path, reason: file.reason };
      return { path: file.path, before: await snapshots.get(file.before), after: await snapshots.get(file.after) };
    }
  };
}

// src/file-versions.js
import { isCarrierIdFor } from "./marker.js";
var refused2 = (code) => ({ ok: false, error: { code } });
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
function resultCallIds(event) {
  const message = event.data?.message;
  return [...new Set([message?.toolCallId, message?.source?.callId, message?.callId].filter((id) => typeof id === "string" && id !== ""))];
}
function createFileVersions(ctx) {
  const storage = createPrivateStorage(ctx);
  const { home } = storage;
  const snapshots = createSnapshotStore(home);
  const observations = /* @__PURE__ */ new Map();
  const observationStore = createObservationStore(home, snapshots);
  const rollback = createFileRollback(ctx, { home, snapshots });
  const generations = /* @__PURE__ */ new Map();
  const recordPath = (sessionId, id) => safePrivatePath(home, `records/${digest2(JSON.stringify([sessionId, id]))}.json`);
  const observationKey = (sessionId, callId) => JSON.stringify([sessionId, callId]);
  function synchronizeGeneration(sessionId) {
    const generation = storage.generation(sessionId);
    if (generations.get(sessionId) === generation) return;
    generations.set(sessionId, generation);
    rollback.invalidate(sessionId);
    for (const key of observations.keys()) if (JSON.parse(key)[0] === sessionId) observations.delete(key);
  }
  ctx.on("tools/execute", async (exec, next) => {
    const session = exec.agent?.session;
    const name2 = mutationPath(exec.name, exec.arguments);
    if (session === void 0 || name2 === void 0) return next();
    return storage.activity(session.id, "generating", async () => {
      synchronizeGeneration(session.id);
      const cwd = session.header.cwd;
      let before;
      let reason;
      let normalized = name2;
      try {
        normalized = path7.relative(cwd, await fileTarget(cwd, name2)).split(path7.sep).join("/");
        before = await contents(cwd, normalized);
      } catch (error) {
        reason = error.message === "unsafe-path" ? "unsafe-path" : "unreadable-file";
      }
      const result = await next();
      let after;
      try {
        after = await contents(cwd, normalized);
        if (result.isError && reason === void 0 && !sameContents(before, after)) reason = "write-outcome-unavailable";
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
      const observation = { path: normalized, before, after, reason };
      observations.set(observationKey(session.id, exec.callId), observation);
      try {
        await storage.exclusive(() => observationStore.put(session, exec, observation));
      } catch (error) {
        logWarning3(ctx, `file observation could not be saved: ${describeError3(error)}`);
      }
      return result;
    });
  });
  ctx.on("session/disposed", (session) => {
    for (const key of observations.keys()) if (JSON.parse(key)[0] === session.id) observations.delete(key);
  });
  ctx.effect(() => () => {
    observations.clear();
  });
  async function prepare(session, plan, carrierId, request) {
    synchronizeGeneration(session.id);
    const covering = await readCoveringLog3(ctx, session.id);
    if (covering.status !== "ok") throw new Error(covering.detail);
    const replayKey = request && digest2(JSON.stringify([
      session.id,
      request.op,
      request.targetSeq,
      plan.rangeStartSeq,
      plan.endSeq,
      plan.shadowedSeqs,
      plan.resendText
    ]));
    if (replayKey) {
      const directory = safePrivatePath(home, "records");
      const names = await readdir(directory).catch((error) => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
      for (const name2 of names) {
        if (!/^[a-f0-9]{64}\.json$/.test(name2)) continue;
        let saved;
        try {
          saved = JSON.parse(await readFile4(safePrivatePath(home, `records/${name2}`), "utf8"));
        } catch (error) {
          if (error instanceof SyntaxError || error.code === "ENOENT") continue;
          throw error;
        }
        if (saved?.replayKey !== replayKey || saved.sessionId !== session.id || !isCarrierIdFor(request.op, saved.carrierId) || digest2(JSON.stringify([session.id, saved.carrierId])) !== name2.slice(0, 64)) continue;
        if (covering.log.some((event) => event.type === "user/message" && event.data.id === saved.carrierId)) continue;
        return prepared(saved.carrierId, session, plan);
      }
    }
    const files = /* @__PURE__ */ new Map();
    const shadowed = new Set(plan.shadowedSeqs);
    const results = /* @__PURE__ */ new Map();
    const referencedResults = /* @__PURE__ */ new Map();
    const rootCalls = /* @__PURE__ */ new Map();
    for (const event of covering.log) {
      if (event.type === "tool/call") rootCalls.set(event.data.callId, event.seq);
      if (event.type !== "tool/result") continue;
      for (const id of resultCallIds(event)) results.set(id, [...results.get(id) ?? [], event]);
      for (const seq of event.sourceEventSeqs ?? []) referencedResults.set(seq, [...referencedResults.get(seq) ?? [], event]);
    }
    for (const seq of shadowed) if (eventAtSeq2(covering.log, seq) === void 0) throw new Error(`file version read does not cover seq ${seq}`);
    let userSeq;
    for (const event of covering.log) {
      if (event.type === "user/message" && event.surfaceOp === "append" && event.data.source?.kind === "user") userSeq = event.seq;
      if (event.type !== "tool/call" && event.type !== "tool/ptc-dispatch") continue;
      const callId = event.type === "tool/call" ? event.data.callId : event.data.subCallId;
      const rootCallId = event.type === "tool/call" ? callId : event.data.rootCallId;
      const candidates = [.../* @__PURE__ */ new Set([...results.get(rootCallId) ?? [], ...referencedResults.get(rootCalls.get(rootCallId)) ?? []])];
      if (candidates.length ? !candidates.some((result) => shadowed.has(result.seq)) : !shadowed.has(userSeq)) continue;
      let args;
      try {
        args = event.type === "tool/call" ? JSON.parse(event.data.arguments) : event.data.arguments;
      } catch {
        if (["write", "edit", "str_replace_editor"].includes(event.data.name)) throw new Error("file mutation arguments unavailable");
        continue;
      }
      const name2 = mutationPath(event.data.name, args);
      if (name2 === void 0) {
        if (["write", "edit"].includes(event.data.name) || event.data.name === "str_replace_editor" && ["create", "str_replace", "insert"].includes(args?.command)) throw new Error("file mutation path unavailable");
        continue;
      }
      const associationReason = candidates.length === 0 ? "tool-result-unavailable" : candidates.length !== 1 || resultCallIds(candidates[0]).some((id) => id !== rootCallId) ? "tool-result-ambiguous" : void 0;
      let observed = observations.get(observationKey(session.id, callId));
      if (observed === void 0) {
        try {
          observed = await observationStore.get(session, callId, event.data.name, args);
        } catch (error) {
          logWarning3(ctx, `file observation could not be read: ${describeError3(error)}`);
          observed = { path: name2, reason: "snapshot-unavailable" };
        }
      }
      let normalized = observed?.path ?? name2;
      let pathReason;
      if (!observed) {
        try {
          normalized = path7.relative(session.header.cwd, await fileTarget(session.header.cwd, name2)).split(path7.sep).join("/");
        } catch {
          pathReason = "unsafe-path";
        }
      }
      const change = {
        ...observed ?? { path: normalized, reason: pathReason ?? "prior-state-unavailable" },
        ...associationReason ? { reason: associationReason } : {}
      };
      if (change.reason === void 0 && sameContents(change.before, change.after)) continue;
      const key = process.platform === "win32" ? change.path.toLowerCase() : change.path;
      const previous = files.get(key);
      if (previous === void 0) files.set(key, { ...change });
      else {
        if (previous.reason === void 0 && change.reason === void 0 && !sameContents(previous.after, change.before)) previous.reason = "diverged-between-writes";
        previous.reason ??= change.reason;
        previous.after = change.after;
      }
    }
    const backend = [...files.values()].some((file) => file.reason === void 0) ? await snapshots.backend(session.header.cwd) : "cas";
    const records = [];
    for (const file of files.values()) {
      if (file.reason === void 0 && sameContents(file.before, file.after)) continue;
      if (file.reason !== void 0) records.push({ path: file.path, reason: file.reason });
      else records.push({ path: file.path, before: await snapshots.put(file.before, backend), after: await snapshots.put(file.after, backend) });
    }
    const target = recordPath(session.id, carrierId);
    await mkdir4(path7.dirname(target), { recursive: true });
    const staging = `${target}.${randomUUID6()}.pending`;
    await writeFile2(staging, JSON.stringify({
      sessionId: session.id,
      carrierId,
      files: records,
      ...replayKey ? { replayKey } : {}
    }), { flag: "wx", mode: 384 });
    await rename4(staging, target);
    return prepared(carrierId, session, plan);
  }
  function prepared(carrierId, session, plan) {
    const target = recordPath(session.id, carrierId);
    return {
      carrierId,
      preview: () => rollback.prepared({ sessionId: session.id, carrierSeq: plan.rangeStartSeq, phase: "preview" }, carrierId),
      rollback: (request) => rollback.prepared({ sessionId: session.id, carrierSeq: plan.rangeStartSeq, ...request }, carrierId),
      content: (request) => rollback.content(request, carrierId),
      async discardUnlessWritten() {
        const read = await readCoveringLog3(ctx, session.id);
        if (read.status === "ok" && !read.log.some((event) => event.type === "user/message" && event.data.id === carrierId)) {
          try {
            await readFile4(safePrivatePath(home, `outcomes/${digest2(JSON.stringify([session.id, carrierId]))}.json`));
            return;
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
          await unlink4(target).catch((error) => {
            if (error.code !== "ENOENT") throw error;
          });
        }
      }
    };
  }
  return {
    generation: (sessionId) => storage.generation(sessionId),
    prepare: (...args) => storage.exclusive(() => prepare(...args)),
    cleanup: createStorageCleanup(ctx, storage),
    async withOperation(sessionId, reason, task) {
      try {
        return await storage.operation(sessionId, reason, task);
      } catch (error) {
        logWarning3(ctx, `private storage operation failed: ${describeError3(error)}`);
        return refused2(["storage-busy", "storage-recovery-required"].includes(error.message) ? error.message : "internal");
      }
    },
    async rollback(request) {
      synchronizeGeneration(request.sessionId);
      return rollback.rollback(request);
    },
    async content(request) {
      synchronizeGeneration(request.sessionId);
      return rollback.content(request);
    }
  };
}

// src/resend.js
var fileVersions = /* @__PURE__ */ new WeakMap();
var acceptedPrompts = /* @__PURE__ */ new WeakMap();
var replayPlans = /* @__PURE__ */ new WeakMap();
var replayFailure = (code) => ({ ok: false, error: { code } });
var replayPreview = (saved) => ({ ok: true, value: {
  preflight: true,
  preflightId: saved.id,
  userSeq: saved.plan.rangeStartSeq,
  op: saved.request.op,
  ...saved.preview.value
} });
var stoppedAfterRestore = (saved, code) => ({ ok: false, error: {
  code,
  files: saved.preview.value.files.map((file) => file.action === "restore" ? { path: file.path, action: "restored" } : file)
} });
var FIBER_ACTIVE = 2;
function failure(code) {
  assertCode(code);
  return Object.freeze({ ok: false, error: Object.freeze({ code }) });
}
function guarded(read) {
  try {
    return { value: read() };
  } catch (error) {
    return { code: "internal", detail: describeError4(error) };
  }
}
function handOffPrompt(ctx, { agent, session, sessionId, resendMessageId, text }) {
  try {
    agent.followup({ role: "user", id: resendMessageId, content: [{ type: "text", text }], source: { kind: "user" } });
    if (agent.status === "running") {
      const accepted = acceptedPrompts.get(session) ?? /* @__PURE__ */ new Set();
      accepted.add(resendMessageId);
      acceptedPrompts.set(session, accepted);
      return true;
    }
    logWarning4(
      ctx,
      `the rewind of ${JSON.stringify(sessionId)} stands, but the agent did not take the prompt (status ${JSON.stringify(agent.status)}): the re-send is owed and the client offers it (spec \xA79.4)`
    );
  } catch (error) {
    logWarning4(ctx, `the re-send for ${JSON.stringify(sessionId)} could not be handed to the agent: ${describeError4(error)}`);
  }
  return false;
}
function rewindResult({ carrierSeq, shadowedSeqs, resendMessageId }) {
  const value = resendMessageId === void 0 ? { carrierSeq, shadowedSeqs } : { carrierSeq, shadowedSeqs, resendMessageId };
  return Object.freeze({ ok: true, value: Object.freeze(value) });
}
async function rewind(ctx, { session, agent, sessions, sessionId, request, replay }) {
  try {
    if (replay?.saved && replayPlans.get(ctx).get(replay.saved.id) !== replay.saved) return replayFailure("plan-not-found");
    const { op } = request;
    const surfaceRead = guarded(() => session.surface.nodes);
    if (surfaceRead.code !== void 0) {
      logWarning4(ctx, `resend.apply could not read the live surface of ${JSON.stringify(sessionId)}: ${surfaceRead.detail}`);
      return failure(surfaceRead.code);
    }
    const resolution = await resolveTarget(ctx, request, surfaceRead.value);
    if (!resolution.ok) {
      if (resolution.error.code === "internal") {
        logWarning4(ctx, `resend.apply could not resolve the request: ${resolution.error.detail ?? "no detail"}`);
      }
      return failure(resolution.error.code);
    }
    const plan = resolution.value;
    const pending = replay?.saved;
    if (pending && (pending.session !== session || pending.generation !== fileVersions.get(ctx).generation(sessionId) || pending.plan.endSeq !== plan.endSeq || pending.plan.resendText !== plan.resendText || JSON.stringify(pending.plan.shadowedSeqs) !== JSON.stringify(plan.shadowedSeqs))) return replayFailure("preview-stale");
    if (plan.kind === "resend-only") {
      if (agent.status !== "idle") {
        logWarning4(ctx, `the re-send for ${JSON.stringify(sessionId)} was asked for while a turn was open on it (spec \xA74.4 rule 4)`);
        return failure("agent-busy");
      }
      if (acceptedPrompts.get(session)?.has(plan.resendMessageId)) return failure("target-shadowed");
      const taken2 = handOffPrompt(ctx, { agent, session, sessionId, resendMessageId: plan.resendMessageId, text: plan.resendText });
      return rewindResult({
        carrierSeq: plan.carrierSeq,
        shadowedSeqs: plan.shadowedSeqs,
        resendMessageId: taken2 ? plan.resendMessageId : void 0
      });
    }
    if (replay?.phase === "start") {
      for (const [id, saved] of replayPlans.get(ctx)) {
        if (saved.session.id !== sessionId) continue;
        if (saved.generation === fileVersions.get(ctx).generation(sessionId)) {
          await saved.versions.rollback({ phase: "cancel", planId: saved.preview.value.planId });
        }
        await saved.versions.discardUnlessWritten();
        replayPlans.get(ctx).delete(id);
      }
    }
    if (agent.status !== "idle") {
      if (replay) return replayFailure("agent-busy");
      agent.cancel?.({ kind: "user" });
      await agent.whenIdle?.();
      if (agent.status !== "idle") {
        logWarning4(ctx, `resend.apply found a turn open on ${JSON.stringify(sessionId)} at the write boundary and it did not reach idle`);
        return failure("agent-busy");
      }
    }
    let carrierId = pending?.id ?? carrierIdFor(op, randomUUID7() + (op === "regenerate" ? "-target-" + request.targetSeq : "-prompt-sha256-" + editPromptDigest(plan.resendText)));
    const versions = pending?.versions ?? await fileVersions.get(ctx).prepare(session, plan, carrierId, replay ? request : void 0);
    carrierId = versions.carrierId;
    const resendMessageId = resendIdFor(carrierId);
    if (replay?.phase === "start") {
      const preview = await versions.preview();
      if (!preview.ok) {
        await versions.discardUnlessWritten();
        return preview;
      }
      if (preview.value.files.length > 0) {
        const saved = {
          id: carrierId,
          session,
          request: { ...request },
          plan,
          versions,
          preview,
          generation: fileVersions.get(ctx).generation(sessionId)
        };
        replayPlans.get(ctx).set(carrierId, saved);
        return replayPreview(saved);
      }
      await versions.rollback({ phase: "cancel", planId: preview.value.planId });
    } else if (pending) {
      if (replay.phase === "preview") {
        const preview = await versions.preview();
        if (!preview.ok) return preview;
        pending.preview = preview;
        return replayPreview(pending);
      }
      if (replay.phase === "restore" && !pending.restored) {
        const restored = await versions.rollback({
          phase: "execute",
          planId: pending.preview.value.planId,
          ...replay.selected === void 0 ? {} : { selected: replay.selected }
        });
        if (!restored.ok) return restored;
        pending.restored = true;
        pending.preview = { ok: true, value: { ...pending.preview.value, ...restored.value } };
      } else if (replay.phase === "keep" && !pending.restored) {
        const kept = await versions.rollback({ phase: "keep", planId: pending.preview.value.planId });
        if (!kept.ok && kept.error.code !== "plan-not-found") return kept;
        if (kept.ok && kept.value.completed) {
          pending.restored = true;
          pending.preview = { ok: true, value: { ...pending.preview.value, ...kept.value } };
        }
      }
      if (agent.status !== "idle") return pending.restored ? stoppedAfterRestore(pending, "agent-busy") : replayFailure("agent-busy");
      const current = await resolveTarget(ctx, request, session.surface.nodes);
      if (!current.ok || current.value.endSeq !== plan.endSeq || JSON.stringify(current.value.shadowedSeqs) !== JSON.stringify(plan.shadowedSeqs)) return pending.restored ? stoppedAfterRestore(pending, "preview-stale") : replayFailure("preview-stale");
    }
    if (replay && agent.status !== "idle") return replayFailure("agent-busy");
    let write;
    try {
      write = await writeRewindPair(ctx, {
        sessions,
        session,
        sessionId,
        plan,
        carrierId,
        traceText: traceTextNow(ctx),
        request
      });
    } catch (error) {
      if (!pending) await versions.discardUnlessWritten();
      throw error;
    }
    if (!write.ok) {
      if (!pending) await versions.discardUnlessWritten();
      if (write.error.code === "internal") {
        logWarning4(ctx, `resend.apply could not write the rewind pair for ${JSON.stringify(sessionId)}: ${write.error.detail ?? "no detail"}`);
      }
      return pending?.restored ? stoppedAfterRestore(pending, "rewind-failed") : failure(write.error.code);
    }
    if (pending) replayPlans.get(ctx).delete(pending.id);
    const taken = handOffPrompt(ctx, { agent, session, sessionId, resendMessageId, text: plan.resendText });
    return rewindResult({
      carrierSeq: write.value.carrierSeq,
      shadowedSeqs: write.value.shadowedSeqs,
      resendMessageId: taken ? resendMessageId : void 0
    });
  } catch (error) {
    logWarning4(ctx, `resend.apply failed unexpectedly while rewinding ${JSON.stringify(sessionId)}: ${describeError4(error)}`);
    return replay?.saved?.restored ? stoppedAfterRestore(replay.saved, "rewind-failed") : failure("internal");
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
    const pending = /* @__PURE__ */ new Map();
    replayPlans.set(ctx, pending);
    ctx.on("session/disposed", (session) => {
      for (const [id, saved] of pending) if (saved.session.id === session.id) pending.delete(id);
    });
    ctx.effect(() => () => {
      pending.clear();
    });
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
  async apply(request, replay) {
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
    const sessions = hostService5(ctx, "sessions");
    if (sessions === void 0) return failure("internal");
    const sessionRead = guarded(() => sessions.get(sessionId));
    if (sessionRead.code !== void 0) {
      logWarning4(ctx, `resend.apply could not read sessions.get(${JSON.stringify(sessionId)}): ${sessionRead.detail}`);
      return failure(sessionRead.code);
    }
    const session = sessionRead.value;
    if (session === void 0) return failure("session-not-found");
    const agents = hostService5(ctx, "agents");
    if (agents === void 0) return failure("internal");
    const agentRead = guarded(() => agents.get(sessionId));
    if (agentRead.code !== void 0) {
      logWarning4(ctx, `resend.apply could not read agents.get(${JSON.stringify(sessionId)}): ${agentRead.detail}`);
      return failure(agentRead.code);
    }
    const agent = agentRead.value;
    if (agent === void 0) return failure("agent-unavailable");
    if (agent.status !== "idle") return failure("agent-busy");
    return fileVersions.get(ctx).withOperation(sessionId, "editing", () => withSessionLock(sessionId, () => rewind(ctx, { session, agent, sessions, sessionId, request, replay })));
  }
  /** Preflight choices are host-owned; clients cannot replace their prompt or range. */
  async replay(request) {
    if (this.ownerFiber !== void 0 && this.ownerFiber.state !== FIBER_ACTIVE) return replayFailure("internal");
    if (request?.phase === "start") return this.apply(request.request, { phase: "start" });
    if (!["preview", "restore", "keep", "cancel"].includes(request?.phase)) return replayFailure("bad-request");
    const ctx = this.hostCtx;
    const saved = replayPlans.get(ctx).get(request.preflightId);
    if (!saved || saved.session.id !== request.sessionId) return replayFailure("plan-not-found");
    if (request.phase === "cancel") return fileVersions.get(ctx).withOperation(request.sessionId, "editing", () => withSessionLock(request.sessionId, async () => {
      if (replayPlans.get(ctx).get(saved.id) !== saved) return replayFailure("plan-not-found");
      replayPlans.get(ctx).delete(saved.id);
      if (saved.generation === fileVersions.get(ctx).generation(request.sessionId)) {
        await saved.versions.rollback({ phase: "cancel", planId: saved.preview.value.planId });
      }
      await saved.versions.discardUnlessWritten();
      return { ok: true, value: { canceled: true } };
    }));
    return this.apply(saved.request, { phase: request.phase, saved, selected: request.selected });
  }
  async rollback(request) {
    if (this.ownerFiber !== void 0 && this.ownerFiber.state !== FIBER_ACTIVE) return failure("internal");
    return fileVersions.get(this.hostCtx).withOperation(request.sessionId, "rolling-back", () => withSessionLock(request.sessionId, () => fileVersions.get(this.hostCtx).rollback(request)));
  }
  async content(request) {
    if (this.ownerFiber !== void 0 && this.ownerFiber.state !== FIBER_ACTIVE) return replayFailure("plan-not-found");
    const ctx = this.hostCtx;
    return fileVersions.get(ctx).withOperation(request.sessionId, "rolling-back", () => withSessionLock(request.sessionId, async () => {
      if (request.source === "history") return fileVersions.get(ctx).content(request);
      const saved = replayPlans.get(ctx).get(request.preflightId);
      if (!saved || saved.session.id !== request.sessionId || saved.preview.value.planId !== request.planId || saved.generation !== fileVersions.get(ctx).generation(request.sessionId)) return replayFailure("plan-not-found");
      const resolution = await resolveTarget(ctx, saved.request, saved.session.surface.nodes);
      if (!resolution.ok || resolution.value.endSeq !== saved.plan.endSeq || JSON.stringify(resolution.value.shadowedSeqs) !== JSON.stringify(saved.plan.shadowedSeqs)) return replayFailure("preview-stale");
      return saved.versions.content(request);
    }));
  }
  async cleanup(request) {
    if (this.ownerFiber !== void 0 && this.ownerFiber.state !== FIBER_ACTIVE) return failure("internal");
    return fileVersions.get(this.hostCtx).cleanup(request);
  }
  /** Read-only eligibility shared by every reply control on the client. */
  async conversation(request) {
    if (this.ownerFiber !== void 0 && this.ownerFiber.state !== FIBER_ACTIVE) return failure("internal");
    if (typeof request?.sessionId !== "string" || request.sessionId === "") return failure("bad-request");
    const ctx = this.hostCtx;
    try {
      const session = hostService5(ctx, "sessions")?.get(request.sessionId);
      if (session === void 0) return failure("session-not-found");
      return await withSessionLock(request.sessionId, async () => {
        const result = await effectiveConversationEligibility(ctx, session);
        return result.ok ? result : failure(result.error.code);
      });
    } catch (error) {
      logWarning4(ctx, `resend.conversation failed: ${describeError4(error)}`);
      return failure("internal");
    }
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
import Schema from "@deepseek-ai/schemastery";
var Config = Schema.object({
  inlineEditorBeneathMessage: Schema.boolean().default(true).volatile(),
  regenerateLastReply: Schema.boolean().default(true).volatile(),
  restrictRegenerateToLastReply: Schema.boolean().default(false).volatile(),
  restrictEditToLastUserMessage: Schema.boolean().default(false).volatile()
});
var validateConfig = Config["~standard"].validate;
Object.defineProperty(Config, "~standard", { value: {
  ...Config["~standard"],
  validate(raw) {
    const values = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
    for (const field of Object.keys(Config.dict)) {
      if (typeof values[field] !== "boolean") values[field] = Config.dict[field].meta.default;
    }
    return validateConfig(values);
  }
} });
var name = "dsh-resend";
var inject = ["sessions", "agents", "sessionQuery", "sessionPersistence", "tokenMeter", "typert"];
function apply(ctx) {
  ctx.inject(["settings"], (scope) => {
    scope.effect(() => scope.settings.configure({ auto: false }, ctx.fiber));
  });
  new ResendService(ctx);
  ctx.typert.register(TYPERT);
  const endpoints = ctx.typert.local.list().filter((descriptor) => descriptor.service === SERVICE).map(endpointOf);
  ctx.root.logger?.("dsh-resend")?.info(
    `dsh-resend host half loaded \u2014 Remote endpoints registered: ${endpoints.join(", ") || "none"}. ${ENDPOINT} resolves its target, its range and its resend text from a covering log read, then writes the rewind as one pair \u2014 the audit claim (compaction/prune) and its carrier (user/message) \u2014 validated together before either append and flushed once. The resend itself is ticket 05.`
  );
}
export {
  Config,
  apply,
  inject,
  name
};
