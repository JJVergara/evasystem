import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixtures for EVA System E2E tests
 */

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base['page']>;
}>({
  // Authenticated page fixture - reuse auth state
  authenticatedPage: async ({ browser }, use) => {
    // Create a new context with stored auth state if available
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    }).catch(() => browser.newContext());

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

/**
 * Helper to login programmatically
 */
export async function login(
  page: ReturnType<typeof base['page']>,
  email: string,
  password: string
) {
  await page.goto('/auth');
  await page.getByPlaceholder(/email|correo/i).fill(email);
  await page.getByPlaceholder(/password|contraseña/i).fill(password);
  await page.getByRole('button', { name: /iniciar sesión|login|entrar/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard|\/$/);
}

/**
 * Helper to save auth state
 */
export async function saveAuthState(
  page: ReturnType<typeof base['page']>,
  path = 'e2e/.auth/user.json'
) {
  await page.context().storageState({ path });
}

/**
 * Common page object patterns
 */
export const selectors = {
  // Navigation
  sidebar: '[data-testid="sidebar"]',
  navItem: (name: string) => `[data-testid="nav-${name}"]`,

  // Dashboard
  dashboardStats: '[data-testid="dashboard-stats"]',
  recentActivity: '[data-testid="recent-activity"]',

  // Ambassadors
  ambassadorList: '[data-testid="ambassador-list"]',
  ambassadorCard: '[data-testid="ambassador-card"]',

  // Fiestas
  fiestaList: '[data-testid="fiesta-list"]',
  fiestaCard: '[data-testid="fiesta-card"]',

  // Common
  loadingSpinner: '[data-testid="loading"]',
  errorMessage: '[data-testid="error"]',
  toast: '[data-sonner-toast]',
};

/**
 * Wait for loading to complete
 */
export async function waitForLoad(page: ReturnType<typeof base['page']>) {
  // Wait for any loading indicators to disappear
  await page.waitForSelector(selectors.loadingSpinner, { state: 'hidden', timeout: 10000 }).catch(() => {});

  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
}
