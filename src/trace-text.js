/**
 * The carrier's trace text — the one localized string in this plugin that lives
 * in the session LOG instead of on screen (spec §5.4, §10).
 *
 * The carrier renders nothing: it is a replacement node, so no shipped renderer
 * matches it. But it IS what a human sees when they open the session file to
 * find out what happened to their message, so it has to be an honest sentence
 * rather than a marker like `dsh-resend carrier`.
 *
 * **Once written it is immutable.** The language is picked at write time from
 * the active locale, and the text becomes part of an append-only log: nothing
 * in this plugin ever rewrites or re-renders it, and a later locale change must
 * not reach back into history (spec §10). Choosing per write, rather than per
 * read, is what makes that true.
 *
 * The active locale is read through `ctx.get('locale')` and **never** through
 * the property `ctx.locale`: this fiber does not inject the locale service, and
 * Cordis refuses any service property read on a fiber that does not inject it
 * (`cannot get property "locale" without inject`, spec §16.6) — so the guarded
 * property read would throw, not answer. On the shipped host the locale service
 * is the CLIENT half's (`ctx.provide('locale', locale)` in
 * `@deepseek-ai/dsh-client-locale`), so this read answers `undefined` from the
 * host fiber today and the write records English; the locale selection itself
 * is ticket 08's, and this function is the seam it completes.
 */

/** The two trace texts, in the spec's own words (spec §5.4). Frozen once: the log is append-only. */
export const TRACE_TEXT = Object.freeze({
  en: '(this message was replaced by an edit; the original is archived in the session log)',
  zh: '（此处内容已被撤回：原消息已归档，可在恢复视图中查看）',
})

/** The language a write records when the active locale is unknown. */
const DEFAULT_LOCALE = 'en'

/**
 * The trace text for one locale.
 * @param locale - the active locale id, e.g. `'en'` or `'zh'`.
 * @returns the matching trace text, or {@link DEFAULT_LOCALE}'s when this
 *   plugin has no text for that locale.
 */
function traceTextFor(locale) {
  return TRACE_TEXT[locale] ?? TRACE_TEXT[DEFAULT_LOCALE]
}

/**
 * The active host locale, as far as this half can see it.
 * @param ctx - the host context.
 * @returns the locale id, or `undefined` when this composition has no readable
 *   locale service.
 */
function activeLocale(ctx) {
  const locale = ctx.get('locale')
  const active = typeof locale?.getSnapshot === 'function' ? locale.getSnapshot()?.active : undefined
  return typeof active === 'string' && active !== '' ? active : undefined
}

/**
 * The trace text to write right now, from the active locale.
 * @param ctx - the host context.
 * @returns the trace text for the active locale, or the default one.
 */
export function traceTextNow(ctx) {
  return traceTextFor(activeLocale(ctx) ?? DEFAULT_LOCALE)
}
