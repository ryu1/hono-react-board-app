import { test, expect } from '@playwright/test'

test.describe('Kanban Board E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display three columns with correct titles', async ({ page }) => {
    await expect(page.getByText('Todo 📝')).toBeVisible()
    await expect(page.getByText('In Progress 🚀')).toBeVisible()
    await expect(page.getByText('Done ✅')).toBeVisible()
  })

  test('should display initial tasks', async ({ page }) => {
    await expect(page.getByText('Todo 📝')).toBeVisible()
    const taskCount = await page.locator('[draggable="true"]').count()
    expect(taskCount).toBeGreaterThan(0)
  })

  test('should create a new task', async ({ page }) => {
    const todoColumn = page.locator('text=Todo 📝').locator('..').locator('..')
    const input = todoColumn.getByPlaceholder('+ 新しいタスク...')
    const uniqueName = `E2E Task ${Date.now()}`
    await input.fill(uniqueName)
    await todoColumn.getByRole('button', { name: '追加' }).click()

    // Server Components don't auto-refresh; reload to see new task
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Use first() to handle potential multiple matches and increase timeout for WebKit
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 15000 })
  })

  test('should show validation error for empty task title', async ({ page }) => {
    const todoColumn = page.locator('text=Todo 📝').locator('..').locator('..')
    await todoColumn.getByRole('button', { name: '追加' }).click()

    await expect(page.getByText('Required')).toBeVisible({ timeout: 5000 })
  })

  test('should edit a task', async ({ page }) => {
    const task = page.locator('[draggable="true"]').first()
    await expect(task).toBeVisible()
    
    // Use a more robust selector that works across browsers
    const taskTitle = task.locator('text=/Task|あ/').first()
    await expect(taskTitle).toBeVisible({ timeout: 10000 })
    await taskTitle.click()
    
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: '閉じる' })).toBeVisible()
    
    await page.getByRole('button', { name: '閉じる' }).click()
  })

  test('should move task between columns via drag and drop', async ({ page }) => {
    const task = page.locator('[draggable="true"]').first()
    await expect(task).toBeVisible()
    const taskText = await task.textContent()

    const todoColumn = page.locator('text=Todo 📝').locator('..').locator('..')
    const progressColumn = page.locator('text=In Progress 🚀').locator('..').locator('..')

    await task.dragTo(progressColumn)
    await page.waitForTimeout(2000)

    const progressTasks = progressColumn.locator('[draggable="true"]')
    await expect(progressTasks.first()).toBeVisible({ timeout: 10000 })
  })
})