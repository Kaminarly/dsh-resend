/** Conversation rollback uses the same validated write pair, with no resend. */
import { carrierIdFor } from './marker.js'
import { writeRewindPair } from './write.js'
import { describeError, hostService, logWarning } from './host.js'
import { readCoveringLog } from './log-read.js'
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'

export function planConversationRollback(session, carrier) {
  const nodes = [...session.surface.nodes]
  const start = nodes.indexOf(carrier.seq)
  if (start < 0) return undefined
  return {
    tail: session.seq,
    count: nodes.length - start - 1,
    rangeStartSeq: carrier.seq,
    endSeq: nodes.at(-1),
    shadowedSeqs: nodes.slice(start),
    // Replacing the point as well preserves exactly its model-visible contents.
    traceText: carrier.data.content.map((block) => block.text).join('\n'),
  }
}

export async function executeConversationRollback(ctx, session, plan, prepare) {
  if (session.seq !== plan.tail) return { ok: false, error: { code: 'conversation-stale' } }
  if (plan.count === 0) return { ok: true, value: { action: 'unchanged', count: 0 } }
  const carrierId = carrierIdFor('rollback', randomUUID())
  let record
  let result
  try {
    record = await prepare(session, plan, carrierId)
    result = await writeRewindPair(ctx, {
      session, sessionId: session.id, sessions: hostService(ctx, 'sessions'), plan,
      carrierId, traceText: plan.traceText,
    })
  } catch (error) {
    logWarning(ctx, `conversation rollback failed: ${describeError(error)}`)
    result = { ok: false, error: { code: 'internal' } }
  }
  if (!result.ok) {
    // A flush or exit assertion can fail AFTER the pair changed the surface.
    const covering = await readCoveringLog(ctx, session.id)
    const landed = covering.status === 'ok' ? covering.log.find((event) => event.type === 'user/message' && event.data.id === carrierId) : undefined
    if (landed !== undefined) return { ok: false, error: { code: 'conversation-save-failed', conversation: {
      action: 'rewound', count: plan.count, carrierSeq: landed.seq, shadowedSeqs: landed.sourceEventSeqs.slice(1),
    } } }
    try { await record?.discardUnlessWritten() }
    catch (error) { logWarning(ctx, `unused rollback record cleanup failed: ${describeError(error)}`) }
    return { ok: false, error: { code: result.error.code === 'message-pending' ? 'conversation-stale' : result.error.code } }
  }
  return { ok: true, value: { action: 'rewound', count: plan.count,
    carrierSeq: result.value.carrierSeq, shadowedSeqs: result.value.shadowedSeqs } }
}
