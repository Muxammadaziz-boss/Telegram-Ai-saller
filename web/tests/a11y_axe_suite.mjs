import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DASHBOARD_PASSWORD = "mux@mm@d@z1z";

const TABS_TO_AUDIT = [
  { tab: "overview", name: "Overview Dashboard" },
  { tab: "products", name: "Products Catalog" },
  { tab: "orders", name: "Orders Management" },
  { tab: "platform", name: "Platform Owner Center" },
  { tab: "profile", name: "Profile & Appearance" }
];

const THEMES = ["dark", "light"];

const auditReport = {
  timestamp: new Date().toISOString(),
  environment: {
    browser: "Google Chrome",
    standard: "WCAG 2.1 Level AA",
    tags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
  themeAudits: {},
  summary: {
    totalScans: 0,
    cleanPasses: 0,
    totalViolations: 0,
    criticalViolations: 0,
    seriousViolations: 0,
    moderateViolations: 0,
    minorViolations: 0,
  }
};

async function runAccessibilityAudit() {
  console.log("==================================================================");
  console.log("AXE-CORE ACCESSIBILITY AUDIT SUITE (WCAG 2.1 AA) — PHASE 3.1");
  console.log("==================================================================");

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 1. Authenticate
    await page.goto(`${BASE_URL}/#overview`, { waitUntil: "networkidle" });
    const pwdInput = page.locator("#admin-pwd");
    if (await pwdInput.isVisible()) {
      await pwdInput.fill(DASHBOARD_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      await page.waitForLoadState("networkidle");
    }

    for (const theme of THEMES) {
      console.log(`\n======================================================`);
      console.log(`Auditing Theme: ${theme.toUpperCase()}`);
      console.log(`======================================================`);

      // Set theme on html element
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-bs-theme", t);
        localStorage.setItem("ai_sales_theme", t);
      }, theme);
      await page.waitForTimeout(500);

      auditReport.themeAudits[theme] = {};

      for (const item of TABS_TO_AUDIT) {
        console.log(`--> Scanning Tab: #${item.tab} (${item.name})...`);
        await page.goto(`${BASE_URL}/#${item.tab}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);

        auditReport.summary.totalScans++;

        // Run AxeBuilder
        const builder = new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);

        const results = await builder.analyze();

        const violations = results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodesCount: v.nodes.length,
          targetNodes: v.nodes.slice(0, 3).map(n => n.target.join(" ")),
        }));

        for (const v of violations) {
          auditReport.summary.totalViolations++;
          if (v.impact === "critical") auditReport.summary.criticalViolations++;
          else if (v.impact === "serious") auditReport.summary.seriousViolations++;
          else if (v.impact === "moderate") auditReport.summary.moderateViolations++;
          else if (v.impact === "minor") auditReport.summary.minorViolations++;
        }

        if (violations.length === 0) {
          auditReport.summary.cleanPasses++;
          console.log(`    [CLEAN PASS] 0 violations detected on #${item.tab}`);
        } else {
          console.log(`    [NOTICE] ${violations.length} violation types on #${item.tab}:`);
          violations.forEach(v => {
            console.log(`      * [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodesCount} elements)`);
          });
        }

        auditReport.themeAudits[theme][item.tab] = {
          name: item.name,
          passesCount: results.passes.length,
          violationsCount: violations.length,
          violations: violations,
          incompleteCount: results.incomplete.length,
        };
      }
    }

  } catch (err) {
    console.error("A11y Audit Error:", err);
  } finally {
    await browser.close();
  }

  console.log("\n" + "=".repeat(66));
  console.log(`AXE-CORE AUDIT COMPLETE:`);
  console.log(`Total Scans: ${auditReport.summary.totalScans}`);
  console.log(`Clean Passes: ${auditReport.summary.cleanPasses}`);
  console.log(`Total Violations: ${auditReport.summary.totalViolations}`);
  console.log(`Critical: ${auditReport.summary.criticalViolations}, Serious: ${auditReport.summary.seriousViolations}, Moderate: ${auditReport.summary.moderateViolations}`);
  console.log("=".repeat(66));

  fs.writeFileSync(
    path.join(__dirname, "a11y_axe_results.json"),
    JSON.stringify(auditReport, null, 2),
    "utf-8"
  );
}

runAccessibilityAudit().catch(console.error);