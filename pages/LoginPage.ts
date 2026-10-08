import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The login page ("/login").
 *
 *  - Seeded accounts (admin/system): password only, redirected straight in.
 *  - Registered users (agent/customer): password, then a 4-digit email OTP step.
 */
export class LoginPage extends BasePage {
  private get identifier(): Locator {
    return this.page.getByRole('textbox', { name: 'Email or Phone Number' });
  }
  private get password(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }
  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login →' });
  }
  private get otpInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Enter 4-Digit OTP' });
  }

  async open(): Promise<void> {
    await this.goto('/login');
    await expect(this.identifier).toBeVisible();
  }

  /** Fills credentials and submits. Does not wait for what comes next. */
  async submitCredentials(identifier: string, password: string): Promise<void> {
    await this.identifier.fill(identifier);
    await this.password.fill(password);
    await this.loginButton.click();
  }

  /** Enters the OTP, verifies it, and waits for the profile page to load. */
  async completeOtp(otp: string): Promise<void> {
    await this.otpInput.fill(otp);
    await this.page.getByRole('button', { name: 'Verify OTP →' }).click();
    await this.page.waitForURL(/profile\/*/);
  }

  async clickForgotPassword(): Promise<void> {
    await this.page.getByRole('link', { name: /forgot/i }).or(
      this.page.getByRole('button', { name: /forgot/i }),
    ).first().click();
  }

  /**
   * Negative check: after submitting wrong credentials the user must stay on
   * the login page, see an error, and must NOT be asked for an OTP / get in.
   */
  async expectLoginRejected(): Promise<void> {
    await expect(
      this.page.getByText(/invalid|incorrect|wrong|failed|not match|unauthori[sz]ed|denied/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.otpInput).toHaveCount(0);
  }
}
