import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Cash-in screen (`/agent/cash-in`) - used by System (-> agent) and Agent (-> customer). */
export class CashInPage extends BasePage {
  private get phone(): Locator {
    return this.page.getByRole('textbox', { name: 'Customer Phone Number' });
  }
  private get amount(): Locator {
    return this.page.getByRole('spinbutton', { name: 'Amount (BDT)' });
  }
  private get submit(): Locator {
    return this.page.getByRole('button', { name: /Cash In/ });
  }

  async open(): Promise<void> {
    await this.goto('/agent/cash-in');
    await expect(this.phone).toBeVisible();
  }

  async cashIn(phone: string, amount: number): Promise<void> {
    await this.phone.fill(phone);
    await this.amount.fill(String(amount));
    await this.submit.click();
  }

  /** The app shows a transient success notification; matched loosely on purpose. */
  async expectSuccess(): Promise<void> {
    await expect(
      this.page.getByText(/success|successful|cash.?in successful/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  }
}
