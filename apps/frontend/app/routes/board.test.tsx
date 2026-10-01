import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  fetcherData: undefined as unknown,
  fetchers: [] as Array<{ formData: FormData }>,
  pendingAction: null as Promise<unknown> | null,
  submitSpy: vi.fn(),
  loadSpy: vi.fn(),
}))

const mockLoaderData = {
  columns: [
    { id: 'col-todo', title: 'Todo 📝', position: 0 },
    { id: 'col-progress', title: 'In Progress 🚀', position: 1 },
    { id: 'col-done', title: 'Done ✅', position: 2 },
  ],
  tasks: [
    { id: 't1', columnId: 'col-todo', title: 'Task 1', description: 'desc', position: 0 },
  ],
}

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  const MockForm = ({ children, onSubmit, ...props }: any) => (
    <form
      {...props}
      onSubmit={(e) => {
        onSubmit?.(e)
        if (e.defaultPrevented) return
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        mocks.submitSpy(formData)
        mocks.pendingAction = (async () => {
          const { clientAction } = await import('./board')
          const result = await clientAction({
            request: { formData: async () => formData } as unknown as Request,
          })
          mocks.fetcherData = result
        })()
      }}
    >
      {children}
    </form>
  )
  return {
    ...actual,
    useLoaderData: () => mockLoaderData,
    useFetcher: () => ({
      data: mocks.fetcherData,
      state: 'idle',
      submit: mocks.submitSpy,
      load: mocks.loadSpy,
      formData: undefined,
      Form: MockForm,
    }),
    useFetchers: () => mocks.fetchers,
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  }
})

vi.mock('../client', () => ({
  client: {
    api: {
      board: { $get: vi.fn() },
      tasks: {
        $post: vi.fn(),
        ':id': { $delete: vi.fn() },
        update: { $put: vi.fn() },
        move: { $patch: vi.fn() },
      },
    },
  },
}))

import { client } from '../client'
import Board from './board'

function flushAsyncAction() {
  return act(async () => {
    await mocks.pendingAction
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

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
  mocks.fetcherData = undefined
  mocks.fetchers = []
  mocks.pendingAction = null
})

describe('Board component', () => {
  it('renders all three columns', () => {
    render(<Board />)
    expect(screen.getByText('Todo 📝')).toBeInTheDocument()
    expect(screen.getByText('In Progress 🚀')).toBeInTheDocument()
    expect(screen.getByText('Done ✅')).toBeInTheDocument()
  })

  it('renders tasks in correct column', () => {
    render(<Board />)
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })

  it('renders create form with input', () => {
    render(<Board />)
    expect(screen.getAllByPlaceholderText('+ 新しいタスク...')).toHaveLength(3)
  })

  it('renders task count badge', () => {
    render(<Board />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows a validation error when submitting an empty title (spec §4.2)', async () => {
    const user = userEvent.setup()
    render(<Board />)
    expect(screen.queryByText('Required')).not.toBeInTheDocument()

    const submitButton = screen.getAllByRole('button', { name: '追加' })[0]
    await user.click(submitButton)

    expect(screen.getAllByText('Required').length).toBeGreaterThan(0)
  })
})

describe('Board interaction tests (spec §5.2)', () => {
  it('submits a new task when the create form is submitted', async () => {
    const user = userEvent.setup()
    render(<Board />)

    const input = screen.getAllByPlaceholderText('+ 新しいタスク...')[0]
    await user.type(input, 'New task')
    const submitButton = screen.getAllByRole('button', { name: '追加' })[0]
    await user.click(submitButton)

    await waitFor(() =>
      expect(client.api.tasks.$post).toHaveBeenCalledWith({
        json: {
          id: expect.any(String),
          columnId: 'col-todo',
          title: 'New task',
          position: 1,
        },
      })
    )
    await flushAsyncAction()
  })

  it('submits a delete intent when clicking the delete button', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(screen.getByRole('button', { name: '×' }))

    await waitFor(() =>
      expect(client.api.tasks[':id'].$delete).toHaveBeenCalledWith({
        param: { id: 't1' },
      })
    )
    const submittedFormData = mocks.submitSpy.mock.calls.at(-1)?.[0]
    expect(submittedFormData.get('intent')).toBe('delete')
    expect(submittedFormData.get('id')).toBe('t1')
    await flushAsyncAction()
  })

  it('toggles edit mode from the card title', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(screen.getByText('Task 1'))
    expect(screen.getByDisplayValue('Task 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByDisplayValue('Task 1')).not.toBeInTheDocument()
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })

  it('moves a task with drag and drop', async () => {
    render(<Board />)

    const card = screen.getByText('Task 1').closest('div[draggable]')
    expect(card).not.toBeNull()
    const createForm = screen.getAllByPlaceholderText('+ 新しいタスク...')[1].closest('form')
    const column = createForm?.parentElement
    expect(column).not.toBeNull()
    const dataTransfer = createDataTransfer()

    fireEvent.dragStart(card!, { dataTransfer })
    fireEvent.drop(column!, { dataTransfer })

    await waitFor(() =>
      expect(client.api.tasks.move.$patch).toHaveBeenCalledWith({
        json: { id: 't1', columnId: 'col-progress', position: 999 },
      })
    )
    expect(mocks.loadSpy).toHaveBeenCalledWith('/')
    await flushAsyncAction()
  })

  it('optimistically hides a task with a pending delete', () => {
    const formData = new FormData()
    formData.set('intent', 'delete')
    formData.set('id', 't1')
    mocks.fetchers = [{ formData }]

    render(<Board />)
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(3)
  })
})
