/**
 * Test fixture — a plugin that can never activate.
 *
 * It injects a service name no composition provides, so Cordis parks its fiber
 * in PENDING forever. Ticket 01's acceptance forbids exactly this state for
 * `dsh-resend` (a permanently pending plugin fiber fails the startup audit and
 * keeps the whole renderer from booting), so the boot suite uses this fixture
 * as the negative control that proves its active-entry check has teeth.
 */
export const name = 'forever-pending-fixture'

export const inject = ['__dsh_resend_absent_service__']

export function apply() {}