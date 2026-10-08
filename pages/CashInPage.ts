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

  async cashIn(phone: string, amount: number): Promise<{ trnxId: string }> {
    await this.phone.fill(phone);
    await this.amount.fill(String(amount));
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/transaction/deposit') && r.request().method() === 'POST',
      ),
      this.submit.click(),
    ]);
    const body = await response.json().catch(() => ({} as { message?: string; trnxId?: string }));
    if (response.status() !== 201) {
      const message = String(body.message ?? response.status());
      if (/limit|cannot deposit|not found|inactive|invalid/i.test(message)) {
        throw new Error(`DEPOSIT_REJECTED: ${message}`);
      }
      throw new Error(`Deposit of ${amount} Tk failed (${response.status()}): ${message}`);
    }
    const trnxId = body.trnxId ?? '';
    expect(trnxId, 'Deposit response should include a transaction id').toBeTruthy();
    await expect(this.page.getByText(/success/i).first()).toBeVisible({ timeout: 20_000 });
    return { trnxId };
  }
}
