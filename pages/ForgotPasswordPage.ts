import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Forgot-password -> (e-mail with link/code) -> set-new-password screens. */
export class ForgotPasswordPage extends BasePage {
  private get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: /email|phone/i }).first();
  }
  private get codeInput(): Locator {
    return this.page.getByRole('textbox', { name: /otp|code/i }).first();
  }
  private get newPassword(): Locator {
    return this.page.getByLabel(/new password/i).or(this.page.getByLabel(/^password/i)).first();
  }
  private get confirmPassword(): Locator {
    return this.page.getByLabel(/confirm/i).first();
  }
  private get submit(): Locator {
    return this.page
      .getByRole('button', { name: /send|reset|submit|continue|verify|update|change|save/i })
      .first();
  }

  async requestReset(email: string): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await this.emailInput.fill(email);
    await this.submit.click();
  }

  /** Some builds e-mail a code instead of a link - enter it if the field is shown. */
  async enterCodeIfAsked(code: string): Promise<void> {
    if (code && (await this.codeInput.isVisible().catch(() => false))) {
      await this.codeInput.fill(code);
      await this.submit.click();
    }
  }

  async setNewPassword(password: string): Promise<void> {
    const passwordFields = this.page.locator('input[type="password"]');
    await expect(passwordFields.first()).toBeVisible({ timeout: 20_000 });
    await passwordFields.nth(0).fill(password);
    if (await passwordFields.nth(1).isVisible().catch(() => false)) {
      await passwordFields.nth(1).fill(password);
    }
    await this.page.getByRole('button', { name: /reset password/i }).click();
  }

  /** Success toast/message OR being sent back to the login page. */
  async expectResetSuccess(): Promise<void> {
    const message = this.page
      .getByText(/password.*(reset|changed|updated|success)|success.*password/i)
      .first();
    await expect
      .poll(
        async () => (await message.isVisible().catch(() => false)) || /\/login/.test(this.page.url()),
        { message: 'expected a password-reset success message or redirect to /login', timeout: 20_000 },
      )
      .toBe(true);
  }
}
