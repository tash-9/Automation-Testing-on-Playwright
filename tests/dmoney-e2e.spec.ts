import fs from 'fs';
import path from 'path';
import { test, expect } from './fixtures';
import { ENV } from '../utils/env';
import { TestDataGenerator, UserData } from '../utils/TestDataGenerator';
import { parseCsv, saveSelfStatementCsv, selfStatementFileName, TableData } from '../utils/CsvUtil';
import { Browser } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminUserDetailsPage } from '../pages/AdminUserDetailsPage';
import { CashInPage } from '../pages/CashInPage';
import { ProfilePage } from '../pages/ProfilePage';
import { StatementPage } from '../pages/StatementPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { Navigation } from '../pages/Navigation';

/**
 * Tags
 *   @regression  -> every test (positive + negative)
 *   @smoke       -> positive test cases only
 *   @negative    -> negative test cases (never part of the smoke suite)
 */
const POSITIVE = { tag: ['@smoke', '@regression'] };
const NEGATIVE = { tag: ['@negative', '@regression'] };

const { systemDeposit, customerDeposit, agentBalanceAfterCashIn } = ENV.amounts;

/** Used only when the configured customer rejects the 500 Tk cash-in. */
async function createActiveCustomer(browser: Browser, avoidEmail: string): Promise<string> {
  const customer = TestDataGenerator.uniqueCustomer(ENV.gmail.baseLocal, ENV.agentPassword);
  if (customer.email === avoidEmail) customer.email = customer.email.replace('@', '.x@');
  const context = await browser.newContext({ baseURL: ENV.baseURL });
  try {
    const page = await context.newPage();
    const register = new RegisterPage(page);
    await register.open();
    await register.register(customer, 'Customer');
    await register.expectRegistrationSuccess();

    const login = new LoginPage(page);
    await login.open();
    await login.submitCredentials(ENV.admin.email, ENV.admin.password);
    await page.waitForURL(/profile/);

    const adminUsers = new AdminUsersPage(page);
    await adminUsers.open();
    const details = await adminUsers.openUserByEmail(customer.email);
    await details.activate();
    return customer.phone;
  } finally {
    await context.close();
  }
}

// The journey is ONE story: each test needs the state left by the previous one.
test.describe.configure({ mode: 'serial' });

test.describe('dMoney - Agent end-to-end journey', () => {
  // ---- state shared between the tests of the journey ------------------------
  let agent: UserData;
  let newPassword: string;
  let customerPhone: string;
  let selfStatement: TableData;
  let csvPath: string;

  let home: HomePage;
  let register: RegisterPage;
  let adminUsers: AdminUsersPage;
  let userDetails: AdminUserDetailsPage;
  let cashIn: CashInPage;
  let profile: ProfilePage;
  let statement: StatementPage;
  let forgot: ForgotPasswordPage;
  let nav: Navigation;

  test.beforeAll(async ({ sharedPage }) => {
    agent = TestDataGenerator.uniqueAgent(ENV.gmail.baseLocal, ENV.agentPassword);
    newPassword = ENV.agentNewPassword;
    customerPhone = ENV.existingCustomerPhone;

    home = new HomePage(sharedPage);
    register = new RegisterPage(sharedPage);
    adminUsers = new AdminUsersPage(sharedPage);
    userDetails = new AdminUserDetailsPage(sharedPage);
    cashIn = new CashInPage(sharedPage);
    profile = new ProfilePage(sharedPage);
    statement = new StatementPage(sharedPage);
    forgot = new ForgotPasswordPage(sharedPage);
    nav = new Navigation(sharedPage);
  });

  // ===========================================================================
  // Registration
  // ===========================================================================
  test('TC01 | Agent registration is successful', POSITIVE, async () => {
    await test.step('Open the portal and go to Sign Up', async () => {
      await home.open();
      await home.clickSignUp();
      await register.expectLoaded();
    });
    await test.step('Register a new user with the Agent role', async () => {
      await register.register(agent, 'Agent');
      await register.expectRegistrationSuccess();
    });
  });

  // ===========================================================================
  // Admin
  // ===========================================================================
  test('TC03 | Admin login is successful', POSITIVE, async ({ auth }) => {
    await auth.loginAsAdmin();
    await nav.expectLoggedIn();
  });

  test('TC04 | Newly created Agent appears in the Admin user list', POSITIVE, async () => {
    await adminUsers.open();
    await adminUsers.expectUserListed(agent.email);
  });

  test('TC02 | Newly created Agent is initially inactive (Pending)', POSITIVE, async () => {
    userDetails = await adminUsers.openUserByEmail(agent.email);
    await userDetails.expectPending();
  });

  test('TC05 | Admin can activate the Agent', POSITIVE, async () => {
    await userDetails.activate();
  });

  test('TC06 | Agent remains active after page reload', POSITIVE, async ({ auth }) => {
    await userDetails.reload();
    await userDetails.expectActive();

    await test.step('Log out from the Admin account', async () => {
      await auth.logout();
    });
  });

  // ===========================================================================
  // System
  // ===========================================================================
  test('TC07 | System login is successful', POSITIVE, async ({ auth }) => {
    await auth.loginAsSystem();
    await nav.expectLoggedIn();
  });

  test(`TC08 | System can deposit ${systemDeposit} Tk to the Agent`, POSITIVE, async () => {
    await cashIn.open();
    await cashIn.cashIn(agent.phone, systemDeposit);
  });

  test('TC09 | System deposit creates the correct transaction record', POSITIVE, async ({ auth }) => {
    await statement.open();
    // The System account is shared (huge history) -> look at the newest pages only.
    const data = await statement.extractAll(5);
    expect(
      StatementPage.hasRowWith(data, systemDeposit, [agent.phone, agent.fullName, agent.email]),
      `System statement should contain a ${systemDeposit} Tk row for ${agent.phone}`,
    ).toBe(true);

    await test.step('Log out from the System account', async () => {
      await auth.logout();
    });
  });

  // ===========================================================================
  // Agent
  // ===========================================================================
  test('TC10 | Agent can log in after activation', POSITIVE, async ({ auth }) => {
    await auth.loginAsAgent(agent);
    await nav.expectLoggedIn();
  });

  test(`TC11 | Agent balance is exactly ${systemDeposit} Tk`, POSITIVE, async () => {
    await profile.open();
    await profile.expectBalance(systemDeposit);
  });

  test(`TC12 | Agent can deposit ${customerDeposit} Tk to an existing Customer`, POSITIVE, async ({ browser }) => {
    await cashIn.open();
    try {
      await cashIn.cashIn(customerPhone, customerDeposit);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('DEPOSIT_REJECTED:')) throw error;
      customerPhone = await createActiveCustomer(browser, agent.email);
      await cashIn.open();
      await cashIn.cashIn(customerPhone, customerDeposit);
    }
  });

  test('TC13 | Agent balance is updated correctly after the transaction', POSITIVE, async () => {
    await profile.open();
    await profile.expectBalance(agentBalanceAfterCashIn);
  });

  test("TC14 | Customer deposit appears in the Agent's Self Statement", POSITIVE, async () => {
    await statement.open();
    const data = await statement.extractAll();
    expect(
      StatementPage.hasRowWith(data, customerDeposit, [customerPhone]),
      `Self Statement should contain a ${customerDeposit} Tk row for ${customerPhone}`,
    ).toBe(true);
  });

  test('TC15 | Agent logout works successfully', POSITIVE, async ({ auth }) => {
    await auth.logout();
  });

  // ===========================================================================
  // Password reset
  // ===========================================================================
  test('TC16 | Agent password reset works successfully', POSITIVE, async ({ auth }) => {
    await auth.resetPassword(agent, newPassword);
    await forgot.expectResetSuccess();
  });

  test('TC17 | Login with the OLD password fails after reset', NEGATIVE, async ({ auth }) => {
    await auth.attemptLoginExpectingFailure(agent.phone, agent.password);
  });

  test('TC18 | Login with the NEW password succeeds', POSITIVE, async ({ auth }) => {
    await auth.loginAsAgent(agent, newPassword);
    await nav.expectLoggedIn();
  });

  // ===========================================================================
  // Self Statement -> CSV
  // ===========================================================================
  test('TC19 | Self Statement contains the expected transaction data', POSITIVE, async () => {
    await statement.open();
    selfStatement = await statement.extractAll();

    expect(selfStatement.headers.length, 'table must have column headers').toBeGreaterThan(0);
    expect(selfStatement.rows.length, 'table must have data rows').toBeGreaterThanOrEqual(2);
    expect(
      StatementPage.hasRowWith(selfStatement, systemDeposit),
      `statement should contain the ${systemDeposit} Tk deposit received from System`,
    ).toBe(true);
    expect(
      StatementPage.hasRowWith(selfStatement, customerDeposit, [customerPhone]),
      `statement should contain the ${customerDeposit} Tk cash-in to ${customerPhone}`,
    ).toBe(true);
  });

  test('TC20 | Self Statement data is saved to self_statement_<date>.csv', POSITIVE, async ({}, testInfo) => {
    csvPath = saveSelfStatementCsv(selfStatement, ENV.outputDir);

    // 1. file exists with the required name
    expect(fs.existsSync(csvPath)).toBe(true);
    expect(path.basename(csvPath)).toBe(selfStatementFileName());
    expect(path.basename(csvPath)).toMatch(/^self_statement_\d{4}-\d{2}-\d{2}\.csv$/);

    // 2. what is on disk equals what was extracted from the UI
    const saved = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    expect(saved[0]).toEqual(selfStatement.headers);
    expect(saved.slice(1)).toEqual(selfStatement.rows);

    await testInfo.attach(path.basename(csvPath), { path: csvPath, contentType: 'text/csv' });
  });
});
