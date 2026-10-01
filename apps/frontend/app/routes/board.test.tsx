import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
  return {
    ...actual,
    useLoaderData: () => mockLoaderData,
    useFetcher: () => ({
      data: undefined,
      state: 'idle',
      submit: vi.fn(),
      load: vi.fn(),
      formData: undefined,
      Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    }),
    useFetchers: () => [],
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  }
})

vi.mock('../client', () => ({
  client: {
    api: {
      board: { $get: vi.fn() },
      tasks: {
        $post: vi.fn(),
        $delete: vi.fn(),
        update: { $put: vi.fn() },
        move: { $patch: vi.fn() },
      },
    },
  },
}))

import Board from './board'

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
})
