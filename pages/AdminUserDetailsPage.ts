import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminUserDetailsPage extends BasePage {
  private get editButton(): Locator {
    return this.page.getByRole('button', { name: 'Edit User' });
  }
  private get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save Changes' });
  }
  private get statusSelect(): Locator {
    return this.page.getByRole('combobox').filter({ hasText: 'Pending' });
  }

  private statusBadge(pattern: RegExp): Locator {
    return this.page.getByText(pattern).first();
  }

  /** A freshly registered agent must not be active yet. */
  async expectPending(): Promise<void> {
    await expect(this.statusBadge(/^(pending|inactive)$/i)).toBeVisible();
  }

  async expectActive(): Promise<void> {
    await expect(this.statusBadge(/^active$/i)).toBeVisible();
  }

  async activate(): Promise<void> {
    await this.editButton.click();
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: 'Active', exact: true }).click();
    await this.saveButton.click();
    await expect(this.page.getByText('User updated successfully')).toBeVisible();
    await this.expectActive();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }
}
