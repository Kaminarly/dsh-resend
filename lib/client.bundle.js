/* GENERATED FILE — do not edit by hand; built from src/client.js by scripts/build.mjs */
window.__ModuleLoader__.load({
	id: "dsh-resend",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  ASSISTANT_ACTIONS_DEFINITION: () => ASSISTANT_ACTIONS_DEFINITION,
  ASSISTANT_ACTIONS_ID: () => ASSISTANT_ACTIONS_ID,
  ASSISTANT_ACTIONS_KIND: () => ASSISTANT_ACTIONS_KIND,
  FileRollbackPreview: () => FileRollbackPreview,
  HideRulesSurface: () => HideRulesSurface,
  InlineEditorSurface: () => InlineEditorSurface,
  REWIND_ROW_DEFINITION: () => REWIND_ROW_DEFINITION,
  REWIND_ROW_KIND: () => REWIND_ROW_KIND,
  RegenerateControl: () => RegenerateControl,
  RewindRow: () => RewindRow,
  SETTINGS_ROW_ID: () => SETTINGS_ROW_ID,
  SURFACE_SHADOW_DEFINITION: () => SURFACE_SHADOW_DEFINITION,
  SettingsRow: () => SettingsRow,
  TYPERT_REMOTE: () => TYPERT_REMOTE,
  USER_ACTIONS_DEFINITION: () => USER_ACTIONS_DEFINITION,
  USER_ACTIONS_KIND: () => USER_ACTIONS_KIND,
  UserActionsRow: () => UserActionsRow,
  apply: () => apply,
  companionStates: () => companionStates,
  createPreferences: () => createPreferences,
  createResendOperations: () => createResendOperations,
  hiddenKeysFor: () => hiddenKeysFor,
  hidePlanFor: () => hidePlanFor,
  hideRulesFor: () => hideRulesFor,
  inject: () => inject,
  isLastReply: () => isLastReply,
  name: () => name,
  preferences: () => preferences,
  promptRefusal: () => promptRefusal,
  regenerateReason: () => regenerateReason,
  regenerateSurface: () => regenerateSurface,
  remoteMountState: () => remoteMountState,
  rewindPointView: () => rewindPointView,
  rewindRowSurface: () => rewindRowSurface,
  settingsSurface: () => settingsSurface,
  userActionsSurface: () => userActionsSurface,
  userMessageText: () => userMessageText,
  withPanelBoundary: () => withPanelBoundary
});
module.exports = __toCommonJS(client_exports);

// src/panel-boundary.js
var import_react = require("react");

// node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
var Cached = class {
  constructor(getter) {
    this._getter = getter;
    this._value = void 0;
  }
  get value() {
    const getter = this._getter;
    if (getter !== void 0) {
      this._value = getter();
      this._getter = void 0;
    }
    return this._value;
  }
};
function cached(getter) {
  return new Cached(getter);
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
  });
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function attachSchema(issues, start, inst) {
  var _a2;
  for (let i = start; i < issues.length; i++) {
    (_a2 = issues[i]).schema ?? (_a2.schema = inst);
  }
}
function finalizeIssue(iss, ctx, config2) {
  var _a2;
  const traits = iss.inst?._zod?.traits;
  if (traits?.has("$ZodType")) {
    if (traits.has("$ZodCheck"))
      (_a2 = iss).schema ?? (_a2.schema = iss.inst);
    else
      iss.schema = iss.inst;
  }
  const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const full = {};
  for (const k of Object.keys(iss)) {
    if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__")
      continue;
    full[k] = iss[k];
  }
  full.path ?? (full.path = []);
  full.message = message;
  if (ctx?.reportInput) {
    full.input = iss.input;
  }
  return full;
}
function members(proto, table) {
  for (const key in table) {
    const desc = Object.getOwnPropertyDescriptor(table, key);
    if (desc.get)
      Object.defineProperty(proto, key, { ...desc, enumerable: false });
    else
      defineBound(proto, key, desc.value);
  }
}
function own(inst, key, value, enumerable = true) {
  Object.defineProperty(inst, key, { configurable: true, writable: true, enumerable, value });
  return value;
}
function hide(inst, key, value) {
  return own(inst, key, value, false);
}
function defineBound(proto, key, fn) {
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      return this == null ? fn : own(this, key, fn.bind(this));
    },
    set(value) {
      own(this, key, value);
    }
  });
}
function claim(inst, sentinel) {
  const proto = Object.getPrototypeOf(inst);
  return sentinel in proto ? void 0 : proto;
}
var installing;
var broke = false;
var breaker = {
  configurable: true,
  get() {
    broke = true;
    return void 0;
  }
};
function defineLazyInternal(inst, key, compute) {
  const proto = Object.getPrototypeOf(inst._zod);
  if (key in proto && installing !== inst._zod) {
    installing = void 0;
    return;
  }
  installing = inst._zod;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      Object.defineProperty(this, key, breaker);
      const outer = broke;
      broke = false;
      try {
        const value = compute(this);
        if (broke)
          delete this[key];
        else
          Object.defineProperty(this, key, { configurable: true, writable: true, value });
        broke = broke || outer;
        return value;
      } catch (err) {
        delete this[key];
        broke = broke || outer;
        throw err;
      }
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, value });
    }
  });
}
function installLazyProp(inst, key, make, enumerable) {
  const proto = claim(inst, key);
  if (!proto)
    return;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      const desc = { configurable: true, writable: true, enumerable, value: void 0 };
      Object.defineProperty(this, key, desc);
      desc.value = make(this);
      Object.defineProperty(this, key, desc);
      return desc.value;
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, enumerable, value });
    }
  });
}

// node_modules/zod/v4/core/core.js
var _a;
var _zodDesc = { value: void 0, enumerable: false };
var _E = "captureStackTrace" in Error ? Error : null;
function newError(Definition) {
  const E = _E;
  if (E) {
    const saved = E.stackTraceLimit;
    if (typeof saved === "number") {
      try {
        E.stackTraceLimit = 0;
      } catch {
        _E = null;
        return new Definition();
      }
      try {
        return new Definition();
      } finally {
        E.stackTraceLimit = saved;
      }
    }
  }
  return new Definition();
}
// @__NO_SIDE_EFFECTS__
function $constructor(name2, initializer2, proto, params) {
  const zodProto = {};
  function Internals(def) {
    this.def = def;
    this.constr = _;
    this.traits = /* @__PURE__ */ new Set();
  }
  Internals.prototype = zodProto;
  const protoMembers = proto;
  const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
  function init(inst, def) {
    if (!inst._zod) {
      _zodDesc.value = new Internals(def);
      try {
        Object.defineProperty(inst, "_zod", _zodDesc);
      } finally {
        _zodDesc.value = void 0;
      }
    } else if (inst._zod.traits.has(name2)) {
      return;
    }
    inst._zod.traits.add(name2);
    initializer2(inst, def);
    if (initialized) {
      const own2 = Object.getPrototypeOf(inst);
      const ctorProto = inst._zod.constr.prototype;
      let up = own2;
      while (up && up !== ctorProto)
        up = Object.getPrototypeOf(up);
      const target = up ?? own2;
      if (!initialized.has(target)) {
        initialized.add(target);
        members(target, protoMembers);
      }
    }
    const proto2 = _.prototype;
    for (const k in proto2) {
      if (!Object.prototype.hasOwnProperty.call(proto2, k))
        continue;
      if (!(k in inst)) {
        inst[k] = proto2[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name2 });
  function _(def) {
    const inst = params?.Parent ? newError(Definition) : this;
    init(inst, def);
    const deferred = inst._zod.deferred;
    if (deferred) {
      for (const fn of deferred) {
        fn();
      }
      inst._zod.deferred = void 0;
    }
    const pp = globalThis.__zod_globalConfig?.postProcessor;
    if (pp)
      pp(inst);
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name2);
    }
  });
  Object.defineProperty(_, "name", { value: name2 });
  return _;
}
var $ZodAsyncError = class extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
};
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// node_modules/zod/v4/core/errors.js
function _getMessage() {
  const internals = this._zod;
  internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
  return internals.message;
}
function _setMessage(value) {
  this._zod.message = value;
}
var _messageDesc = {
  get: _getMessage,
  set: _setMessage,
  enumerable: true,
  configurable: true
};
var _issuesDesc = { value: void 0, enumerable: false };
var _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  _issuesDesc.value = def;
  Object.defineProperty(inst, "issues", _issuesDesc);
  _issuesDesc.value = void 0;
  Object.defineProperty(inst, "message", _messageDesc);
  const proto = Object.getPrototypeOf(inst);
  if (!_installedToString.has(proto)) {
    _installedToString.add(proto);
    Object.defineProperty(proto, "toString", {
      configurable: true,
      enumerable: false,
      get() {
        const value = () => this.message;
        Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
        return value;
      },
      set(value) {
        Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
      }
    });
  }
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, void 0, {
  Parent: Error
});

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => {
  const fn = (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    if (result.issues.length) {
      const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => {
  const fn = async (schema, value, _ctx, params) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    if (result.issues.length) {
      const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
function failure(Err, issues, ctx) {
  let error;
  return {
    success: false,
    get error() {
      if (!error) {
        error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
        issues = void 0;
        ctx = void 0;
      }
      return error;
    },
    set error(e) {
      error = e;
      issues = void 0;
      ctx = void 0;
    }
  };
}
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);

// node_modules/zod/v4/core/regexes.js
var anyString = /^[\s\S]{0,}$/;
var number = /^-?\d+(?:\.\d+)?$/;

// node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 6,
  patch: 5
};

// node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a2;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const defChecks = inst._zod.def.checks;
  const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      if (payload.memo)
        return payload;
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            attachSchema(payload.issues, currLen, inst);
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          attachSchema(payload.issues, currLen, inst);
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
}, {
  // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
  get "~standard"() {
    return hide(this, "~standard", standardProps(this));
  },
  set "~standard"(value) {
    own(this, "~standard", value);
  }
});
var toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
async function validateAsync(inst, value) {
  const ctx = { async: true };
  return toStandardResult(await inst._zod.run({ value, issues: [] }, ctx), ctx);
}
function standardProps(inst) {
  return {
    validate: (value) => {
      const ctx = { async: false };
      try {
        const r = inst._zod.run({ value, issues: [] }, ctx);
        if (!(r instanceof Promise))
          return toStandardResult(r, ctx);
      } catch (_) {
      }
      return validateAsync(inst, value);
    },
    vendor: "zod",
    version: 1
  };
}
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = def.pattern ?? anyString;
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  const memo = globalConfig.memoizer;
  memo?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
    const proms = [];
    const abortEarly = ctx?.abortEarly;
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
        if (abortEarly && result.issues.length !== 0 && aborted(result))
          break;
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, optin, optout) {
  const isPresent = key in input;
  const isOptionalOut = optout === "optional";
  if (!isPresent && isOptionalOut && optin === "optional") {
    return;
  }
  if (result.issues.length) {
    if (optin !== void 0 && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && optin === void 0) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent || optin === "defaulted" && !isOptionalOut) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
var NO_SYMBOL_KEYS = [];
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  const ownSymbols = Object.getOwnPropertySymbols(def.shape);
  const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
  const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
  for (const k of allKeys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    allKeys,
    symbolKeys,
    // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const optin = _catchall.optin;
  const optout = _catchall.optout;
  let seen = 0;
  for (const key in input) {
    if (abortEarly && payload.issues.length !== seen) {
      if (aborted(payload, seen))
        break;
      seen = payload.issues.length;
    }
    if (keySet.has(key))
      continue;
    if (key === "__proto__") {
      if (t === "never")
        unrecognized.push(key);
      continue;
    }
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
    } else {
      handlePropertyResult(r, payload, key, input, optin, optout);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst,
      // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
      continue: true
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  const sh = desc?.get ? desc.get.raw : def.shape ?? {};
  if (sh) {
    const get = () => {
      const newSh = { ...sh };
      Object.defineProperty(def, "shape", { value: newSh });
      get.raw = newSh;
      return newSh;
    };
    get.raw = sh;
    Object.defineProperty(def, "shape", { get });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazyInternal(inst, "propValues", (zod) => {
    const shape = zod.def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        if (!Object.prototype.hasOwnProperty.call(propValues, key)) {
          assignProp(propValues, key, /* @__PURE__ */ new Set());
        }
        for (const v of field.values)
          propValues[key].add(v);
        if (field.optin !== void 0)
          propValues[key].add(void 0);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  const memo = globalConfig.memoizer;
  memo?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
    const proms = [];
    const shape = value.shape;
    const abortEarly = ctx?.abortEarly;
    let seen = payload.issues.length;
    for (const key of value.allKeys) {
      if (abortEarly && payload.issues.length !== seen) {
        if (aborted(payload, seen))
          break;
        seen = payload.issues.length;
      }
      if (key === "__proto__")
        continue;
      const el = shape[key];
      const optin = el._zod.optin;
      const optout = el._zod.optout;
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
      } else {
        handlePropertyResult(r, payload, key, input, optin, optout);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
  defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazyInternal(inst, "values", (zod) => {
    if (zod.def.options.every((o) => o._zod.values)) {
      return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazyInternal(inst, "pattern", (zod) => {
    if (zod.def.options.every((o) => o._zod.pattern)) {
      const patterns = zod.def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  defineLazyInternal(inst, "pattern", (zod) => {
    const patternValues = getEnumValues(zod.def.entries).filter((k) => propertyKeyTypes.has(typeof k));
    return new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
  });
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  const values = new Set(def.values);
  inst._zod.values = values;
  defineLazyInternal(inst, "pattern", (zod) => {
    const vals = zod.def.values;
    return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
  });
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
function handleOptionalResult(payload, result) {
  payload.value = result.issues.length ? void 0 : result.value;
  return payload;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
  inst._zod.optout = "optional";
  defineLazyInternal(inst, "values", (zod) => {
    const values = zod.def.innerType._zod.values;
    return values ? /* @__PURE__ */ new Set([...values, void 0]) : void 0;
  });
  defineLazyInternal(inst, "pattern", (zod) => {
    const pattern = zod.def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === void 0) {
      if (def.innerType._zod.optin !== "defaulted")
        return payload;
      const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
      if (result instanceof Promise)
        return result.then((result2) => handleOptionalResult(payload, result2));
      return handleOptionalResult(payload, result);
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
  defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  if (!payload.memo)
    payload.value = Object.freeze(payload.value);
  return payload;
}

// node_modules/zod/v4/core/api.js
function snapshotChecks(def) {
  if (def.checks)
    def.checks = [...def.checks];
  return def;
}
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class(snapshotChecks({ type: "string", ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class(snapshotChecks({ type: "number", checks: [], ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}

// node_modules/zod/v4/mini/schemas.js
var ZodMiniType = /* @__PURE__ */ $constructor("ZodMiniType", (inst, def) => {
  if (!inst._zod)
    throw new Error("Uninitialized schema in ZodMiniType.");
  $ZodType.init(inst, def);
  inst.def = def;
  inst.type = def.type;
}, {
  // `with` is an alias for `check`: the same function object, not a wrapper.
  get with() {
    return this.check;
  },
  set with(value) {
    own(this, "with", value);
  },
  parse(data, params) {
    return parse(this, data, params, { callee: this.parse });
  },
  parseAsync(data, params) {
    return parseAsync(this, data, params, { callee: this.parseAsync });
  },
  safeParse(data, params) {
    return safeParse(this, data, params);
  },
  safeParseAsync(data, params) {
    return safeParseAsync(this, data, params);
  },
  check(...checks) {
    const def = this.def;
    return this.clone({
      ...def,
      checks: [
        ...def.checks ?? [],
        ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }, { parent: true });
  },
  clone(_def, params) {
    return clone(this, _def, params);
  },
  brand() {
    return this;
  },
  register(reg, meta2) {
    reg.add(this, meta2);
    return this;
  },
  apply(fn, ...args) {
    return args.length === 0 ? fn(this) : fn(this, ...args);
  }
});
var ZodMiniString = /* @__PURE__ */ $constructor("ZodMiniString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function string2(params) {
  return _string(ZodMiniString, params);
}
var ZodMiniNumber = /* @__PURE__ */ $constructor("ZodMiniNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function number2(params) {
  return _number(ZodMiniNumber, params);
}
var ZodMiniNever = /* @__PURE__ */ $constructor("ZodMiniNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function never(params) {
  return _never(ZodMiniNever, params);
}
var ZodMiniArray = /* @__PURE__ */ $constructor("ZodMiniArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function array(element, params) {
  return new ZodMiniArray({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
var ZodMiniObject = /* @__PURE__ */ $constructor("ZodMiniObject", (inst, def) => {
  $ZodObject.init(inst, def);
  ZodMiniType.init(inst, def);
  installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
});
// @__NO_SIDE_EFFECTS__
function strictObject(shape, params) {
  return new ZodMiniObject({
    type: "object",
    shape,
    catchall: /* @__PURE__ */ never(),
    ...normalizeParams(params)
  });
}
var ZodMiniUnion = /* @__PURE__ */ $constructor("ZodMiniUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function union(options, params) {
  return new ZodMiniUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
var ZodMiniEnum = /* @__PURE__ */ $constructor("ZodMiniEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodMiniType.init(inst, def);
  inst.options = [...inst._zod.values];
});
// @__NO_SIDE_EFFECTS__
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodMiniEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
var ZodMiniLiteral = /* @__PURE__ */ $constructor("ZodMiniLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function literal(value, params) {
  return new ZodMiniLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
var ZodMiniOptional = /* @__PURE__ */ $constructor("ZodMiniOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function optional(innerType) {
  return new ZodMiniOptional({
    type: "optional",
    innerType
  });
}
var ZodMiniReadonly = /* @__PURE__ */ $constructor("ZodMiniReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function readonly(innerType) {
  return new ZodMiniReadonly({
    type: "readonly",
    innerType
  });
}

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

// src/typert.js
var PACKAGE = "dsh-resend";
var SERVICE = "resend";
var NAMESPACE = "resend";
var METHOD = "apply";
var endpointOf = (descriptor) => `${descriptor.namespace}/${descriptor.method}`;
var ENDPOINT = endpointOf({ namespace: NAMESPACE, method: METHOD });
var INVOCATION_ID = `${PACKAGE}#${ENDPOINT}`;
var requestSchema;
function resendApplyRequestSchema() {
  return requestSchema ??= strictObject({
    sessionId: readonly(string2()),
    targetSeq: readonly(number2()),
    op: readonly(_enum(["edit", "regenerate"])),
    text: optional(readonly(string2()))
  });
}
var resultSchema;
function resendApplyResultSchema() {
  return resultSchema ??= union([
    strictObject({
      ok: readonly(literal(true)),
      value: readonly(strictObject({
        carrierSeq: readonly(number2()),
        shadowedSeqs: readonly(array(number2())),
        resendMessageId: optional(readonly(string2()))
      }))
    }),
    strictObject({
      ok: readonly(literal(false)),
      error: readonly(union(ERROR_CODES.map((code) => strictObject({ code: readonly(literal(code)) }))))
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
  return strictObject({
    sessionId: string2(),
    carrierSeq: number2(),
    phase: _enum(["preview", "execute", "cancel"]),
    scope: optional(_enum(["conversation", "artifacts", "both"])),
    planId: optional(string2())
  });
}
var rollbackConversationSchema = () => strictObject({
  action: _enum(["rewind", "rewound", "unchanged"]),
  count: number2(),
  carrierSeq: optional(number2()),
  shadowedSeqs: optional(array(number2()))
});
function rollbackResultSchema() {
  return union([
    strictObject({ ok: literal(false), error: strictObject({
      code: string2(),
      files: optional(array(strictObject({ path: string2(), action: _enum(["restored", "refuse"]), reason: optional(string2()) }))),
      conversation: optional(rollbackConversationSchema())
    }) }),
    strictObject({ ok: literal(true), value: strictObject({
      planId: string2(),
      scope: optional(_enum(["conversation", "artifacts", "both"])),
      conversation: optional(rollbackConversationSchema()),
      files: array(strictObject({ path: string2(), action: _enum(["restore", "refuse"]), reason: optional(string2()) }))
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

// src/panel-boundary.js
var translatorOrKey = (t) => typeof t === "function" ? t : (key) => key;
var PanelBoundary = class extends import_react.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  /**
   * React's error-boundary hook: the first thrown value becomes this surface's
   * state, and the surface renders its own failure row instead of unmounting the
   * host's tree.
   */
  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
  /** Report the failure on the only channel a browser half has. */
  componentDidCatch(error) {
    const message = error instanceof Error ? error.message : String(error);
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(`[${PACKAGE}] a registered surface failed to render: ${message}`);
    }
  }
  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    const t = translatorOrKey(this.props.t);
    const title = typeof this.props.title === "string" && this.props.title !== "" ? this.props.title : t("panel.errorTitle");
    return (0, import_react.createElement)("div", { className: "dsh-resend-panel-error", role: "alert" }, [
      (0, import_react.createElement)("div", { key: "title", className: "dsh-resend-panel-error-title" }, title),
      (0, import_react.createElement)("div", { key: "hint", className: "dsh-resend-panel-error-hint" }, t("panel.errorHint")),
      (0, import_react.createElement)("pre", { key: "detail", className: "dsh-resend-panel-error-detail" }, String(error.message ?? error)),
      (0, import_react.createElement)(
        "button",
        {
          key: "retry",
          type: "button",
          className: "dsh-resend-chip",
          onClick: () => this.setState({ error: null })
        },
        t("panel.retry")
      )
    ]);
  }
};
function withPanelBoundary(Surface, titleKey, baseTranslate) {
  return function Panel({ t, ...props }) {
    const translate = translatorOrKey(t ?? baseTranslate);
    return (0, import_react.createElement)(
      PanelBoundary,
      { t: translate, title: translate(titleKey) },
      (0, import_react.createElement)(Surface, { t: translate, ...props })
    );
  };
}

// src/preferences.js
var import_react2 = require("react");
var PREFERENCE_FIELDS = Object.freeze([
  "hideReplacedMessages",
  "inlineEditorBeneathMessage",
  "regenerateLastReply"
]);
var DEFAULTS = Object.freeze({
  hideReplacedMessages: true,
  inlineEditorBeneathMessage: true,
  regenerateLastReply: true
});
function createPreferences() {
  let listeners = /* @__PURE__ */ new Set();
  let snapshot = DEFAULTS;
  function subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
  function getSnapshot() {
    return snapshot;
  }
  function set(field, value) {
    if (!PREFERENCE_FIELDS.includes(field)) throw new Error("unknown preference " + field);
    if (typeof value !== "boolean") throw new Error("preference " + field + " must be a boolean");
    if (snapshot[field] === value) return;
    snapshot = Object.freeze({ ...snapshot, [field]: value });
    for (const listener of [...listeners]) listener();
  }
  return Object.freeze({
    fields: PREFERENCE_FIELDS,
    subscribe,
    getSnapshot,
    set
  });
}
function usePreferences(store) {
  return (0, import_react2.useSyncExternalStore)(store.subscribe, store.getSnapshot);
}

// src/resend-operations.js
var RESEND_FAILED = "resend-failed";
function createResendOperations(remote) {
  const bySession = /* @__PURE__ */ new Map();
  const recordsBySession = /* @__PURE__ */ new Map();
  const emptyRecords = Object.freeze([]);
  const listeners = /* @__PURE__ */ new Set();
  const notify = () => {
    for (const listener of Array.from(listeners)) listener();
  };
  const outcomeOf = ({ sessionId, carrierSeq }) => bySession.get(sessionId)?.get(carrierSeq);
  function record(request, result) {
    if (result?.ok !== true) return;
    const { carrierSeq, shadowedSeqs, resendMessageId } = result.value;
    const records = bySession.get(request.sessionId) ?? /* @__PURE__ */ new Map();
    bySession.set(request.sessionId, records);
    records.set(
      carrierSeq,
      Object.freeze({
        // The request as it was SENT, copied: "Send again" must replay the values
        // this call used, not whatever the caller's object happens to hold later.
        request: Object.freeze({ ...request }),
        carrierSeq,
        shadowedSeqs: Object.freeze([...shadowedSeqs]),
        status: resendMessageId === void 0 ? RESEND_FAILED : "queued"
      })
    );
    recordsBySession.set(request.sessionId, Object.freeze([...records.values()]));
    notify();
  }
  async function run(request) {
    const result = await remote.resend.apply(request);
    record(request, result);
    return result;
  }
  return {
    run,
    rollback: (request) => remote.resend.rollback(request),
    outcomeOf,
    recordsFor: (sessionId) => recordsBySession.get(sessionId) ?? emptyRecords,
    /**
     * "Send again" (spec §9.4): replay the SAME request, so the host re-sends the
     * prompt and performs no second rewind. A point with no record has nothing to
     * replay, and says so by answering `undefined` rather than inventing one.
     * @param point - `{ sessionId, carrierSeq }`.
     * @returns the host's `RemoteResult`, or `undefined` when there is nothing to
     *   replay.
     */
    async sendAgain(point) {
      const entry = outcomeOf(point);
      if (entry === void 0) return void 0;
      return run(entry.request);
    },
    /**
     * Subscribe to outcome changes.
     * @param listener - called whenever a record is added or replaced.
     * @returns the unsubscriber.
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Drop this page's records and listeners when the plugin unloads. */
    dispose() {
      bySession.clear();
      recordsBySession.clear();
      listeners.clear();
    }
  };
}

// src/regenerate.js
var import_react4 = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/use-hiding.js
var import_react3 = require("react");

// src/hide-plan.js
var indexes = /* @__PURE__ */ new WeakMap();
var plans = /* @__PURE__ */ new WeakMap();
function chatNodes(snapshot) {
  if (typeof snapshot?.nodes?.values !== "function") throw new Error("the Chat snapshot has no readable node store");
  return snapshot.nodes.values();
}
function affectedSeq(node) {
  if (node.kind === "dsh-resend-user-actions") return node.data.seq;
  if (node.kind === "turn-tail") return node.data?.closing?.finalNode?.seq;
  if (node.kind === "tool-call") return node.data?.root?.seq;
  return node.anchorSeq;
}
function indexFor(snapshot, grouped) {
  const cache = indexes.get(snapshot);
  if (cache !== void 0 && cache.grouped === grouped) return cache.index;
  const bySeq = /* @__PURE__ */ new Map();
  const carriers = /* @__PURE__ */ new Map();
  const modelShadowed = /* @__PURE__ */ new Set();
  const userSeqs = /* @__PURE__ */ new Set();
  const rendered = /* @__PURE__ */ new Map();
  if (grouped !== void 0) {
    for (const entry of grouped.entries) {
      const members2 = entry.kind === "group" ? grouped.groupSource(entry.key)?.getSnapshot()?.members : [entry];
      if (!Array.isArray(members2)) throw new Error("Chat group " + entry.key + " has no readable members");
      for (const member of members2) {
        const key = member.groupPart === void 0 || member.groupPart === "response" ? member.key : JSON.stringify([member.key, member.groupPart]);
        const keys = rendered.get(member.key) ?? [];
        keys.push(key);
        rendered.set(member.key, keys);
      }
    }
  }
  for (const node of chatNodes(snapshot)) {
    if (node.kind === "dsh-resend-error") carriers.set(node.data.carrierSeq, node.data);
    if (node.kind === "dsh-resend-surface-shadow") {
      for (const seq2 of node.data.shadowedSeqs) modelShadowed.add(seq2);
    }
    if (node.kind === "user") userSeqs.add(node.data?.seq ?? node.anchorSeq);
    if (node.visibility === "hidden") continue;
    const seq = affectedSeq(node);
    if (typeof seq !== "number" || !Number.isFinite(seq)) continue;
    const flowKeys = grouped === void 0 ? [node.flowKey ?? node.key] : rendered.get(node.key) ?? [];
    if (flowKeys.some((key) => typeof key !== "string" || key === "")) throw new Error("Chat node at seq " + seq + " has no stable flow key");
    const keys = bySeq.get(Math.ceil(seq)) ?? [];
    keys.push(...flowKeys);
    bySeq.set(Math.ceil(seq), keys);
  }
  const index = { bySeq, carriers, modelShadowed, userSeqs };
  indexes.set(snapshot, { grouped, index });
  return index;
}
function planForSeqs(shadowedSeqs, index) {
  if (!Array.isArray(shadowedSeqs) || shadowedSeqs.length === 0 || shadowedSeqs.some((seq) => !Number.isSafeInteger(seq) || seq < 0)) {
    throw new Error("the rewind has no valid shadowedSeqs from Remote or carrier provenance");
  }
  const keys = /* @__PURE__ */ new Set();
  for (const seq of shadowedSeqs) {
    for (const key of index.bySeq.get(seq) ?? []) keys.add(key);
  }
  return Object.freeze({ keys: Object.freeze([...keys]), count: keys.size, has: (key) => keys.has(key) });
}
function hiddenKeysFor(shadowedSeqs, nodes) {
  return planForSeqs(shadowedSeqs, indexFor({ nodes }, void 0));
}
function hidePlanFor(snapshot, records, grouped) {
  if (snapshot === void 0 || snapshot === null) throw new Error("the Chat snapshot is unavailable");
  const previous = plans.get(snapshot);
  if (previous?.records === records && previous.grouped === grouped) return previous.plan;
  const index = indexFor(snapshot, grouped);
  const points = new Map(index.carriers);
  for (const record of records) points.set(record.carrierSeq, record);
  const byCarrier = /* @__PURE__ */ new Map();
  const hiddenSeqs = new Set(index.modelShadowed);
  const allKeys = /* @__PURE__ */ new Set();
  const errors = /* @__PURE__ */ new Map();
  for (const [carrierSeq, point] of points) {
    try {
      const plan2 = planForSeqs(point.shadowedSeqs, index);
      byCarrier.set(carrierSeq, plan2);
      for (const seq of point.shadowedSeqs) hiddenSeqs.add(seq);
      for (const key of plan2.keys) allKeys.add(key);
    } catch (error) {
      errors.set(carrierSeq, {
        message: "range " + JSON.stringify(point.range ?? point.shadowedSeqs ?? []) + ": " + (error?.message ?? error),
        shadowedSeqs: [...point.shadowedSeqs ?? []]
      });
    }
  }
  const plan = Object.freeze({
    byCarrier,
    errors,
    hiddenSeqs,
    userSeqs: index.userSeqs,
    keys: Object.freeze([...allKeys]),
    carrierSeqs: new Set(index.carriers.keys())
  });
  plans.set(snapshot, { records, grouped, plan });
  return plan;
}
function hideRulesFor(keys) {
  return keys.map((key) => {
    if (typeof key !== "string" || key === "") throw new Error("a hide rule has no stable flow key");
    const quoted = JSON.stringify(key).replace(/\\u([0-9a-f]{4})|\\([nrtbf])/gi, (_match, hex, short) => {
      const codes = { n: "a", r: "d", t: "9", b: "8", f: "c" };
      return "\\" + (hex ?? codes[short]) + " ";
    });
    return "[data-chat-anchor-key=" + quoted.replace(/</g, "\\3c ") + "]{display:none!important}";
  }).join("\n");
}

// src/use-hiding.js
var identity = (value) => value;
function useHiding({ useChat, useConversation, sessionId, operations, node, suppressError = false, hide: hide2 = true }) {
  const records = (0, import_react3.useSyncExternalStore)(operations.subscribe, () => operations.recordsFor(sessionId));
  const snapshot = typeof useChat === "function" ? useChat(identity) : void 0;
  const conversation = typeof useConversation === "function" ? useConversation(identity) : void 0;
  const grouped = conversation?.views?.grouped?.("chat");
  let plan;
  let css = "";
  let error;
  try {
    plan = hidePlanFor(snapshot, records, grouped);
    css = hide2 ? hideRulesFor(plan.keys) : "";
  } catch (cause) {
    const range = records.length > 0 ? records.map((record) => record.shadowedSeqs) : node?.data?.range ?? node?.data?.shadowedSeqs ?? [node?.data?.seq ?? node?.data?.carrierSeq];
    error = "range " + JSON.stringify(range) + ": " + (cause?.message ?? cause);
  }
  const diagnostics = plan?.errors.size > 0 ? [...plan.errors.values()] : [];
  const diagnosticText = diagnostics.map((entry) => entry.message).join("; ");
  (0, import_react3.useEffect)(() => {
    if (error !== void 0 || diagnosticText !== "") console.warn("[dsh-resend] session " + sessionId + ": unable to hide rewind " + (error ?? diagnosticText));
  }, [diagnosticText, error, sessionId]);
  return { plan, css, error: suppressError ? void 0 : error, diagnostics };
}

// src/regenerate.js
var identity2 = (value) => value;
var ASSISTANT_ACTIONS_ID = "dsh-resend-regenerate";
var ASSISTANT_ACTIONS_KIND = "dsh-resend-regenerate";
function companionStates(snapshot) {
  const states = [];
  if (typeof snapshot?.nodes?.values === "function") {
    for (const node of snapshot.nodes.values()) {
      if (node?.kind === ASSISTANT_ACTIONS_KIND && node.data !== void 0) states.push(node.data);
    }
  }
  return states;
}
function isLastReply(state, states) {
  return !states.some((other) => other !== state && other.seq !== state.seq && other.prevSeq === state.seq);
}
function promptRefusal(state) {
  const prompt = state?.prompt;
  if (prompt === void 0 || prompt === null) return void 0;
  if (prompt.isAppend !== true) return void 0;
  if (prompt.sourceKind !== "user") return void 0;
  return prompt.hasText === false ? "imageOnly" : void 0;
}
function regenerateReason(state, states, session, plan) {
  if (state === void 0 || state === null) return "offSurface";
  if (!isLastReply(state, states)) return "notLast";
  if (session?.running === true) return "stopFirst";
  if (plan?.hiddenSeqs?.has?.(state.seq) === true) return "shadowed";
  return promptRefusal(state) ?? null;
}
var REASON_TEXT = Object.freeze({
  stopFirst: "row.stopFirst",
  shadowed: "row.shadowed",
  imageOnly: "row.imageOnly",
  offSurface: "row.offSurface"
});
function RegenerateControl(props) {
  const { messageId, sessionId, operations, preferences: preferences2, t, useChat, useSession, useConversation } = props;
  const chat = typeof useChat === "function" ? useChat(identity2) : void 0;
  const session = typeof useSession === "function" ? useSession(identity2) : void 0;
  const { plan } = useHiding({ useChat, useConversation, sessionId, operations, suppressError: true });
  const prefs = usePreferences(preferences2);
  const states = companionStates(chat);
  const state = states.find((candidate) => candidate.id === messageId) ?? null;
  const reason = regenerateReason(state, states, session, plan);
  const [pending, setPending] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)(null);
  const inFlight = (0, import_react4.useRef)(false);
  const regenerate = async () => {
    if (inFlight.current || reason !== null) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await operations.run({ sessionId, targetSeq: state.seq, op: "regenerate" });
      if (result?.ok !== true) setError(t("row.regenerateFailed") + " (" + (result?.error?.code ?? "?") + ")");
    } catch (cause) {
      setError(t("row.regenerateFailed"));
      console.warn("[dsh-resend] regenerate at seq " + state.seq + " in session " + sessionId + ": " + (cause?.message ?? cause));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  if (prefs.regenerateLastReply === false) return null;
  if (reason === "notLast") return null;
  const disabledReason = reason === null ? void 0 : t(REASON_TEXT[reason]);
  return (0, import_react4.createElement)("div", { className: "dsh-resend-regenerate" }, [
    (0, import_react4.createElement)("button", {
      key: "regenerate",
      type: "button",
      className: "dsh-resend-chip",
      disabled: pending || reason !== null,
      title: disabledReason,
      onClick: () => {
        void regenerate();
      }
    }, [
      (0, import_react4.createElement)(import_dsh_client_ui_primitives.IconRefreshOutlineRegular, { key: "icon", size: 14 }),
      (0, import_react4.createElement)("span", { key: "label" }, t("row.regenerate"))
    ]),
    error === null ? null : (0, import_react4.createElement)("span", { key: "error", role: "alert" }, error)
  ]);
}
function regenerateSurface(operations, preferences2) {
  return function BoundRegenerate(props) {
    return (0, import_react4.createElement)(RegenerateControl, { ...props, operations, preferences: preferences2 });
  };
}
var ASSISTANT_ACTIONS_DEFINITION = {
  kind: ASSISTANT_ACTIONS_KIND,
  target: "chat",
  match: (event) => event?.type === "assistant/message" && event.surfaceOp === "append" ? { id: String(event.data?.message?.id ?? event.seq), role: "start" } : null,
  start: (context, match) => {
    const event = match.event;
    const previousReply = context?.previous?.("assistant/message");
    const prompt = context?.previous?.("user/message");
    return {
      seq: event.seq,
      id: String(event.data?.message?.id ?? event.seq),
      prevSeq: previousReply?.seq ?? null,
      prompt: prompt === void 0 ? null : {
        seq: prompt.seq,
        isAppend: prompt.surfaceOp === "append",
        sourceKind: prompt.data?.source?.kind ?? null,
        hasText: (Array.isArray(prompt.data?.content) ? prompt.data.content : []).some(
          (block) => block?.type === "text" && typeof block.text === "string"
        )
      }
    };
  },
  update: (context) => context.state,
  buildViewNode: (context) => context.state === void 0 ? null : {
    key: context.key,
    kind: ASSISTANT_ACTIONS_KIND,
    id: context.id,
    target: "chat",
    anchorSeq: context.state.seq,
    location: { kind: "unresolved" },
    visibility: "hidden",
    data: context.state
  }
};

// src/settings-row.js
var import_react5 = require("react");
var SETTING_KEYS = Object.freeze({
  hideReplacedMessages: "settings.hideReplacedMessages",
  inlineEditorBeneathMessage: "settings.inlineEditorBeneathMessage",
  regenerateLastReply: "settings.regenerateLastReply"
});
var SETTINGS_ROW_ID = "dsh-resend-preferences";
function SettingsRow({ preferences: preferences2, t }) {
  const snapshot = usePreferences(preferences2);
  return (0, import_react5.createElement)("div", { className: "dsh-resend-settings" }, [
    (0, import_react5.createElement)("div", { key: "heading", className: "dsh-resend-settings-heading" }, t("settings.heading")),
    ...PREFERENCE_FIELDS.map((field) => (0, import_react5.createElement)("div", { key: field, className: "dsh-resend-settings-row", "data-field": field }, [
      (0, import_react5.createElement)("span", { key: "label", className: "dsh-resend-settings-label" }, t(SETTING_KEYS[field])),
      (0, import_react5.createElement)("button", {
        key: "toggle",
        type: "button",
        className: "dsh-resend-chip dsh-resend-settings-toggle",
        "data-field": field,
        "aria-pressed": snapshot[field],
        onClick: () => preferences2.set(field, !snapshot[field])
      }, snapshot[field] ? t("settings.on") : t("settings.off"))
    ]))
  ]);
}
function settingsSurface(preferences2, translate) {
  return function BoundSettings(props) {
    return (0, import_react5.createElement)(SettingsRow, { preferences: preferences2, t: props.t ?? translate });
  };
}

// src/hide-rules.js
var import_react6 = require("react");
function HideRulesElement({ css }) {
  return (0, import_react6.createElement)("style", { "data-dsh-resend-hide-rules": "true" }, css);
}
var HideRulesSurface = withPanelBoundary(HideRulesElement, "panel.error.hideRules");

// src/rewind-row.js
var import_react8 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/marker.js
var MARKER_PREFIX = "dsh-resend-";
function hasMarkerPrefix(id) {
  return typeof id === "string" && id.startsWith(MARKER_PREFIX);
}

// src/file-rollback-preview.js
var import_react7 = require("react");
function FileRollbackPreview({ operations, point, t }) {
  const [result, setResult] = (0, import_react7.useState)();
  const [busy, setBusy] = (0, import_react7.useState)(false);
  const [completed, setCompleted] = (0, import_react7.useState)(false);
  async function run(phase) {
    if (busy) return;
    setBusy(true);
    try {
      const answer = await operations.rollback({ ...point, phase, ...phase === "preview" ? {} : { planId: result?.value?.planId } });
      setResult(phase === "cancel" && answer.ok ? void 0 : answer);
      setCompleted(phase === "execute" && answer.ok);
    } catch {
      setResult({ ok: false, error: { code: "internal" } });
    } finally {
      setBusy(false);
    }
  }
  const preview = result?.ok === true ? result.value : void 0;
  return (0, import_react7.createElement)("section", { "aria-label": t("files.preview"), "aria-busy": busy }, [
    (0, import_react7.createElement)("button", { key: "preview", type: "button", disabled: busy, onClick: () => {
      setCompleted(false);
      void run("preview");
    } }, t("files.preview")),
    result?.ok === false && (0, import_react7.createElement)("p", { key: "error", role: "alert" }, t(`files.error.${result.error.code}`)),
    result?.ok === false && result.error.files && (0, import_react7.createElement)("ul", { key: "partial" }, result.error.files.map((file) => (0, import_react7.createElement)(
      "li",
      { key: file.path },
      `${file.path} \u2014 ${t(`files.${file.action}`)}${file.reason === void 0 ? "" : `\uFF1A${t(`files.reason.${file.reason}`)}`}`
    ))),
    preview && (0, import_react7.createElement)("div", { key: "plan", "aria-live": "polite" }, [
      (0, import_react7.createElement)("p", { key: "heading" }, t(completed ? "files.completed" : "files.heading")),
      preview.files.length === 0 && (0, import_react7.createElement)("p", { key: "empty" }, t("files.empty")),
      (0, import_react7.createElement)("ul", { key: "files" }, preview.files.map((file, index) => (0, import_react7.createElement)(
        "li",
        { key: `${index}:${file.path}` },
        `${file.path} \u2014 ${t(`files.${completed && file.action === "restore" ? "restored" : file.action}`)}${file.reason === void 0 ? "" : `\uFF1A${t(`files.reason.${file.reason}`)}`}`
      ))),
      !completed && (0, import_react7.createElement)("button", { key: "execute", type: "button", disabled: busy || !preview.files.some((file) => file.action === "restore"), onClick: () => {
        void run("execute");
      } }, t("files.execute")),
      !completed && (0, import_react7.createElement)("button", { key: "cancel", type: "button", disabled: busy, onClick: () => {
        void run("cancel");
      } }, t("files.cancel"))
    ])
  ]);
}

// src/rewind-row.js
var REWIND_ROW_KIND = "dsh-resend-error";
function isCarrierEvent(event) {
  return event?.type === "user/message" && event?.surfaceOp !== void 0 && event.surfaceOp !== "append" && hasMarkerPrefix(event.data?.id);
}
function rewindPointView(outcome) {
  return outcome?.status === RESEND_FAILED ? { kind: "resend-failed" } : { kind: "notice" };
}
function RewindRow({ outcome, t, onSendAgain, hidePlan, hideError, onDismiss }) {
  const view = rewindPointView(outcome);
  if (hideError !== void 0) {
    return (0, import_react8.createElement)("div", { className: "dsh-resend-row dsh-resend-row-error", role: "alert" }, [
      (0, import_react8.createElement)(import_dsh_client_ui_primitives2.IconWarningOutlineRegular, { key: "icon", className: "dsh-resend-row-icon" }),
      (0, import_react8.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, t("row.hideFailed")),
      (0, import_react8.createElement)("pre", { key: "detail", className: "dsh-resend-row-detail" }, hideError)
    ]);
  }
  if (view.kind === "notice") {
    return (0, import_react8.createElement)("div", { className: "dsh-resend-row dsh-resend-row-notice" }, [
      (0, import_react8.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, String(t("row.hiddenCount")).replace("{count}", String(hidePlan?.count ?? 0))),
      (0, import_react8.createElement)("button", { key: "dismiss", type: "button", className: "dsh-resend-chip", onClick: onDismiss }, t("row.dismiss"))
    ]);
  }
  return (0, import_react8.createElement)("div", { className: "dsh-resend-row dsh-resend-row-error", role: "alert" }, [
    (0, import_react8.createElement)(import_dsh_client_ui_primitives2.IconWarningOutlineRegular, { key: "icon", className: "dsh-resend-row-icon" }),
    (0, import_react8.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, t("row.resendFailed")),
    (0, import_react8.createElement)(
      "button",
      { key: "send-again", type: "button", className: "dsh-resend-chip", onClick: onSendAgain },
      t("row.sendAgain")
    )
  ]);
}
function rewindRowSurface(operations, preferences2) {
  return function BoundRewindRow(props) {
    return (0, import_react8.createElement)(RewindRowSurface, { ...props, operations, preferences: preferences2 });
  };
}
function RewindRowSurface(props) {
  const { node, sessionId, operations, preferences: preferences2, t } = props;
  const point = { sessionId, carrierSeq: node?.data?.carrierSeq };
  const outcome = (0, import_react8.useSyncExternalStore)(operations.subscribe, () => operations.outcomeOf(point));
  const prefs = usePreferences(preferences2);
  const { plan, css, error } = useHiding({ ...props, hide: prefs.hideReplacedMessages });
  const [dismissed, setDismissed] = (0, import_react8.useState)(false);
  const hidePlan = plan?.byCarrier.get(point.carrierSeq);
  const missingPlan = plan !== void 0 && hidePlan === void 0 && !plan.errors.has(point.carrierSeq) ? "range " + JSON.stringify(node.data.range ?? [point.carrierSeq]) + ": the rewind point is missing from the Chat hide plan" : void 0;
  const hideError = error ?? plan?.errors.get(point.carrierSeq)?.message ?? missingPlan;
  (0, import_react8.useEffect)(() => {
    if (missingPlan !== void 0) console.warn("[dsh-resend] session " + sessionId + ": unable to hide rewind " + missingPlan);
  }, [missingPlan, sessionId]);
  const row = (0, import_react8.createElement)(RewindRow, {
    outcome,
    t,
    hidePlan,
    hideError,
    onDismiss: () => setDismissed(true),
    onSendAgain: () => {
      void operations.sendAgain(point);
    }
  });
  return (0, import_react8.createElement)("div", null, [
    (0, import_react8.createElement)(HideRulesSurface, { key: "rules", t, css }),
    (!dismissed || rewindPointView(outcome).kind === "resend-failed" || hideError !== void 0) && (0, import_react8.createElement)("div", { key: "row" }, row),
    (0, import_react8.createElement)(FileRollbackPreview, { key: "files", operations, point, t })
  ]);
}
var REWIND_ROW_DEFINITION = {
  kind: REWIND_ROW_KIND,
  target: "chat",
  match: (event) => isCarrierEvent(event) ? { id: `dsh-resend:${String(event.data.id)}`, role: "start" } : null,
  start: (_context, match) => {
    const event = match.event;
    const state = { carrierSeq: event.seq, range: { start: event.surfaceOp.startSeq, end: event.surfaceOp.endSeq } };
    if (Array.isArray(event.sourceEventSeqs)) state.shadowedSeqs = event.sourceEventSeqs.slice(1);
    return state;
  },
  update: (context) => context.state,
  buildViewNode: (context) => {
    if (context.state === void 0) return null;
    return {
      key: context.key,
      kind: REWIND_ROW_KIND,
      id: context.id,
      target: "chat",
      anchorSeq: context.state.carrierSeq,
      // A plugin kind would otherwise enter a collapsible process group. The
      // disclosure must stay independently visible at its seq.
      location: { kind: "unresolved" },
      visibility: "visible",
      data: context.state
    };
  }
};

// src/user-actions.js
var import_react9 = require("react");
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
var USER_ACTIONS_KIND = "dsh-resend-user-actions";
var identity3 = (value) => value;
function userMessageText(eventOrData) {
  const content = eventOrData?.data?.content ?? eventOrData?.content;
  return Array.isArray(content) ? content.filter((part) => part?.type === "text").map((part) => part.text).join("\n") : "";
}
function userActionsSurface(operations, preferences2) {
  return function BoundUserActions(props) {
    return (0, import_react9.createElement)(UserActionsRow, { ...props, operations, preferences: preferences2 });
  };
}
var control = (key, label, icon, onClick, reason, disabled) => (0, import_react9.createElement)("button", {
  key,
  type: "button",
  className: "dsh-resend-chip",
  onClick,
  disabled: disabled || reason !== void 0,
  title: reason
}, icon === void 0 ? label : [
  (0, import_react9.createElement)(icon, { key: "icon", size: 14 }),
  (0, import_react9.createElement)("span", { key: "label" }, label)
]);
function InlineEditor({ t, value, disabled, stopReason, composerReason, onText, onSend, onComposer, onCancel, onKeyDown }) {
  return [
    (0, import_react9.createElement)("textarea", {
      key: "textarea",
      value,
      rows: 3,
      autoFocus: true,
      disabled,
      "aria-label": t("row.editInput"),
      onChange: onText,
      onKeyDown
    }),
    control("send", t("row.send"), import_dsh_client_ui_primitives3.IconPaperPlaneOutlineRegular, onSend, stopReason ?? (value.trim() === "" ? t("row.blankText") : void 0), disabled),
    control("composer", t("row.editInComposer"), void 0, onComposer, composerReason, disabled),
    control("cancel", t("row.cancel"), import_dsh_client_ui_primitives3.IconCloseOutlineRegular, onCancel, void 0, disabled)
  ];
}
var InlineEditorSurface = withPanelBoundary(InlineEditor, "panel.error.inlineEditor");
function UserActionsRow(props) {
  const { node, sessionId, inputActions, useInput, useSession, readInput, operations, preferences: preferences2, t } = props;
  const prefs = usePreferences(preferences2);
  const { plan, css, error: hideError, diagnostics } = useHiding({ ...props, suppressError: true, hide: prefs.hideReplacedMessages });
  const data = node.data;
  const [editing, setEditing] = (0, import_react9.useState)(false);
  const [text, setText] = (0, import_react9.useState)(data.text);
  const [pending, setPending] = (0, import_react9.useState)(false);
  const [error, setError] = (0, import_react9.useState)();
  const inFlight = (0, import_react9.useRef)(false);
  const input = typeof useInput === "function" ? useInput(identity3) : void 0;
  const session = typeof useSession === "function" ? useSession(identity3) : void 0;
  const hidden = plan?.hiddenSeqs.has(data.seq) === true;
  const stopReason = session?.running ? t("row.stopFirst") : data.text.trim() === "" ? t("row.noText") : void 0;
  const composerReason = input?.phase !== "plain" ? t("row.composerBusy") : typeof inputActions?.setDraft !== "function" || typeof readInput !== "function" ? t("row.composerUnavailable") : void 0;
  const open = () => {
    if (stopReason !== void 0 || inFlight.current) return;
    setText(data.text);
    setError(void 0);
    setEditing(true);
  };
  const cancel = () => {
    if (inFlight.current) return;
    setEditing(false);
    setError(void 0);
  };
  const send = async () => {
    if (inFlight.current || stopReason !== void 0 || text.trim() === "") return;
    inFlight.current = true;
    setPending(true);
    setError(void 0);
    try {
      const result = await operations.run({ sessionId, targetSeq: data.seq, op: "edit", text });
      if (result.ok) setEditing(false);
      else setError(t("row.operationFailed") + " (" + result.error.code + ")");
    } catch (cause) {
      setError(t("row.operationFailed"));
      console.warn("[dsh-resend] edit at seq " + data.seq + " in session " + sessionId + ": " + (cause?.message ?? cause));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  const editInComposer = () => {
    if (inFlight.current || composerReason !== void 0) return;
    try {
      if (readInput()?.phase !== "plain") return;
      if (typeof inputActions?.setDraft !== "function") return;
      inputActions.setDraft(text.replace(/[\uE100-\uE11D\uFFFC]/gu, ""));
      setEditing(false);
    } catch (cause) {
      setError(t("row.composerUnavailable"));
      console.warn("[dsh-resend] composer handoff for session " + sessionId + ": " + (cause?.message ?? cause));
    }
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };
  const inlineOn = prefs.inlineEditorBeneathMessage;
  const rules = (0, import_react9.createElement)(HideRulesSurface, { key: "rules", t, css });
  const localDiagnostics = hideError ?? diagnostics.find((entry) => entry.shadowedSeqs.includes(data.seq))?.message;
  if (localDiagnostics !== void 0) {
    return (0, import_react9.createElement)("div", { role: "alert", className: "dsh-resend-row-error" }, [
      (0, import_react9.createElement)(HideRulesSurface, { key: "rules", t, css }),
      (0, import_react9.createElement)("span", { key: "message" }, t("row.hideFailed")),
      (0, import_react9.createElement)("pre", { key: "detail" }, localDiagnostics)
    ]);
  }
  if (hidden || !plan?.userSeqs.has(data.seq)) return rules;
  const idle = !inlineOn ? [control("composer", t("row.editInComposer"), void 0, editInComposer, stopReason ?? composerReason, pending)] : [control("edit", t("row.edit"), import_dsh_client_ui_primitives3.IconEditOutlineRegular, open, stopReason, pending)];
  const body = !editing ? idle : [(0, import_react9.createElement)(InlineEditorSurface, {
    key: "inline",
    t,
    value: text,
    disabled: pending,
    stopReason,
    composerReason,
    onText: (event) => setText(event.target.value),
    onSend: () => {
      void send();
    },
    onComposer: editInComposer,
    onCancel: cancel,
    onKeyDown
  })];
  return (0, import_react9.createElement)("div", { className: "dsh-resend-user-actions" }, [
    rules,
    ...body,
    error === void 0 ? null : (0, import_react9.createElement)("span", { key: "error", role: "alert" }, error)
  ]);
}
var USER_ACTIONS_DEFINITION = {
  kind: USER_ACTIONS_KIND,
  target: "chat",
  match: (event) => event?.type === "user/message" && event.surfaceOp === "append" ? { id: "dsh-resend-user-actions:" + String(event.data.id), role: "start" } : null,
  start: (_context, match) => ({ seq: match.event.seq, text: userMessageText(match.event) }),
  update: (context) => context.state,
  buildViewNode: (context) => context.state === void 0 ? null : {
    key: context.key,
    kind: USER_ACTIONS_KIND,
    id: context.id,
    target: "chat",
    // The actions must follow their user bubble and remain outside the host's
    // collapsible process groups. Hiding maps this kind via data.seq, not the
    // half-seq presentation anchor.
    anchorSeq: context.state.seq + 0.5,
    location: { kind: "unresolved" },
    visibility: "visible",
    data: context.state
  }
};
var SURFACE_SHADOW_DEFINITION = {
  kind: "dsh-resend-surface-shadow",
  target: "chat",
  match: (event) => event?.surfaceOp?.op === "replace" ? { id: String(event.seq), role: "start" } : null,
  start: (_context, match) => ({ seq: match.event.seq, shadowedSeqs: [...match.event.sourceEventSeqs ?? []] }),
  update: (context) => context.state,
  buildViewNode: (context) => context.state === void 0 ? null : {
    key: context.key,
    kind: "dsh-resend-surface-shadow",
    id: context.id,
    target: "chat",
    anchorSeq: context.state.seq,
    location: { kind: "unresolved" },
    visibility: "hidden",
    data: context.state
  }
};

// src/typert.client.js
var TYPERT_REMOTE = {
  package: PACKAGE,
  descriptors
};

// src/client.js
var name = PACKAGE;
var inject = ["remote"];
var NS = PACKAGE;
var preferences = createPreferences();
var DICTIONARIES = {
  zh: {
    "files.preview": "\u9884\u89C8\u6587\u4EF6\u56DE\u6EDA",
    "files.heading": "\u786E\u8BA4\u524D\u4E0D\u4F1A\u6539\u52A8\u6587\u4EF6\u3002\u4EE5\u4E0B\u6587\u4EF6\u5C06\u6309\u6B64\u8BA1\u5212\u5904\u7406\uFF1A",
    "files.completed": "\u6587\u4EF6\u56DE\u6EDA\u5DF2\u7ED3\u675F\u3002\u4EE5\u4E0B\u662F\u672C\u6B21\u5904\u7406\u7ED3\u679C\uFF1A",
    "files.empty": "\u8FD9\u6B21\u91CD\u5199\u6CA1\u6709\u8BB0\u5F55\u5230\u6587\u4EF6\u6539\u52A8\u3002",
    "files.restore": "\u5C06\u8FD8\u539F",
    "files.restored": "\u5DF2\u8FD8\u539F",
    "files.refuse": "\u62D2\u7EDD\u8FD8\u539F",
    "files.execute": "\u786E\u8BA4\u8FD8\u539F\u6587\u4EF6",
    "files.cancel": "\u53D6\u6D88",
    "files.reason.content-diverged": "\u6587\u4EF6\u5DF2\u88AB\u5176\u4ED6\u64CD\u4F5C\u4FEE\u6539",
    "files.reason.diverged-between-writes": "\u4E24\u6B21\u5199\u5165\u4E4B\u95F4\u5B58\u5728\u5176\u4ED6\u4FEE\u6539",
    "files.reason.prior-state-unavailable": "\u7F3A\u5C11\u53EF\u9760\u7684\u539F\u59CB\u5185\u5BB9",
    "files.reason.unsafe-path": "\u6587\u4EF6\u8DEF\u5F84\u4E0D\u5728\u53EF\u8FD8\u539F\u8303\u56F4\u5185",
    "files.reason.unreadable-file": "\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6",
    "files.reason.snapshot-unavailable": "\u539F\u59CB\u5185\u5BB9\u8BB0\u5F55\u65E0\u6CD5\u8BFB\u53D6",
    "files.reason.restore-failed": "\u6587\u4EF6\u8FD8\u539F\u5931\u8D25",
    "files.reason.write-outcome-unavailable": "\u5199\u5165\u5931\u8D25\uFF0C\u65E0\u6CD5\u786E\u8BA4\u6587\u4EF6\u53D8\u5316\u7684\u6765\u6E90",
    "files.reason.execution-stopped": "\u672C\u6B21\u8FD8\u539F\u5DF2\u505C\u6B62\uFF0C\u672A\u5904\u7406\u6B64\u6587\u4EF6",
    "files.error.no-target-state": "\u8FD9\u6B21\u91CD\u5199\u6CA1\u6709\u53EF\u7528\u7684\u6587\u4EF6\u8FD8\u539F\u8BB0\u5F55\u3002",
    "files.error.preview-stale": "\u9884\u89C8\u540E\u6587\u4EF6\u53D1\u751F\u53D8\u5316\uFF0C\u672A\u6267\u884C\u8FD8\u539F\u3002\u8BF7\u91CD\u65B0\u9884\u89C8\u3002",
    "files.error.plan-not-found": "\u9884\u89C8\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u3002",
    "files.error.agent-busy": "\u8BF7\u5148\u505C\u6B62\u56DE\u590D\uFF0C\u518D\u9884\u89C8\u6587\u4EF6\u56DE\u6EDA\u3002",
    "files.error.session-not-found": "\u5F53\u524D\u4F1A\u8BDD\u65E0\u6CD5\u8BFB\u53D6\u3002",
    "files.error.bad-request": "\u6587\u4EF6\u56DE\u6EDA\u8BF7\u6C42\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u3002",
    "files.error.internal": "\u6587\u4EF6\u56DE\u6EDA\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u540E\u68C0\u67E5\u6587\u4EF6\u3002",
    "files.error.execution-stopped": "\u6587\u4EF6\u56DE\u6EDA\u5DF2\u505C\u6B62\u3002\u4EE5\u4E0B\u5217\u51FA\u5DF2\u8FD8\u539F\u4E0E\u672A\u8FD8\u539F\u7684\u6587\u4EF6\uFF0C\u8BF7\u68C0\u67E5\u540E\u91CD\u65B0\u9884\u89C8\u3002",
    "row.resendFailed": "\u5386\u53F2\u5DF2\u88AB\u91CD\u5199\uFF0C\u4F46\u91CD\u53D1\u5931\u8D25\uFF1Aagent \u6CA1\u6709\u63A5\u6536\u8FD9\u6761\u63D0\u793A\u8BCD\u3002",
    "row.sendAgain": "\u91CD\u65B0\u53D1\u9001",
    "row.edit": "\u7F16\u8F91",
    "row.editInput": "\u7F16\u8F91\u6D88\u606F",
    "row.send": "\u53D1\u9001",
    "row.cancel": "\u53D6\u6D88",
    "row.editInComposer": "\u5728\u8F93\u5165\u6846\u4E2D\u7F16\u8F91",
    "row.hiddenCount": "\u5DF2\u9690\u85CF {count} \u6761\u6D88\u606F",
    "row.dismiss": "\u5173\u95ED",
    "row.hideFailed": "\u91CD\u5199\u540E\u7684\u6D88\u606F\u65E0\u6CD5\u9690\u85CF",
    "row.stopFirst": "\u8BF7\u5148\u505C\u6B62\u56DE\u590D",
    "row.noText": "\u8FD9\u6761\u6D88\u606F\u6CA1\u6709\u53EF\u7F16\u8F91\u7684\u6587\u672C",
    "row.blankText": "\u6D88\u606F\u4E0D\u80FD\u4E3A\u7A7A",
    "row.composerBusy": "\u8F93\u5165\u6846\u6B63\u5728\u5FD9\u788C\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5",
    "row.composerUnavailable": "\u5F53\u524D\u8F93\u5165\u6846\u65E0\u6CD5\u63A5\u6536\u6587\u672C",
    "row.operationFailed": "\u7F16\u8F91\u5E76\u91CD\u53D1\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
    "row.regenerate": "\u91CD\u65B0\u751F\u6210",
    "row.shadowed": "\u8FD9\u6761\u56DE\u590D\u5DF2\u88AB\u91CD\u5199",
    "row.imageOnly": "\u8FD9\u6761\u63D0\u793A\u8BCD\u6CA1\u6709\u53EF\u91CD\u53D1\u7684\u6587\u672C",
    "row.offSurface": "\u8FD9\u6761\u56DE\u590D\u4E0D\u5728\u5F53\u524D\u5BF9\u8BDD\u9762\u4E0A",
    "row.regenerateFailed": "\u91CD\u65B0\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
    "panel.errorTitle": "\u8FD9\u4E2A\u754C\u9762\u65E0\u6CD5\u663E\u793A",
    "panel.errorHint": "\u5176\u4F59\u754C\u9762\u4E0D\u53D7\u5F71\u54CD\u3002\u53EF\u4EE5\u91CD\u8BD5\uFF0C\u6216\u5237\u65B0\u9875\u9762\u3002",
    "panel.retry": "\u91CD\u8BD5",
    "panel.error.rewindRow": "\u91CD\u5199\u70B9\u65E0\u6CD5\u663E\u793A",
    "panel.error.userActions": "\u7528\u6237\u6D88\u606F\u64CD\u4F5C\u65E0\u6CD5\u663E\u793A",
    "panel.error.regenerate": "\u91CD\u751F\u6210\u529F\u80FD\u65E0\u6CD5\u663E\u793A",
    "panel.error.inlineEditor": "\u5185\u8054\u7F16\u8F91\u5668\u65E0\u6CD5\u663E\u793A",
    "panel.error.hideRules": "\u9690\u85CF\u89C4\u5219\u65E0\u6CD5\u663E\u793A",
    "panel.error.settings": "\u8BBE\u7F6E\u884C\u65E0\u6CD5\u663E\u793A",
    "settings.heading": "\u6D88\u606F\u7F16\u8F91\u8BBE\u7F6E",
    "settings.hideReplacedMessages": "\u9690\u85CF\u88AB\u66FF\u6362\u7684\u6D88\u606F",
    "settings.inlineEditorBeneathMessage": "\u6D88\u606F\u4E0B\u65B9\u7684\u5185\u8054\u7F16\u8F91\u5668",
    "settings.regenerateLastReply": "\u6700\u540E\u4E00\u6761\u56DE\u590D\u4E0A\u7684\u91CD\u65B0\u751F\u6210",
    "settings.on": "\u5F00",
    "settings.off": "\u5173"
  },
  en: {
    "files.preview": "Preview file rollback",
    "files.heading": "Files stay unchanged until confirmation. This plan will process:",
    "files.completed": "File rollback finished. Results:",
    "files.empty": "No file changes were recorded for this rewind.",
    "files.restore": "Will restore",
    "files.restored": "Restored",
    "files.refuse": "Refused",
    "files.execute": "Confirm file restore",
    "files.cancel": "Cancel",
    "files.reason.content-diverged": "The file was changed by another operation",
    "files.reason.diverged-between-writes": "Other changes occurred between writes",
    "files.reason.prior-state-unavailable": "Reliable prior contents are unavailable",
    "files.reason.unsafe-path": "The path is outside the restorable scope",
    "files.reason.unreadable-file": "The file cannot be read",
    "files.reason.snapshot-unavailable": "Stored contents cannot be read",
    "files.reason.restore-failed": "The file could not be restored",
    "files.reason.write-outcome-unavailable": "The write failed; the source of file changes cannot be verified",
    "files.reason.execution-stopped": "Rollback stopped before processing this file",
    "files.error.no-target-state": "No file restore record is available for this rewind.",
    "files.error.preview-stale": "Files changed after the preview. Nothing was restored. Preview again.",
    "files.error.plan-not-found": "The preview expired. Preview again.",
    "files.error.agent-busy": "Stop the reply before previewing file rollback.",
    "files.error.session-not-found": "The conversation cannot be read.",
    "files.error.bad-request": "Invalid rollback request. Preview again.",
    "files.error.internal": "File rollback did not finish. Preview again and inspect the files.",
    "files.error.execution-stopped": "Rollback stopped. Restored and refused files are listed below. Inspect them and preview again.",
    "row.resendFailed": "History was rewound, but the re-send failed: the agent did not take the prompt.",
    "row.sendAgain": "Send again",
    "row.edit": "Edit",
    "row.editInput": "Edit message",
    "row.send": "Send",
    "row.cancel": "Cancel",
    "row.editInComposer": "Edit in the composer",
    "row.hiddenCount": "{count} messages hidden",
    "row.dismiss": "Dismiss",
    "row.hideFailed": "The rewound messages could not be hidden",
    "row.stopFirst": "Stop the reply first",
    "row.noText": "This message has no editable text",
    "row.blankText": "The message cannot be blank",
    "row.composerBusy": "The composer is busy; try again later",
    "row.composerUnavailable": "The composer cannot accept text",
    "row.operationFailed": "Edit and resend failed; try again",
    "row.regenerate": "Regenerate",
    "row.shadowed": "This reply was already rewound",
    "row.imageOnly": "The prompt has no text to re-send",
    "row.offSurface": "This reply is off the current surface",
    "row.regenerateFailed": "Regenerate failed; try again",
    "panel.errorTitle": "This panel could not be displayed",
    "panel.errorHint": "The rest of the UI is unaffected. Retry, or reload the page.",
    "panel.retry": "Retry",
    "panel.error.rewindRow": "This rewind point could not be displayed",
    "panel.error.userActions": "User message actions could not be displayed",
    "panel.error.regenerate": "The regenerate control could not be displayed",
    "panel.error.inlineEditor": "The inline editor could not be displayed",
    "panel.error.hideRules": "The hide rules could not be displayed",
    "panel.error.settings": "The settings row could not be displayed",
    "settings.heading": "Message editing settings",
    "settings.hideReplacedMessages": "Hide replaced messages",
    "settings.inlineEditorBeneathMessage": "Inline editor beneath the message",
    "settings.regenerateLastReply": "Regenerate on the last reply",
    "settings.on": "On",
    "settings.off": "Off"
  }
};
var mount = { status: "pending", error: void 0 };
function remoteMountState() {
  return Object.freeze({ ...mount });
}
function conversationRegistrar(service) {
  if (typeof service?.events?.register === "function") return (definition) => service.events.register(definition);
  if (typeof service?.register === "function") return (definition) => service.register(definition);
  return void 0;
}
function mountSurfaces(scope, ctx) {
  scope.effect(() => scope.locale.register(NS, DICTIONARIES), "dsh-resend: dictionaries");
  const translate = scope.locale.bind(NS);
  const operations = createResendOperations(ctx.remote);
  scope.effect(() => () => operations.dispose(), "dsh-resend: rewind-point records");
  const register = conversationRegistrar(scope.uiConversation);
  const slot = "conversation.chat.node";
  if (register === void 0) {
    ctx.root.logger?.("dsh-resend")?.warn(
      "dsh-resend: uiConversation exposes no definition registry this build understands; the rewind-point row will not mount"
    );
  } else {
    for (const [definition, label] of [
      [REWIND_ROW_DEFINITION, "dsh-resend: rewind-point definition"],
      [USER_ACTIONS_DEFINITION, "dsh-resend: user-actions definition"],
      [SURFACE_SHADOW_DEFINITION, "dsh-resend: surface eligibility definition"],
      [ASSISTANT_ACTIONS_DEFINITION, "dsh-resend: regenerate-companion definition"]
    ]) {
      const dispose = register(definition);
      scope.effect(
        () => () => {
          try {
            dispose?.();
          } catch {
          }
        },
        label
      );
    }
  }
  scope.inject(["conversation", "sessions"], (inputScope) => {
    inputScope.slots.inject(
      slot,
      () => inputScope.slots.register(
        {
          name: slot,
          key: USER_ACTIONS_KIND,
          locale: NS,
          inject: (sessionId) => ({
            readInput: () => {
              const input = inputScope.conversation?.input;
              const sessionScope = inputScope.sessions?.scope?.(sessionId);
              if (typeof input?.for !== "function" || sessionScope === void 0) return void 0;
              return input.for(sessionScope)?.state?.getSnapshot?.();
            }
          })
        },
        withPanelBoundary(userActionsSurface(operations, preferences), "panel.error.userActions")
      )
    );
  });
  scope.slots.inject(
    slot,
    () => scope.slots.register(
      { name: slot, key: REWIND_ROW_KIND, locale: NS },
      withPanelBoundary(rewindRowSurface(operations, preferences), "panel.error.rewindRow")
    )
  );
  const actionsSlot = "conversation.chat.assistant-actions";
  scope.slots.inject(
    actionsSlot,
    () => scope.slots.register(
      { name: actionsSlot, id: ASSISTANT_ACTIONS_ID, order: 100, locale: NS, label: () => translate("row.regenerate") },
      withPanelBoundary(regenerateSurface(operations, preferences), "panel.error.regenerate")
    )
  );
  const settingsSlot = "settings.general.item";
  scope.slots.inject(
    settingsSlot,
    () => scope.slots.register(
      { name: settingsSlot, id: SETTINGS_ROW_ID, order: 100, locale: NS, label: () => translate("settings.heading") },
      withPanelBoundary(settingsSurface(preferences, translate), "panel.error.settings", translate)
    )
  );
}
async function apply(ctx) {
  try {
    await ctx.remote.$mount(TYPERT_REMOTE);
  } catch (error) {
    mount = { status: "failed", error };
    ctx.root.logger?.("dsh-resend")?.warn(
      `dsh-resend: the Remote contribution did not mount (${error?.message ?? error}); edit-and-resend and regenerate stay disabled for this page`
    );
    return;
  }
  mount = { status: "mounted", error: void 0 };
  ctx.inject(["slots", "locale", "uiConversation"], (scope) => mountSurfaces(scope, ctx));
}

		Object.defineProperty(module.exports, Symbol.toStringTag, { value: "Module" });
		return module.exports;
	}
});

