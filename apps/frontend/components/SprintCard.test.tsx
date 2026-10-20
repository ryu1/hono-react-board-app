import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  createSprintResult: { success: true } as unknown,
  updateSprintResult: { success: true } as unknown,
  deleteSprintResult: { success: true } as unknown,
  createSprintSpy: vi.fn(),
  updateSprintSpy: vi.fn(),
  deleteSprintSpy: vi.fn(),
}))

vi.mock('../app/actions', () => ({
  createSprintAction: vi.fn(async (formData: FormData) => {
    mocks.createSprintSpy(formData)
    return mocks.createSprintResult
  }),
  updateSprintAction: vi.fn(async (formData: FormData) => {
    mocks.updateSprintSpy(formData)
    return mocks.updateSprintResult
  }),
  deleteSprintAction: vi.fn(async (formData: FormData) => {
    mocks.deleteSprintSpy(formData)
    return mocks.deleteSprintResult
  }),
}))

import SprintCard from './SprintCard'

const sprint = {
  id: 'sp-1',
  name: 'スプリント1',
  startDate: '2026-10-01',
  endDate: '2026-10-14',
  taskCount: 8,
  doneCount: 3,
  progress: 37.5,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createSprintResult = { success: true }
  mocks.updateSprintResult = { success: true }
  mocks.deleteSprintResult = { success: true }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SprintCard', () => {
  it('renders name, period, and progress', () => {
    render(<SprintCard sprint={sprint} />)
    expect(screen.getByText('スプリント1')).toBeInTheDocument()
    expect(screen.getByText('2026-10-01 〜 2026-10-14')).toBeInTheDocument()
    expect(screen.getByText('37.5% (3/8)')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '37.5')
  })

  it('links the sprint name to the board page', () => {
    render(<SprintCard sprint={sprint} />)
    const link = screen.getByRole('link', { name: 'スプリント1' })
    expect(link).toHaveAttribute('href', '/sprints/sp-1')
  })

  it('submits an edit via updateSprintAction', async () => {
    const user = userEvent.setup()
    render(<SprintCard sprint={sprint} />)

    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    const nameInput = await screen.findByTestId('sprint-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'スプリント1改')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.updateSprintSpy).toHaveBeenCalled())
    const calledWith = mocks.updateSprintSpy.mock.calls[0][0]
    expect(calledWith.get('id')).toBe('sp-1')
    expect(calledWith.get('name')).toBe('スプリント1改')
  })

  it('deletes after confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<SprintCard sprint={sprint} />)

    await user.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => expect(mocks.deleteSprintSpy).toHaveBeenCalled())
    expect(mocks.deleteSprintSpy.mock.calls[0][0].get('id')).toBe('sp-1')
  })

  it('does not delete when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<SprintCard sprint={sprint} />)

    await user.click(screen.getByRole('button', { name: '削除' }))
    expect(mocks.deleteSprintSpy).not.toHaveBeenCalled()
  })
})
