import { describe, it, expect } from 'vitest'
import { autoDetect } from '@/components/FieldMapper'
import type { DatabaseProperty } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────────
function makeProp(name: string, type: DatabaseProperty['type'], options: string[]): DatabaseProperty {
  return { name, type, options }
}

// ── autoDetect ────────────────────────────────────────────────────────────────
describe('autoDetect', () => {
  it('returns empty mapping when no select/status properties exist', () => {
    const props = [makeProp('Tags', 'multi_select', ['easy', 'hard'])]
    const result = autoDetect(props)
    expect(result.statusProperty).toBe('')
    expect(result.wrongValues).toEqual([])
    expect(result.solvedValues).toEqual([])
  })

  it('picks a property whose name contains "status" (case-insensitive)', () => {
    const props = [
      makeProp('Category', 'select', ['Bug', 'Feature']),
      makeProp('Status',   'select', ['Wrong', 'Solved', 'Attempted']),
    ]
    const result = autoDetect(props)
    expect(result.statusProperty).toBe('Status')
  })

  it('detects "Wrong" as a wrong value and "Solved" as a solved value', () => {
    const props = [makeProp('Status', 'select', ['Wrong', 'Solved', 'Attempted'])]
    const result = autoDetect(props)
    expect(result.wrongValues).toContain('Wrong')
    expect(result.solvedValues).toContain('Solved')
    expect(result.wrongValues).not.toContain('Solved')
    expect(result.solvedValues).not.toContain('Wrong')
  })

  it('detects common wrong-hint words: incorrect, fail, retry, review', () => {
    const props = [
      makeProp('State', 'select', ['Incorrect', 'Failed', 'Retry', 'Review', 'OK']),
    ]
    const result = autoDetect(props)
    expect(result.wrongValues).toContain('Incorrect')
    expect(result.wrongValues).toContain('Failed')
    expect(result.wrongValues).toContain('Retry')
    expect(result.wrongValues).toContain('Review')
    expect(result.wrongValues).not.toContain('OK')
  })

  it('detects common solved-hint words: done, pass, ac, correct', () => {
    const props = [
      makeProp('Progress', 'select', ['Done', 'Pass', 'AC', 'Correct', 'Pending']),
    ]
    const result = autoDetect(props)
    expect(result.solvedValues).toContain('Done')
    expect(result.solvedValues).toContain('Pass')
    expect(result.solvedValues).toContain('AC')
    expect(result.solvedValues).toContain('Correct')
    expect(result.solvedValues).not.toContain('Pending')
  })

  it('works with Notion built-in status type', () => {
    const props = [makeProp('Status', 'status', ['Not started', 'In progress', 'Done'])]
    const result = autoDetect(props)
    expect(result.statusProperty).toBe('Status')
    expect(result.solvedValues).toContain('Done')
  })

  it('falls back to the first select/status property when none match name hints', () => {
    const props = [
      makeProp('Category', 'select', ['Wrong', 'Solved']),
      makeProp('Priority', 'select', ['High', 'Low']),
    ]
    const result = autoDetect(props)
    // Category is first and has no name-hint match, but it's picked as fallback
    expect(result.statusProperty).toBe('Category')
  })

  it('prefers name-hint match over first-in-list', () => {
    const props = [
      makeProp('Priority', 'select', ['High', 'Low']),
      makeProp('Result',   'select', ['Wrong', 'Correct']),  // "result" is in STATUS_PROP_HINTS
    ]
    const result = autoDetect(props)
    expect(result.statusProperty).toBe('Result')
  })

  it('matching is case-insensitive for option values', () => {
    const props = [makeProp('Status', 'select', ['WRONG', 'SOLVED'])]
    const result = autoDetect(props)
    expect(result.wrongValues).toContain('WRONG')
    expect(result.solvedValues).toContain('SOLVED')
  })

  it('an option can only appear in wrongValues OR solvedValues, not both', () => {
    // "Rethink" matches WRONG_HINTS; "finish" matches SOLVED_HINTS — no overlap expected
    const props = [makeProp('Status', 'select', ['Rethink', 'Finished'])]
    const result = autoDetect(props)
    const overlap = result.wrongValues.filter(v => result.solvedValues.includes(v))
    expect(overlap).toHaveLength(0)
  })

  it('handles Chinese hint keywords: 错 → wrong, 完 → solved', () => {
    const props = [makeProp('状态', 'select', ['错误', '完成', '待做'])]
    const result = autoDetect(props)
    expect(result.wrongValues).toContain('错误')   // contains '错'
    expect(result.solvedValues).toContain('完成')  // contains '完'
  })

  it('returns empty wrongValues and solvedValues when no options match hints', () => {
    const props = [makeProp('Status', 'select', ['Alpha', 'Beta', 'Gamma'])]
    const result = autoDetect(props)
    expect(result.wrongValues).toEqual([])
    expect(result.solvedValues).toEqual([])
  })
})
