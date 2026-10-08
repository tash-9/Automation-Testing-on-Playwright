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
    await expect(this.totalHeading).not.toHaveText(/Total:\s*0\b/);
  }

  async expectUserListed(phone: string): Promise<void> {
    await expect(this.rowFor(phone)).toBeVisible();
  }

  async openUserByPhone(phone: string): Promise<AdminUserDetailsPage> {
    await this.open();
    const row = this.rowFor(phone);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'View' }).click();
    await expect(this.page).toHaveURL(/\/admin\/users\/\d+/);
    return new AdminUserDetailsPage(this.page);
  }
}
