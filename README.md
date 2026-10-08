# dMoney Playwright Automation 🎭

End-to-end test automation for the **dMoney QA Practice Platform**, built with **Playwright + TypeScript** and the **Page Object Model**.
One automated story walks a new **Agent** through the whole lifecycle — sign-up → admin activation → system funding → agent login (email OTP) → cash-in to a customer → logout → password reset → Self Statement export to CSV — and verifies **20 checkpoints** along the way.

> **Batch 19 · Topic: Playwright** &nbsp;|&nbsp; App under test: <https://dmoneyportal.roadtocareer.net>

---

## 📑 Table of Contents
1. [Demo Video](#-demo-video-headed-mode)
2. [Regression Test Result](#-regression-test-result)
3. [Smoke Test Result](#-smoketest-result)
4. [Scenario](#-scenario)
5. [Test Coverage (20 checkpoints)](#-test-coverage-20-checkpoints)
6. [Smoke vs Regression](#-smoke-vs-regression)
7. [Project Structure](#-project-structure)
8. [Setup](#-setup)
9. [Running the Tests](#-running-the-tests)
10. [CSV Output](#-csv-output)
11. [CI/CD](#-cicd)
12. [Design Notes](#-design-notes)
13. [Author](#-author)

---

## 🎥 Demo Video 


---

## ✅ Regression Test Result

All 20 tests (positive + negative) — `npm run test:regression`


---

## 🚬 SmokeTest Result

Positive test cases only (19 tests) — `npm run test:smoke`


---

## 🧭 Scenario

| # | Step |
|---|------|
| 1 | Open the DMoney Portal |
| 2 | Navigate to **Sign Up** |
| 3 | Register a new user with the **Agent** role |
| 4 | Log in as **Admin** (`admin@dmoney.com` / `1234`) |
| 5 | Locate the new Agent and **activate** the account |
| 6 | Log out from Admin |
| 7 | Log in as **System** (`system@dmoney.com` / `1234`) |
| 8 | Deposit **2000 Tk** into the new Agent |
| 9 | Log out from System |
| 10 | Log in as the new **Agent** (password + email OTP) |
| 11 | Verify Agent balance = **2000 Tk** |
| 12 | Deposit **500 Tk** from the Agent to an existing Customer |
| 13 | Verify the transaction completed successfully |
| 14 | Log out from the Agent |
| 15 | **Reset** the Agent password (Forgot password → e-mail link) |
| 16 | Verify login with the **old** password fails |
| 17 | Log in with the **new** password |
| 18 | Open **Self Statement** |
| 19 | Extract **all** rows of the Self Statement table |
| 20 | Save to `self_statement_<YYYY-MM-DD>.csv` |

---

## 🎯 Test Coverage (20 checkpoints)

The tests are named `TCxx` after the coverage points of the assignment.

| ID | Verification | Tag |
|----|--------------|-----|
| TC01 | Agent registration is successful | `@smoke` |
| TC02 | Newly created Agent is **initially inactive** (Pending) | `@smoke` |
| TC03 | Admin login is successful | `@smoke` |
| TC04 | Newly created Agent appears in the Admin user list | `@smoke` |
| TC05 | Admin can activate the Agent | `@smoke` |
| TC06 | Agent remains active after page reload | `@smoke` |
| TC07 | System login is successful | `@smoke` |
| TC08 | System can deposit 2000 Tk to the Agent | `@smoke` |
| TC09 | System deposit creates the correct transaction record | `@smoke` |
| TC10 | Agent can log in after activation | `@smoke` |
| TC11 | Agent balance is exactly 2000 Tk | `@smoke` |
| TC12 | Agent can deposit 500 Tk to an existing Customer | `@smoke` |
| TC13 | Agent balance is updated correctly after the transaction | `@smoke` |
| TC14 | Customer deposit appears in the Agent's Self Statement | `@smoke` |
| TC15 | Agent logout works successfully | `@smoke` |
| TC16 | Agent password reset works successfully | `@smoke` |
| TC17 | Login with the **old** password fails after reset | `@negative` |
| TC18 | Login with the **new** password succeeds | `@smoke` |
| TC19 | Self Statement contains the expected transaction data | `@smoke` |
| TC20 | Self Statement data is saved into `self_statement_<date>.csv` | `@smoke` |

Every test is also tagged `@regression`.

---

## 🚦 Smoke vs Regression

| Suite | Command | Tests | Content |
|-------|---------|-------|---------|
| **Regression** | `npm run test:regression` | 20 | everything, including the negative case (TC17) |
| **Smoke** | `npm run test:smoke` | 19 | **positive** test cases only (`--grep @smoke`) |

Implemented with Playwright tags:

```ts
const POSITIVE = { tag: ['@smoke', '@regression'] };
const NEGATIVE = { tag: ['@negative', '@regression'] };   // never in smoke
test('TC03 | Admin login is successful', POSITIVE, async ({ auth }) => { ... });
```

---

## 📁 Project Structure

```
.
├── pages/                         # Page Objects - one class per screen / component
│   ├── BasePage.ts                #   shared goto() helper
│   ├── HomePage.ts                #   landing page -> Sign Up
│   ├── RegisterPage.ts            #   registration form (role selection)
│   ├── LoginPage.ts               #   password + OTP step, rejected-login check
│   ├── ForgotPasswordPage.ts      #   request reset -> set new password
│   ├── Navigation.ts              #   logout + Self Statement menu entry
│   ├── AdminUsersPage.ts          #   Admin user list (find a user)
│   ├── AdminUserDetailsPage.ts    #   status check + activate account
│   ├── CashInPage.ts              #   cash-in form (System -> Agent, Agent -> Customer)
│   ├── ProfilePage.ts             #   wallet balance + assertions
│   └── StatementPage.ts           #   Self Statement: open, extract (with pagination)
├── services/
│   ├── AuthService.ts             #   login/logout/reset for Admin, System, Agent
│   └── GmailService.ts            #   reads OTP + reset e-mails through the Gmail API
├── utils/
│   ├── env.ts                     #   typed, central configuration
│   ├── TestDataGenerator.ts       #   unique agent data on every run
│   ├── CsvUtil.ts                 #   CSV writer / parser + file naming
│   ├── DateUtil.ts                #   local YYYY-MM-DD date
│   └── AmountUtil.ts              #   "2000" / "2,000.00" tolerant amount matching
├── tests/
│   ├── fixtures.ts                #   shared browser page, Gmail, auth, failure screenshot
│   └── dmoney-e2e.spec.ts         #   the 20 test cases (TC01 - TC20)
├── output/                        # generated self_statement_<date>.csv lands here
├── docs/                          # screenshots used by this README
├── .github/workflows/             # CI (typecheck + discovery) and self-hosted E2E
├── playwright.config.ts
├── .env.example
└── .gitignore
```

---

## ⚙️ Setup

**Requirements:** Node.js 20+, a Gmail account (the portal e-mails an OTP and the password-reset link).

```bash
git clone https://github.com/<your-username>/dmoney-playwright-automation.git
cd dmoney-playwright-automation
npm install
npx playwright install chromium
cp .env.example .env          # Windows: copy .env.example .env
```

Fill in `.env` (see the comments inside `.env.example`). The important values:

| Variable | Purpose |
|----------|---------|
| `GMAIL_BASE_LOCAL` | Part of your Gmail before `@gmail.com`. Test users are registered as `you+agent123@gmail.com`, so all mails land in your inbox |
| `GMAIL_REFRESH_TOKEN` + `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET` | Lets the framework fetch fresh Gmail tokens automatically **(recommended)** |
| `GMAIL_ACCESS_TOKEN` | Quick alternative to the three above — expires after ~1 hour |
| `EXISTING_CUSTOMER_PHONE` | Phone of an existing **active** customer for the 500 Tk cash-in |
| `AGENT_NEW_PASSWORD` | Password the agent is switched to in the reset step |
| `EXPECTED_AGENT_BALANCE_AFTER_CASHIN` | Only needed if the portal pays commission; default is `2000 − 500 = 1500` |

### Getting Gmail credentials
1. [Google Cloud Console](https://console.cloud.google.com) → create a project → enable the **Gmail API**.
2. OAuth consent screen → *External* → add your Gmail as a **test user**.
3. Create an **OAuth Client ID** (type *Web application*, redirect URI `https://developers.google.com/oauthplayground`).
4. Open the [OAuth Playground](https://developers.google.com/oauthplayground) → ⚙ *Use your own OAuth credentials* → paste the client id/secret → authorize scope `https://www.googleapis.com/auth/gmail.readonly` → *Exchange authorization code for tokens*.
5. Copy the **refresh token** (long-lived) into `GMAIL_REFRESH_TOKEN`, or the access token into `GMAIL_ACCESS_TOKEN`.

---

## ▶️ Running the Tests

```bash
npm run test:regression           # all 20 tests, headless
npm run test:regression:headed    # all 20 tests, visible browser   <- for the demo video
npm run test:smoke                # 19 positive tests, headless
npm run test:smoke:headed         # 19 positive tests, visible browser

npm run report:regression         # open the regression HTML report
npm run report:smoke              # open the smoke HTML report
npm run typecheck                 # TypeScript check only
```

### Recording the demo video
```bash
# Windows PowerShell
$env:SLOW_MO=300; npm run test:regression:headed
# macOS / Linux
SLOW_MO=300 npm run test:regression:headed
```
Record the screen with Xbox Game Bar (`Win + G`), OBS, or QuickTime. Playwright can also save its own recording when `RECORD_VIDEO=true` is set in `.env` → `videos/dmoney-e2e-run.webm`
(GitHub README plays `.mp4`/`.mov`, so convert `.webm` first if you use that one).

---

## 📄 CSV Output

After TC20 the Self Statement is written to:

```
output/self_statement_2026-10-02.csv      # format: self_statement_<YYYY-MM-DD>.csv
```

* Header row = the table's column headers; one CSV row per table row (all pages).
* Fields containing commas/quotes are escaped per RFC 4180.
* TC20 reads the file back and asserts that the **name**, **headers** and **every row** equal what was extracted from the UI.
* The date is today's **local** date.

---

## 🔁 CI/CD

| Workflow | Runner | Purpose |
|----------|--------|---------|
| `playwright.yml` | `ubuntu-latest` | `npm ci` → typecheck → lists both groups (20 regression / 19 smoke) on every push |
| `e2e.yml` | self-hosted | Real browser run (choose **smoke** or **regression**), uploads the HTML report + CSV |

The portal is behind Cloudflare bot-protection that blocks GitHub's shared runner IPs, hence the self-hosted runner for the real browser run.
Secrets: `GMAIL_BASE_LOCAL`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` · Variables: `EXISTING_CUSTOMER_PHONE` (and optionally `EXPECTED_AGENT_BALANCE_AFTER_CASHIN`).

---

## 🧠 Design Notes

* **One story, 20 tests.** The tests run in `serial` mode and share a single browser page, because each step depends on state created by the previous one (the agent, its activation, its balance…). A failure stops the chain instead of producing misleading follow-up failures.
* **Fresh data every run.** Name, e-mail (`you+agentTIMESTAMP@gmail.com`), phone and NID are generated per run — no collisions on re-runs.
* **Real e-mail handling.** OTP and reset mails are read through the Gmail API, filtered by the recipient address of *this* agent so other mails can't be mistaken for it.
* **Tolerant assertions.** Amounts are matched with `amountPattern()` so `2000`, `2,000` and `2,000.00` all count, but `500` never matches inside `1500`.
* **Auth state is explicit.** Before every login the session (cookies + web storage) is cleared, so a test never "accidentally" runs as the previous user.
* **Failure evidence.** A screenshot is attached to the HTML report automatically whenever a test fails.

---

## ✍️ Author
Tasfia Islam Raisha
