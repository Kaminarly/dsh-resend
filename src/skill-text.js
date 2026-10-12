// Keep the explicit gesture grammar aligned with the host's agent/pre-step hook.
export const skillName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function skillTokens(text) {
  return [...new Set([...text.matchAll(/(?:^|\s)\/([^\s/]+)(?=\s|$)/gu)].map(match => match[1]))]
}

// skills/list already filters by target Session and user invocation policy.
// An unreadable catalog is a failed lookup, never proof that a skill is absent.
export function skillCatalog(result) {
  if (result?.ok !== true || !Array.isArray(result.value?.skills)) return undefined
  if (result.value.skills.some(skill => !skill || typeof skill.name !== 'string' || !skillName.test(skill.name))) return undefined
  const seen = new Set()
  return result.value.skills.filter(skill => {
    if (skill.userInvocable === false || skill.invocation?.userInvocable === false || seen.has(skill.name)) return false
    seen.add(skill.name)
    return true
  })
}
