import { useEffect, useSyncExternalStore } from 'react'

/** All controls share one Host read for the same Chat window and live state. */
export function useConversationEligibility(operations, sessionId, session, plan) {
  const revision = JSON.stringify([plan?.revision,
    [...(plan?.hiddenSeqs ?? [])], session?.running, session?.openState])
  const conversation = useSyncExternalStore(operations.subscribe, () => operations.conversationFor(sessionId, revision))
  useEffect(() => { void operations.refreshConversation(sessionId, revision) }, [operations, sessionId, revision])
  return { conversation, revision }
}
