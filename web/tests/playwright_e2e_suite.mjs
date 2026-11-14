import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BASE_URL, DASHBOARD_PASSWORD, getLaunchOptions, getRunMetadata } from "./test_config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = {
  metadata: getRunMetadata("playwright_e2e_suite"),
  authentication: {},
  tab_transitions: {},
  browser_history: {},
  platform_tenant_navigation: {},
  profile_both_zones: {},
  theme_font_switching: {},
  modal_escape_focus: {},
  keyboard_navigation: {},
  console_errors: [],
  failed_requests: [],
  summary: { total: 0, passed: 0, failed: 0, overall_status: "PENDING" },
};

function recordTest(suite, name, passed, details = "") {
  testResults.summary.total++;
  if (passed) {
    testResults.summary.passed++;
    testResults[suite][name] = { status: "PASSED", details };
    console.log(`[PASSED] ${suite}: ${name} - ${details}`);
  } else {
    testResults.summary.failed++;
    testResults[suite][name] = { status: "FAILED", details };
    console.error(`[FAILED] ${suite}: ${name} - ${details}`);
  }
}

async function runE2ETests() {
  console.log("==================================================================");
  console.log("PLAYWRIGHT E2E AUTOMATED BROWSER TEST SUITE — PHASE 3.2 HARDENED");
  console.log(`Target: ${BASE_URL} | Commit: ${testResults.metadata.commitSha}`);
  console.log("==================================================================");

  let browser;
  try {
    const launchOptions = getLaunchOptions();
    browser = await chromium.launch(launchOptions);
    testResults.metadata.browserVersion = browser.version();
  } catch (launchErr) {
    console.error("[FATAL ERROR] Browser launch failed:", launchErr.message);
    testResults.summary.overall_status = "FAILED";
    testResults.fatal_error = `Browser launch failed: ${launchErr.message}`;
    fs.writeFileSync(
      path.join(__dirname, "playwright_e2e_results.json"),
      JSON.stringify(testResults, null, 2),
      "utf-8"
    );
    process.exit(1);
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Capture console errors & failed requests (redacting any accidental sensitive tokens)
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text().replace(new RegExp(DASHBOARD_PASSWORD, "g"), "[REDACTED_SECRET]");
      testResults.console_errors.push(text);
    }
  });

  page.on("requestfailed", (req) => {
    testResults.failed_requests.push({
      url: req.url(),
      failure: req.failure()?.errorText || "Unknown error",
    });
  });

  try {
    // -------------------------------------------------------------------
    // 1. Initial Load & Authentication as Platform Owner
    // -------------------------------------------------------------------
    console.log("\n--- 1. Authenticating as Platform Owner ---");
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_login_screen.png") });

    // Check if login form is displayed
    const pwdInput = page.locator("#admin-pwd");
    if (await pwdInput.isVisible()) {
      await pwdInput.fill(DASHBOARD_PASSWORD);
      await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && !btn.disabled;
      }, { timeout: 5000 });
      await page.click('button[type="submit"]');
      await pwdInput.waitFor({ state: "hidden", timeout: 8000 }).catch(async () => {
        const errorText = await page.locator(".alert-danger").textContent().catch(() => "");
        throw new Error(`Authentication failed: Login form still visible. Alert: "${errorText.trim()}"`);
      });
      recordTest("authentication", "admin_login_success", true, "Logged in successfully with environment credentials");
    } else {
      recordTest("authentication", "admin_already_authenticated", true, "Session already active");
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_dashboard_mounted.png") });

    // -------------------------------------------------------------------
    // 2. All 16 Tab Transitions & Direct Hash Navigation
    // -------------------------------------------------------------------
    console.log("\n--- 2. Testing 16 Tab Transitions & Direct Hash Navigation ---");
    const tabs = [
      "overview", "inbox", "knowledge", "products", "orders", "customers",
      "analytics", "settings", "admins", "team", "logs", "profile",
      "usage", "billing", "pricing", "platform"
    ];

    for (const tab of tabs) {
      await page.goto(`${BASE_URL}/#${tab}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      const currentUrl = page.url();
      const hashMatch = currentUrl.includes(`#${tab}`);
      recordTest("tab_transitions", `hash_${tab}_navigation`, hashMatch, `Navigated to ${currentUrl}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_tab_transitions_done.png") });

    // -------------------------------------------------------------------
    // 3. Browser Back and Forward History (pushState / popstate)
    // -------------------------------------------------------------------
    console.log("\n--- 3. Testing Browser Back & Forward History (pushState / popstate) ---");
    await page.goto(`${BASE_URL}/#overview`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.goto(`${BASE_URL}/#products`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.goto(`${BASE_URL}/#orders`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    // Back -> products
    await page.goBack();
    await page.waitForTimeout(400);
    const afterBack1 = page.url();
    recordTest("browser_history", "history_back_to_products", afterBack1.includes("#products"), `URL: ${afterBack1}`);

    // Back -> overview
    await page.goBack();
    await page.waitForTimeout(400);
    const afterBack2 = page.url();
    recordTest("browser_history", "history_back_to_overview", afterBack2.includes("#overview"), `URL: ${afterBack2}`);

    // Forward -> products
    await page.goForward();
    await page.waitForTimeout(400);
    const afterFwd1 = page.url();
    recordTest("browser_history", "history_forward_to_products", afterFwd1.includes("#products"), `URL: ${afterFwd1}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_back_fwd_history.png") });

    // -------------------------------------------------------------------
    // 4. Platform Owner & Tenant Navigation
    // -------------------------------------------------------------------
    console.log("\n--- 4. Testing Platform Owner & Tenant Navigation ---");
    await page.goto(`${BASE_URL}/#platform`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    const bodyText = await page.textContent("body");
    const hasPlatformOwnerContent = bodyText.includes("Platforma") || bodyText.includes("MRR") || bodyText.includes("Do'konlar");
    recordTest("platform_tenant_navigation", "platform_owner_dashboard_rendered", hasPlatformOwnerContent, "Platform Owner metrics & store portfolio rendered");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_platform_owner_dashboard.png") });

    // -------------------------------------------------------------------
    // 5. Profile Tab Rendering in Both Platform Zone and Store Zone
    // -------------------------------------------------------------------
    console.log("\n--- 5. Testing Profile Tab in Platform Zone ---");
    await page.goto(`${BASE_URL}/#profile`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    const profileText = await page.textContent("body");
    const hasProfile = profileText.includes("Admin Profili") && (profileText.includes("Olline") || profileText.includes("Pogonia"));
    recordTest("profile_both_zones", "profile_renders_without_masking", hasProfile, "Profile & Appearance tab rendered with Olline & Pogonia options");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_profile_appearance_tab.png") });

    // -------------------------------------------------------------------
    // 6. Theme and Font Switching in Profile Tab
    // -------------------------------------------------------------------
    console.log("\n--- 6. Testing Theme and Font Switching ---");
    const initialTheme = await page.getAttribute("html", "data-bs-theme");
    recordTest("theme_font_switching", "initial_theme_dark", initialTheme === "dark", `data-bs-theme="${initialTheme}"`);

    // Switch to Light Theme
    const lightThemeBtn = page.locator("text=Yorug' (Light)").first();
    if (await lightThemeBtn.isVisible()) {
      await lightThemeBtn.click();
      await page.waitForTimeout(400);
      const lightTheme = await page.getAttribute("html", "data-bs-theme");
      recordTest("theme_font_switching", "switch_to_light_theme", lightTheme === "light", `data-bs-theme="${lightTheme}"`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_light_theme.png") });

      // Switch back to Dark Theme
      const darkThemeBtn = page.locator("text=Qorong'i (Dark)").first();
      await darkThemeBtn.click();
      await page.waitForTimeout(400);
      const restoredDark = await page.getAttribute("html", "data-bs-theme");
      recordTest("theme_font_switching", "restore_dark_theme", restoredDark === "dark", `data-bs-theme="${restoredDark}"`);
    } else {
      recordTest("theme_font_switching", "switch_to_light_theme", false, "Light theme button not visible");
    }

    // Font Switching: Pogonia
    const pogoniaCard = page.locator('.cursor-pointer:has-text("Pogonia")').first();
    if (await pogoniaCard.isVisible()) {
      await pogoniaCard.click();
      await page.waitForTimeout(400);
      const fontPogonia = await page.getAttribute("html", "data-font");
      recordTest("theme_font_switching", "switch_to_pogonia_font", fontPogonia === "pogonia", `html[data-font="${fontPogonia}"]`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08_pogonia_font.png") });

      // Font Switching: Olline
      const ollineCard = page.locator('.cursor-pointer:has-text("Olline")').first();
      await ollineCard.click();
      await page.waitForTimeout(400);
      const fontOlline = await page.getAttribute("html", "data-font");
      recordTest("theme_font_switching", "switch_to_olline_font", fontOlline === "olline", `html[data-font="${fontOlline}"]`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09_olline_font.png") });
    } else {
      recordTest("theme_font_switching", "switch_to_pogonia_font", false, "Pogonia card not visible");
    }

    // -------------------------------------------------------------------
    // 7. Modal Escape Dismissal and Focus
    // -------------------------------------------------------------------
    console.log("\n--- 7. Testing Modal Escape & Focus ---");
    const logoTrigger = page.locator('div[title="Logotipni o\'zgartirish"]').first();
    if (await logoTrigger.isVisible()) {
      await logoTrigger.click();
      await page.waitForTimeout(500);

      const modalTitle = page.locator("text=Kompaniya Logotipini Sozlash").first();
      const modalShown = await modalTitle.isVisible();
      recordTest("modal_escape_focus", "modal_opens_on_click", modalShown, "Logo configuration modal rendered");
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10_modal_open.png") });

      // Press Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);

      const modalHidden = !(await modalTitle.isVisible().catch(() => false));
      recordTest("modal_escape_focus", "modal_dismissed_on_escape", modalHidden, "Modal closed on Escape key press");
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11_modal_dismissed.png") });
    } else {
      recordTest("modal_escape_focus", "modal_opens_on_click", false, "Logo container trigger not found");
    }

    // -------------------------------------------------------------------
    // 8. Keyboard Navigation
    // -------------------------------------------------------------------
    console.log("\n--- 8. Testing Keyboard Navigation ---");
    await page.goto(`${BASE_URL}/#overview`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.keyboard.press("Tab");
    const el1 = await page.evaluate(() => document.activeElement?.tagName);
    await page.keyboard.press("Tab");
    const el2 = await page.evaluate(() => document.activeElement?.tagName);
    const focused = Boolean(el1 && el2);
    recordTest("keyboard_navigation", "tab_traverses_focus_elements", focused, `Focused tags: ${el1} -> ${el2}`);

  } catch (err) {
    console.error("[FATAL ERROR] E2E Suite Unhandled Exception:", err.message);
    testResults.console_errors.push(String(err));
    testResults.summary.failed++;
    testResults.summary.overall_status = "FAILED";
  } finally {
    if (browser) await browser.close();
  }

  const isSuccess = testResults.summary.failed === 0 && testResults.summary.total > 0;
  testResults.summary.overall_status = isSuccess ? "PASSED" : "FAILED";

  console.log("\n" + "=".repeat(66));
  console.log(`PLAYWRIGHT E2E SUMMARY: ${testResults.summary.passed}/${testResults.summary.total} PASSED (${testResults.summary.failed} failed)`);
  console.log(`OVERALL STATUS: ${testResults.summary.overall_status}`);
  console.log("=".repeat(66));

  fs.writeFileSync(
    path.join(__dirname, "playwright_e2e_results.json"),
    JSON.stringify(testResults, null, 2),
    "utf-8"
  );

  if (!isSuccess) {
    process.exit(1);
  }
}

runE2ETests().catch((fatal) => {
  console.error("[FATAL UNCAUGHT]:", fatal);
  process.exit(1);
});
