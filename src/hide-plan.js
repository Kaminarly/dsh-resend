/**
 * One node scan per Chat snapshot. Callers share the index and aggregate plan;
 * a row only asks the resulting sets/maps for membership or its count.
 * The node store is the host's values()-bearing store, not a native Map.
 */
const indexes = new WeakMap()
const plans = new WeakMap()

export function chatNodes(snapshot) {
  if (typeof snapshot?.nodes?.values !== 'function') throw new Error('the Chat snapshot has no readable node store')
  return snapshot.nodes.values()
}

function affectedSeq(node) {
  if (node.kind === 'dsh-resend-user-actions') return node.data.seq
  if (node.kind === 'turn-tail') return node.data?.closing?.finalNode?.seq
  if (node.kind === 'tool-call') return node.data?.root?.seq
  return node.anchorSeq
}

function indexFor(snapshot, grouped) {
  const cache = indexes.get(snapshot)
  if (cache !== undefined && cache.grouped === grouped) return cache.index
  const bySeq = new Map()
  const carriers = new Map()
  const modelShadowed = new Set()
  const userSeqs = new Set()
  const rendered = new Map()
  // Grouped references are the actual flow placements, including split
  // assistant reasoning/response seats. Use their platform-provided node keys.
  if (grouped !== undefined) {
    for (const entry of grouped.entries) {
      const members = entry.kind === 'group'
        ? grouped.groupSource(entry.key)?.getSnapshot()?.members
        : [entry]
      if (!Array.isArray(members)) throw new Error('Chat group ' + entry.key + ' has no readable members')
      for (const member of members) {
        const key = member.groupPart === undefined || member.groupPart === 'response'
          ? member.key
          : JSON.stringify([member.key, member.groupPart])
        const keys = rendered.get(member.key) ?? []
        keys.push(key)
        rendered.set(member.key, keys)
      }
    }
  }
  for (const node of chatNodes(snapshot)) {
    if (node.kind === 'dsh-resend-error') carriers.set(node.data.carrierSeq, node.data)
    if (node.kind === 'dsh-resend-surface-shadow') {
      for (const seq of node.data.shadowedSeqs) modelShadowed.add(seq)
    }
    if (node.kind === 'user') userSeqs.add(node.data?.seq ?? node.anchorSeq)
    if (node.visibility === 'hidden') continue
    const seq = affectedSeq(node)
    if (typeof seq !== 'number' || !Number.isFinite(seq)) continue
    const flowKeys = grouped === undefined ? [node.flowKey ?? node.key] : rendered.get(node.key) ?? []
    if (flowKeys.some((key) => typeof key !== 'string' || key === '')) throw new Error('Chat node at seq ' + seq + ' has no stable flow key')
    const keys = bySeq.get(Math.ceil(seq)) ?? []
    keys.push(...flowKeys)
    bySeq.set(Math.ceil(seq), keys)
  }
  const index = { bySeq, carriers, modelShadowed, userSeqs }
  indexes.set(snapshot, { grouped, index })
  return index
}

function planForSeqs(shadowedSeqs, index) {
  if (!Array.isArray(shadowedSeqs) || shadowedSeqs.length === 0 ||
      shadowedSeqs.some((seq) => !Number.isSafeInteger(seq) || seq < 0)) {
    throw new Error('the rewind has no valid shadowedSeqs from Remote or carrier provenance')
  }
  const keys = new Set()
  for (const seq of shadowedSeqs) {
    for (const key of index.bySeq.get(seq) ?? []) keys.add(key)
  }
  return Object.freeze({ keys: Object.freeze([...keys]), count: keys.size, has: (key) => keys.has(key) })
}

export function hiddenKeysFor(shadowedSeqs, nodes) {
  return planForSeqs(shadowedSeqs, indexFor({ nodes }, undefined))
}

/** Resolve all rewind points together, cached on snapshot and operation records. */
export function hidePlanFor(snapshot, records, grouped) {
  if (snapshot === undefined || snapshot === null) throw new Error('the Chat snapshot is unavailable')
  const previous = plans.get(snapshot)
  if (previous?.records === records && previous.grouped === grouped) return previous.plan
  const index = indexFor(snapshot, grouped)
  const points = new Map(index.carriers)
  // Remote is the primary source, including before the carrier reaches Chat.
  for (const record of records) points.set(record.carrierSeq, record)
  const byCarrier = new Map()
  const hiddenSeqs = new Set(index.modelShadowed)
  const allKeys = new Set()
  const errors = new Map()
  for (const [carrierSeq, point] of points) {
    try {
      const plan = planForSeqs(point.shadowedSeqs, index)
      byCarrier.set(carrierSeq, plan)
      for (const seq of point.shadowedSeqs) hiddenSeqs.add(seq)
      for (const key of plan.keys) allKeys.add(key)
    } catch (error) {
      errors.set(carrierSeq, {
        message: 'range ' + JSON.stringify(point.range ?? point.shadowedSeqs ?? []) + ': ' + (error?.message ?? error),
        shadowedSeqs: [...(point.shadowedSeqs ?? [])],
      })
    }
  }
  const plan = Object.freeze({
    byCarrier,
    errors,
    hiddenSeqs,
    userSeqs: index.userSeqs,
    keys: Object.freeze([...allKeys]),
    carrierSeqs: new Set(index.carriers.keys()),
  })
  plans.set(snapshot, { records, grouped, plan })
  return plan
}

/** JSON.stringify quotes the attribute value exactly once, including array keys. */
export function hideRulesFor(keys) {
  return keys.map((key) => {
    if (typeof key !== 'string' || key === '') throw new Error('a hide rule has no stable flow key')
    const quoted = JSON.stringify(key).replace(/\\u([0-9a-f]{4})|\\([nrtbf])/gi, (_match, hex, short) => {
      const codes = { n: 'a', r: 'd', t: '9', b: '8', f: 'c' }
      return '\\' + (hex ?? codes[short]) + ' '
    })
    return '[data-chat-anchor-key=' + quoted.replace(/</g, '\\3c ') + ']{display:none!important}'
  }).join('\n')
}
