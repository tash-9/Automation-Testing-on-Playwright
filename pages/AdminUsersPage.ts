import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { AdminUserDetailsPage } from './AdminUserDetailsPage';

/** Admin "User List" page (`/admin/users`) - locate users and open details. */
export class AdminUsersPage extends BasePage {
  private get totalHeading(): Locator {
    return this.page.getByRole('heading', { name: /Total:/ });
  }

  /** Table row that contains the given text (e.g. a phone number). */
  private rowFor(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  async open(): Promise<void> {
    await this.goto('/admin/users');
    await expect(this.page.getByRole('heading', { name: 'User List' })).toBeVisible();
    // The list loads asynchronously; wait until it is populated.
    await expect(this.totalHeading).not.toHaveText(/Total:\s*0\b/, { timeout: 20_000 });
  }

  /**
   * The user list has thousands of rows. A brand-new agent is not guaranteed
   * to sit on page 1, so look them up by email.
   */
  async searchByEmail(email: string): Promise<Locator> {
    const searchType = this.page
      .locator('.MuiFormControl-root', { hasText: 'Search Type' })
      .getByRole('combobox');
    await searchType.click();
    await this.page.getByRole('option', { name: /search by email/i }).click();
    await this.page.getByRole('textbox').first().fill(email);
    await this.page.getByRole('button', { name: 'Search', exact: true }).click();
    const row = this.rowFor(email);
    await expect(row, `Expected ${email} in the Admin user list`).toBeVisible();
    return row;
  }

  async expectUserListed(email: string): Promise<void> {
    await this.searchByEmail(email);
  }

  async openUserByEmail(email: string): Promise<AdminUserDetailsPage> {
    const row = this.rowFor(email);
    if (!(await row.isVisible().catch(() => false))) {
      await this.open();
      await this.searchByEmail(email);
    }
    await row.getByRole('button', { name: 'View' }).click();
    await expect(this.page).toHaveURL(/\/admin\/users\/\d+/);
    return new AdminUserDetailsPage(this.page);
  }
}
