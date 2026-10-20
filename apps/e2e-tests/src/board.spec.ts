import { test, expect } from '@playwright/test'

function uniqueName(prefix: string) {
  return `${prefix} ${crypto.randomUUID()}`
}

async function createSprintAndOpen(page: import('@playwright/test').Page) {
  const name = uniqueName('E2E Sprint')
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder('例: スプリント1').fill(name)
  await page.getByLabel('開始日').fill('2026-10-01')
  await page.getByLabel('終了日').fill('2026-10-14')
  await page.getByRole('button', { name: '作成' }).click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible({ timeout: 10000 })
  await page.getByRole('link', { name, exact: true }).first().click()
  await page.waitForURL(/\/sprints\//)
  await page.waitForLoadState('networkidle')
  return name
}

async function getColumnId(page: import('@playwright/test').Page, columnTitle: string) {
  const column = page.locator(`text=${columnTitle}`).locator('..').locator('..')
  const testId = await column.getAttribute('data-testid')
  return testId?.replace('column-', '') || ''
}

async function createTask(page: import('@playwright/test').Page, columnTitle: string, taskName: string) {
  const columnId = await getColumnId(page, columnTitle)
  const column = page.getByTestId(`column-${columnId}`)
  const input = column.getByPlaceholder('+ 新しいタスク...')
  await input.fill(taskName)
  await column.getByRole('button', { name: '追加' }).click()
  await expect(input).toHaveValue('', { timeout: 10000 })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(taskName, { exact: true }).first()).toBeVisible({ timeout: 15000 })
}

async function dragTaskToColumn(page: import('@playwright/test').Page, taskName: string, targetColumnTitle: string) {
  const task = page.getByText(taskName, { exact: true }).first()
  await expect(task).toBeVisible({ timeout: 15000 })
  const targetColumnId = await getColumnId(page, targetColumnTitle)
  const targetTaskList = page.getByTestId(`column-${targetColumnId}-tasks`)
  await task.dragTo(targetTaskList)
  // Small wait for drag events to process and API call to fire
  await page.waitForTimeout(1000)
  await page.waitForLoadState('networkidle')
  // Reload to reflect the move (Board doesn't auto-update per spec)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(targetTaskList.getByText(taskName, { exact: true }).first()).toBeVisible({ timeout: 15000 })
}

test.describe('Sprint Kanban E2E', () => {
  test('UC-007: スプリントを作成すると一覧に進捗 0% で表示される', async ({ page }) => {
    const name = uniqueName('E2E Sprint')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('例: スプリント1').fill(name)
    await page.getByLabel('開始日').fill('2026-10-01')
    await page.getByLabel('終了日').fill('2026-10-14')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('2026-10-01 〜 2026-10-14').first()).toBeVisible()
    await expect(page.getByText('0% (0/0)').first()).toBeVisible()
  })

  test('UC-001: スプリントのボードに 3 カラムが表示される', async ({ page }) => {
    await createSprintAndOpen(page)
    await expect(page.getByText('Todo 📝')).toBeVisible()
    await expect(page.getByText('In Progress 🚀')).toBeVisible()
    await expect(page.getByText('Done ✅')).toBeVisible()
    await expect(page.getByRole('link', { name: '← 一覧へ戻る' })).toBeVisible()
  })

  test('UC-002: タスクを作成できる', async ({ page }) => {
    await createSprintAndOpen(page)
    const taskName = uniqueName('E2E Task')
    await createTask(page, 'Todo 📝', taskName)
  })

  test('UC-002: タイトル空でバリデーションエラーが表示される', async ({ page }) => {
    await createSprintAndOpen(page)
    const columnId = await getColumnId(page, 'Todo 📝')
    const todoColumn = page.getByTestId(`column-${columnId}`)
    await todoColumn.getByRole('button', { name: '追加' }).click()
    await expect(page.getByText('Required')).toBeVisible({ timeout: 5000 })
  })

  test('UC-003: ドラッグ&ドロップでタスクを移動できる', async ({ page }) => {
    await createSprintAndOpen(page)
    const taskName = uniqueName('E2E DnD')
    await createTask(page, 'Todo 📝', taskName)
    await dragTaskToColumn(page, taskName, 'In Progress 🚀')
  })

  test('UC-006: タスクを Done に移すと一覧の進捗率が更新される', async ({ page }) => {
    await createSprintAndOpen(page)
    const taskName = uniqueName('E2E Progress')
    await createTask(page, 'Todo 📝', taskName)
    await dragTaskToColumn(page, taskName, 'Done ✅')

    await page.getByRole('link', { name: '← 一覧へ戻る' }).click()
    await page.waitForURL('/')
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/100%\s*\(1\/1\)/).first()).toBeVisible({ timeout: 15000 })
  })

  test('UC-009: スプリントを削除すると一覧から消える', async ({ page }) => {
    const name = uniqueName('E2E Del')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('例: スプリント1').fill(name)
    await page.getByLabel('開始日').fill('2026-10-01')
    await page.getByLabel('終了日').fill('2026-10-14')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible({ timeout: 10000 })

    page.on('dialog', (dialog) => dialog.accept())
    const sprintLink = page.getByRole('link', { name, exact: true }).first()
    const card = sprintLink.locator('..').locator('..')
    await card.getByRole('button', { name: '削除' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 15000 })
  })
})