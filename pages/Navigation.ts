import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Controls that exist on every logged-in screen: logout + the side/top menu. */
export class Navigation extends BasePage {
  async expectLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/profile/);
  }

  async logout(): Promise<void> {
    const avatar = this.page.getByRole('banner').locator('.MuiAvatar-root').first();
    await avatar.click();
    await this.page.getByRole('menuitem', { name: /logout/i }).click();
  }

  /** After logout we must be off the dashboard and see a way to log in again. */
  async expectLoggedOut(): Promise<void> {
    await expect(this.page).not.toHaveURL(/profile|admin|agent/);
    await expect(
      this.page
        .getByRole('link', { name: /login/i })
        .or(this.page.getByRole('button', { name: /login/i }))
        .first(),
    ).toBeVisible();
  }

  /** "Self Statement" menu entry (falls back to a plain "Statement" entry). */
  get selfStatementLink(): Locator {
    const exact = /self.?statement/i;
    const loose = /statement/i;
    return this.page
      .getByRole('link', { name: exact })
      .or(this.page.getByRole('button', { name: exact }))
      .or(this.page.getByRole('link', { name: loose }))
      .or(this.page.getByRole('button', { name: loose }))
      .first();
  }
}
