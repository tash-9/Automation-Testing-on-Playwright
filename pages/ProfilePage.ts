import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {
  private get balanceField(): Locator {
    return this.page.getByRole('textbox', { name: 'Current Balance (BDT)' });
  }

  async open(): Promise<void> {
    await this.goto('/profile');
    await expect(this.balanceField).toBeVisible();
  }

  /** Current wallet balance as a number (e.g. "2000.00" -> 2000). */
  async getBalance(): Promise<number> {
    const raw = await this.balanceField.inputValue();
    return parseFloat(raw.replace(/,/g, ''));
  }

  /** Asserts the balance equals `expected` (BDT). */
  async expectBalance(expected: number): Promise<void> {
    await expect
      .poll(async () => this.getBalance(), {
        message: `expected balance to be ${expected} BDT`,
        timeout: 10_000,
      })
      .toBe(expected);
  }
}
