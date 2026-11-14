import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BASE_URL, DASHBOARD_PASSWORD, getLaunchOptions, getRunMetadata } from "./test_config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TABS_TO_AUDIT = [
  { tab: "overview", name: "Overview Dashboard" },
  { tab: "products", name: "Products Catalog" },
  { tab: "orders", name: "Orders Management" },
  { tab: "platform", name: "Platform Owner Center" },
  { tab: "profile", name: "Profile & Appearance" }
];

const THEMES = ["dark", "light"];

const auditReport = {
  metadata: getRunMetadata("a11y_axe_suite"),
  environment: {
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
    totalIncompleteItems: 0,
    overall_status: "PENDING",
  },
  incompleteReviewRequired: [],
};

async function runAccessibilityAudit() {
  console.log("==================================================================");
  console.log("AXE-CORE ACCESSIBILITY AUDIT SUITE (WCAG 2.1 AA) — PHASE 3.2 HARDENED");
  console.log(`Target: ${BASE_URL} | Commit: ${auditReport.metadata.commitSha}`);
  console.log("==================================================================");

  let browser;
  try {
    const launchOptions = getLaunchOptions();
    browser = await chromium.launch(launchOptions);
    auditReport.metadata.browserVersion = browser.version();
  } catch (launchErr) {
    console.error("[FATAL ERROR] Browser launch failed:", launchErr.message);
    auditReport.summary.overall_status = "FAILED";
    auditReport.fatal_error = `Browser launch failed: ${launchErr.message}`;
    fs.writeFileSync(
      path.join(__dirname, "a11y_axe_results.json"),
      JSON.stringify(auditReport, null, 2),
      "utf-8"
    );
    process.exit(1);
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 1. Authenticate
    await page.goto(`${BASE_URL}/#overview`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
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
    }

    for (const theme of THEMES) {
      console.log(`\n======================================================`);
      console.log(`Auditing Theme: ${theme.toUpperCase()}`);
      console.log(`======================================================`);

      // Set theme on html element and synchronized classes
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-bs-theme", t);
        document.documentElement.setAttribute("data-theme", t);
        if (t === "light") {
          document.documentElement.classList.remove("theme-dark");
          document.documentElement.classList.add("theme-light");
        } else {
          document.documentElement.classList.remove("theme-light");
          document.documentElement.classList.add("theme-dark");
        }
        localStorage.setItem("ai_sales_theme", t);
      }, theme);
      await page.waitForTimeout(400);

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

        // 1. Process Automated Violations
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

        // 2. Process Incomplete Items (Rules requiring manual / human inspection)
        const incompleteList = results.incomplete.map(inc => ({
          id: inc.id,
          impact: inc.impact || "unspecified",
          description: inc.description,
          help: inc.help,
          helpUrl: inc.helpUrl,
          nodesCount: inc.nodes.length,
          targetNodes: inc.nodes.slice(0, 5).map(n => ({
            target: n.target.join(" "),
            htmlSnippet: n.html ? n.html.slice(0, 120) : "",
            failureSummary: n.failureSummary || "",
          })),
        }));

        auditReport.summary.totalIncompleteItems += incompleteList.length;

        if (incompleteList.length > 0) {
          for (const inc of incompleteList) {
            auditReport.incompleteReviewRequired.push({
              theme,
              tab: item.tab,
              tabName: item.name,
              ruleId: inc.id,
              description: inc.description,
              helpUrl: inc.helpUrl,
              nodesCount: inc.nodesCount,
              sampleNodes: inc.targetNodes,
            });
          }
        }

        if (violations.length === 0) {
          auditReport.summary.cleanPasses++;
          console.log(`    [CLEAN AUTOMATED PASS] 0 violations detected on #${item.tab} (${incompleteList.length} rules flagged for manual review)`);
        } else {
          console.error(`    [AUTOMATED VIOLATION] ${violations.length} violation types on #${item.tab}:`);
          violations.forEach(v => {
            console.error(`      * [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodesCount} elements)`);
          });
        }

        auditReport.themeAudits[theme][item.tab] = {
          name: item.name,
          passesCount: results.passes.length,
          violationsCount: violations.length,
          violations: violations,
          incompleteCount: incompleteList.length,
          incompleteRules: incompleteList.map(i => i.id),
        };
      }
    }

  } catch (err) {
    console.error("[FATAL ERROR] Accessibility Audit Unhandled Exception:", err.message);
    auditReport.summary.totalViolations++;
    auditReport.fatal_error = err.message;
  } finally {
    if (browser) await browser.close();
  }

  const isAutomatedPass = auditReport.summary.totalViolations === 0 && auditReport.summary.totalScans > 0;
  auditReport.summary.overall_status = isAutomatedPass ? "AUTOMATED_PASS_MANUAL_REVIEW_PENDING" : "FAILED";

  console.log("\n" + "=".repeat(66));
  console.log(`AXE-CORE AUDIT SUMMARY:`);
  console.log(`Total Scans:               ${auditReport.summary.totalScans}`);
  console.log(`Clean Automated Passes:    ${auditReport.summary.cleanPasses}`);
  console.log(`Automated Violations:      ${auditReport.summary.totalViolations}`);
  console.log(`Incomplete Checks (Manual): ${auditReport.summary.totalIncompleteItems}`);
  console.log(`Status:                    ${auditReport.summary.overall_status}`);
  console.log("=".repeat(66));

  fs.writeFileSync(
    path.join(__dirname, "a11y_axe_results.json"),
    JSON.stringify(auditReport, null, 2),
    "utf-8"
  );

  if (!isAutomatedPass) {
    process.exit(1);
  }
}

runAccessibilityAudit().catch((fatal) => {
  console.error("[FATAL UNCAUGHT]:", fatal);
  process.exit(1);
});
