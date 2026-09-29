/**
 * Seam ⑥ (continued): CI's four stages are a fixed sequence, and the ordering
 * is load-bearing — the `git diff --exit-code -- lib/` gate only means
 * something after `build` has just rewritten lib/, and a failure in any stage
 * must fail the whole run.
 *
 * A pipeline whose order lives only in a YAML file nobody checks is one edit
 * away from silently losing the artifact-honesty gate, so the order is asserted
 * here from the workflow definition itself.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'

const workflow = yaml.load(readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'))

/** The four stages, as command matchers, in their required order. */
const STAGES = [
  { name: 'check', matches: (command) => /\bnpm run check\b/.test(command) },
  { name: 'build', matches: (command) => /\bnpm run build\b/.test(command) },
  { name: 'artifact honesty', matches: (command) => /git diff --exit-code -- lib\//.test(command) },
  { name: 'test', matches: (command) => /\bnpm test\b/.test(command) },
]

describe('CI ordering', () => {
  const jobs = Object.entries(workflow.jobs ?? {})

  it('runs as one job, so the stages cannot start out of order or in parallel', () => {
    expect(jobs).toHaveLength(1)
  })

  it('runs the four stages in order: check → build → git diff → test', () => {
    const [, job] = jobs[0]
    const commands = (job.steps ?? []).filter((step) => typeof step.run === 'string').map((step) => step.run)

    const positions = STAGES.map((stage) => {
      const index = commands.findIndex((command) => stage.matches(command))
      expect(index, `stage ${stage.name} is missing from CI`).toBeGreaterThanOrEqual(0)
      return index
    })

    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(new Set(positions).size).toBe(positions.length)
  })

  it('every stage fails the run: no step may continue on error', () => {
    const [, job] = jobs[0]
    for (const step of job.steps ?? []) {
      expect(step['continue-on-error'], `step ${JSON.stringify(step.name ?? step.uses)} must not swallow its failure`).not.toBe(true)
    }
  })

  it('installs before checking, so the gates have their tooling', () => {
    const [, job] = jobs[0]
    const commands = (job.steps ?? []).filter((step) => typeof step.run === 'string').map((step) => step.run)
    const install = commands.findIndex((command) => /\bnpm ci\b/.test(command))
    expect(install).toBe(0)
  })
})