import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    // Wait for redirect to auth page
    await page.waitForURL(/\/auth/);

    // Check for login form elements
    await expect(page.getByRole('heading', { name: /iniciar sesión|login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email|correo/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password|contraseña/i)).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.waitForURL(/\/auth/);

    // Try to submit empty form
    await page.getByRole('button', { name: /iniciar sesión|login|entrar/i }).click();

    // Should show validation errors
    await expect(page.getByText(/email|correo/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.waitForURL(/\/auth/);

    // Fill in invalid credentials
    await page.getByPlaceholder(/email|correo/i).fill('invalid@example.com');
    await page.getByPlaceholder(/password|contraseña/i).fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /iniciar sesión|login|entrar/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|inválido|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('should have link to signup page', async ({ page }) => {
    await page.waitForURL(/\/auth/);

    // Look for signup link
    const signupLink = page.getByRole('link', { name: /registrar|signup|crear cuenta/i });
    await expect(signupLink).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected routes
    const protectedRoutes = ['/dashboard', '/ambassadors', '/fiestas', '/stories'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/\/auth/);
      expect(page.url()).toContain('/auth');
    }
  });
});
