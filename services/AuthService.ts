import { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { Navigation } from '../pages/Navigation';
import { GmailService } from './GmailService';
import { UserData } from '../utils/TestDataGenerator';
import { ENV } from '../utils/env';

/** Login / logout / password-reset orchestration for Admin, System and Agent. */
export class AuthService {
  private readonly login: LoginPage;
  private readonly forgot: ForgotPasswordPage;
  private readonly nav: Navigation;

  constructor(
    private readonly page: Page,
    private readonly gmail: GmailService,
  ) {
    this.login = new LoginPage(page);
    this.forgot = new ForgotPasswordPage(page);
    this.nav = new Navigation(page);
  }

  /** Drops any previous session (cookies + web storage) and shows a clean login form. */
  async resetSession(): Promise<void> {
    await this.page.context().clearCookies();
    await this.page.goto('/login'); // a logged-in user may be bounced from here
    await this.page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await this.login.open();
  }

  private async loginWithPassword(identifier: string, password: string): Promise<void> {
    await this.resetSession();
    await this.login.submitCredentials(identifier, password);
    await this.page.waitForURL(/profile\/*/);
  }

  async loginAsAdmin(): Promise<void> {
    await this.loginWithPassword(ENV.admin.email, ENV.admin.password);
  }

  async loginAsSystem(): Promise<void> {
    await this.loginWithPassword(ENV.system.email, ENV.system.password);
  }

  /** Agent login = password step + e-mail OTP step (read from Gmail). */
  async loginAsAgent(agent: UserData, password: string = agent.password): Promise<void> {
    await this.resetSession();

    const knownMail = await this.gmail.listIds(agent.email, 'Login OTP');
    await this.login.submitCredentials(agent.email, password);

    const mail = await this.gmail.waitForNewMessage(agent.email, knownMail, { subject: 'Login OTP' });
    const otp = GmailService.extractOtp(mail);
    if (!otp) throw new Error(`Login OTP was not found in the email. Snippet: ${mail.snippet}`);
    await this.login.completeOtp(otp);
  }

  /** Negative path: submit credentials that must be rejected. */
  async attemptLoginExpectingFailure(identifier: string, password: string): Promise<void> {
    await this.resetSession();
    await this.login.submitCredentials(identifier, password);
    await this.login.expectLoginRejected();
  }

  async logout(): Promise<void> {
    await this.nav.logout();
    await this.nav.expectLoggedOut();
  }

  /**
   * "Forgot password" flow for an (already logged-out) user:
   * request reset -> read the e-mail -> open the link / enter the code -> set new password.
   */
  async resetPassword(user: UserData, newPassword: string): Promise<void> {
    const knownMail = await this.gmail.listIds(user.email, 'Password Reset');

    await this.page.goto('/forgot-password');
    await this.forgot.requestReset(user.email);

    const mail = await this.gmail.waitForNewMessage(user.email, knownMail, { subject: 'Password Reset' });
    const link = GmailService.extractResetLink(mail, new URL(ENV.baseURL).host);
    if (!link) {
      throw new Error(`Password reset link was not found in the email. Snippet: ${mail.snippet}`);
    }
    await this.page.goto(link);
    await this.forgot.setNewPassword(newPassword);
  }
}
