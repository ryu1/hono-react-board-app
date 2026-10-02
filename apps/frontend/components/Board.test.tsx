import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  createTaskResult: { success: true } as any,
  deleteTaskResult: { success: true } as any,
  updateTaskResult: { success: true } as any,
  moveTaskResult: { success: true } as any,
  createTaskSpy: vi.fn(),
  deleteTaskSpy: vi.fn(),
  updateTaskSpy: vi.fn(),
  moveTaskSpy: vi.fn(),
}))

vi.mock('../app/actions', () => ({
  createTaskAction: vi.fn(async (formData: FormData) => {
    mocks.createTaskSpy(formData)
    return mocks.createTaskResult
  }),
  deleteTaskAction: vi.fn(async (formData: FormData) => {
    mocks.deleteTaskSpy(formData)
    return mocks.deleteTaskResult
  }),
  updateTaskAction: vi.fn(async (formData: FormData) => {
    mocks.updateTaskSpy(formData)
    return mocks.updateTaskResult
  }),
  moveTaskAction: vi.fn(async (formData: FormData) => {
    mocks.moveTaskSpy(formData)
    return mocks.moveTaskResult
  }),
}))

const mockLoaderData = {
  initialColumns: [
    { id: 'col-todo', title: 'Todo 📝', position: 0 },
    { id: 'col-progress', title: 'In Progress 🚀', position: 1 },
    { id: 'col-done', title: 'Done ✅', position: 2 },
  ],
  initialTasks: [
    { id: 't1', columnId: 'col-todo', title: 'Task 1', description: 'desc', position: 0 },
  ],
}

import Board from './Board'

function createDataTransfer() {
  const store = new Map<string, string>()
  return {
    data: store,
    setData(type: string, value: string) {
      store.set(type, value)
    },
    getData(type: string) {
      return store.get(type) ?? ''
    },
    clearData() {
      store.clear()
    },
    get types() {
      return [...store.keys()]
    },
    files: [] as unknown[],
    items: [] as unknown[],
    setDragImage: vi.fn(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createTaskResult = { success: true }
  mocks.deleteTaskResult = { success: true }
  mocks.updateTaskResult = { success: true }
  mocks.moveTaskResult = { success: true }
})

describe('Board component', () => {
  it('renders all three columns', () => {
    render(<Board {...mockLoaderData} />)
    expect(screen.getByText('Todo 📝')).toBeInTheDocument()
    expect(screen.getByText('In Progress 🚀')).toBeInTheDocument()
    expect(screen.getByText('Done ✅')).toBeInTheDocument()
  })

  it('renders tasks in correct column', () => {
    render(<Board {...mockLoaderData} />)
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })

  it('renders create form with input', () => {
    render(<Board {...mockLoaderData} />)
    expect(screen.getAllByPlaceholderText('+ 新しいタスク...')).toHaveLength(3)
  })

  it('renders task count badge', () => {
    render(<Board {...mockLoaderData} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})

describe('Board interaction tests', () => {
  it('submits a new task when the create form is submitted', async () => {
    const user = userEvent.setup()
    render(<Board {...mockLoaderData} />)

    const input = screen.getAllByPlaceholderText('+ 新しいタスク...')[0]
    await user.type(input, 'New task')
    const submitButton = screen.getAllByRole('button', { name: '追加' })[0]
    await user.click(submitButton)

    await waitFor(() =>
      expect(mocks.createTaskSpy).toHaveBeenCalled()
    )
    
    const calledWith = mocks.createTaskSpy.mock.calls[0][0]
    expect(calledWith.get('title')).toBe('New task')
    expect(calledWith.get('columnId')).toBe('col-todo')
  })

  it('submits a delete intent when clicking the delete button', async () => {
    const user = userEvent.setup()
    render(<Board {...mockLoaderData} />)

    await user.click(screen.getByRole('button', { name: '×' }))

    await waitFor(() =>
      expect(mocks.deleteTaskSpy).toHaveBeenCalled()
    )
    const calledWith = mocks.deleteTaskSpy.mock.calls[0][0]
    expect(calledWith.get('id')).toBe('t1')
  })

  it('toggles edit mode from the card title', async () => {
    const user = userEvent.setup()
    render(<Board {...mockLoaderData} />)

    await user.click(screen.getByText('Task 1'))
    expect(screen.getByDisplayValue('Task 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByDisplayValue('Task 1')).not.toBeInTheDocument()
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })

  it('moves a task with drag and drop', async () => {
    render(<Board {...mockLoaderData} />)

    const card = screen.getByText('Task 1').closest('div[draggable]')
    expect(card).not.toBeNull()
    const createForm = screen.getAllByPlaceholderText('+ 新しいタスク...')[1].closest('form')
    const column = createForm?.parentElement
    expect(column).not.toBeNull()
    const dataTransfer = createDataTransfer()

    fireEvent.dragStart(card!, { dataTransfer })
    fireEvent.drop(column!, { dataTransfer })

    await waitFor(() =>
      expect(mocks.moveTaskSpy).toHaveBeenCalled()
    )
    const calledWith = mocks.moveTaskSpy.mock.calls[0][0]
    expect(calledWith.get('id')).toBe('t1')
    expect(calledWith.get('columnId')).toBe('col-progress')
  })
})