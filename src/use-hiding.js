import { useEffect, useSyncExternalStore } from 'react'
import { hidePlanFor, hideRulesFor } from './hide-plan.js'

const identity = (value) => value

/**
 * Read the shared snapshot plan once; rows never scan the node store themselves.
 *
 * Replaced rows are always hidden. Settings and notice dismissal never gate
 * the plan or its CSS, including legacy callers that still pass `hide: false`.
 */
export function useHiding({ useChat, useConversation, sessionId, operations, node, suppressError = false }) {
  const records = useSyncExternalStore(operations.subscribe, () => operations.recordsFor(sessionId))
  const snapshot = typeof useChat === 'function' ? useChat(identity) : undefined
  const conversation = typeof useConversation === 'function' ? useConversation(identity) : undefined
  let plan
  let css = ''
  let error
  try {
    const grouped = conversation?.views?.grouped?.('chat')
    plan = hidePlanFor(snapshot, records, grouped)
    css = hideRulesFor(plan.keys)
  } catch (cause) {
    const range = records.length > 0 ? records.map((record) => record.shadowedSeqs)
      : node?.data?.range ?? node?.data?.shadowedSeqs ?? [node?.data?.seq ?? node?.data?.carrierSeq]
    error = 'range ' + JSON.stringify(range) + ': ' + (cause?.message ?? cause)
  }
  const diagnostics = plan?.errors.size > 0 ? [...plan.errors.values()] : []
  const diagnosticText = diagnostics.map((entry) => entry.message).join('; ')
  useEffect(() => {
    if (error !== undefined || diagnosticText !== '') console.warn('[dsh-resend] session ' + sessionId + ': unable to hide rewind ' + (error ?? diagnosticText))
  }, [diagnosticText, error, sessionId])
  return { plan, css, error: suppressError ? undefined : error, diagnostics }
}
