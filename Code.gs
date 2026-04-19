/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║              FAMILY BANK — Code.gs (Google Apps Script)          ║
 * ║                     Backend & Email Engine                        ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * HOW TO DEPLOY (do this in order, every time you update this file):
 *
 *   STEP 1 — Edit the CONFIG block below to match your family
 *   STEP 2 — Paste this entire file into the Apps Script editor
 *   STEP 3 — Click Save (floppy disk icon or Ctrl+S)
 *   STEP 4 — Select "grantEmailPermission" in the dropdown → click Run
 *             (approve any permissions it asks for)
 *   STEP 5 — Select "setupBank" in the dropdown → click Run
 *             Check the Execution Log — it should say "setupBank: done."
 *   STEP 6 — Click Deploy → Manage Deployments
 *             Click the pencil/edit icon on your deployment
 *             Change Version to "New version" → click Deploy
 *   STEP 7 — Copy the Web App URL → paste into index.html at API_URL
 *
 * NOTE: If this is your very first deployment, use "New Deployment"
 *       instead of editing an existing one in Step 6.
 */

// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        ★ CONFIGURATION ★                         ║
// ║          Edit this block before deploying. Nothing else           ║
// ║          in this file needs to change for a basic setup.          ║
// ╚═══════════════════════════════════════════════════════════════════╝

// ------------------------------------------------------------------
// BANK IDENTITY
// ------------------------------------------------------------------
var BANK_NAME    = "Family Bank";          // ← Your bank name
var BANK_TAGLINE = "Your money, your future."; // ← Shown on login screen

// ------------------------------------------------------------------
// TIMEZONE
// Choices: "America/New_York"  "America/Chicago"  "America/Denver"
//          "America/Los_Angeles"  "UTC"  "Europe/London"
// ------------------------------------------------------------------
var BANK_TIMEZONE = "America/New_York";    // ← Your timezone

// ------------------------------------------------------------------
// FALLBACK EMAILS
// These are used only if emails haven't been set in the Admin panel.
// For full per-user email control, set them in the app's Admin panel.
// ------------------------------------------------------------------
var FALLBACK_PARENT_EMAIL = "your.email@gmail.com"; // ← Parent email
var FALLBACK_CHILD_EMAIL  = "child@gmail.com";       // ← Child email

// ------------------------------------------------------------------
// DEFAULT USERS
// These are only used when the bank is set up for the very first time
// (i.e. when Sheet1 cell A1 is empty). After first run, users are
// managed through the app's Admin panel.
// ------------------------------------------------------------------
var DEFAULT_PARENT_NAME = "Dad";           // ← Parent display name
var DEFAULT_PARENT_PIN  = "0000";          // ← Parent PIN
var DEFAULT_CHILD_NAME  = "Linnea";        // ← Child display name
var DEFAULT_CHILD_PIN   = "1234";          // ← Child PIN

// ------------------------------------------------------------------
// DEFAULT STARTING BALANCES (first-time setup only)
// ------------------------------------------------------------------
var DEFAULT_CHECKING_BALANCE = 0;          // ← Starting checking balance
var DEFAULT_SAVINGS_BALANCE  = 0;          // ← Starting savings balance

// ------------------------------------------------------------------
// DEFAULT INTEREST RATES — Annual % (first-time setup only)
// Example: 6 means 6% APY, applied monthly as 6/12 = 0.5% per month
// ------------------------------------------------------------------
var DEFAULT_CHECKING_RATE = 0;             // ← Annual % for checking
var DEFAULT_SAVINGS_RATE  = 0;             // ← Annual % for savings

// ------------------------------------------------------------------
// DEFAULT WEEKLY ALLOWANCE (first-time setup only)
// ------------------------------------------------------------------
var DEFAULT_ALLOWANCE_CHECKING = 0;        // ← Weekly $ to checking
var DEFAULT_ALLOWANCE_SAVINGS  = 0;        // ← Weekly $ to savings

// ------------------------------------------------------------------
// ADMIN PIN (first-time setup only — change in app Admin panel after)
// ------------------------------------------------------------------
var DEFAULT_ADMIN_PIN = "9999";            // ← Admin panel PIN

// ------------------------------------------------------------------
// BRANDING COLORS (first-time setup only — change in app Admin panel)
// Use hex color codes. Primary = buttons/checking. Secondary = savings.
// ------------------------------------------------------------------
var DEFAULT_COLOR_PRIMARY   = "#2563eb";   // ← Blue (checking/buttons)
var DEFAULT_COLOR_SECONDARY = "#10b981";   // ← Green (savings/deposits)

// ------------------------------------------------------------------
// APP URL — link included in all emails so recipients can tap directly
// into the app. Change this to your GitHub Pages URL.
// ------------------------------------------------------------------
var APP_URL = "https://dmike1379.github.io/dfb.github.io/"; // ← Your app URL

// ------------------------------------------------------------------
// VERSION — update when deploying
// ------------------------------------------------------------------
var CODE_VERSION = "v33.0";   // ← increment on each Code.gs redeploy

// ------------------------------------------------------------------
// EMAIL APPROVAL SECRET KEY
// A secret string used to generate secure one-time approval tokens.
// Change this to any random string you like. Keep it private.
// ------------------------------------------------------------------
var APPROVAL_SECRET = "FamilyBank2026SecretKey"; // ← Change to something unique

// ------------------------------------------------------------------
// DEBUGGING — set to true to see detailed logs in Apps Script
// ------------------------------------------------------------------
var DEBUG_LOGGING = false;

// ╔═══════════════════════════════════════════════════════════════════╗
// ║              END OF CONFIGURATION — DO NOT EDIT BELOW            ║
// ╚═══════════════════════════════════════════════════════════════════╝


// ================================================================
// [DOGET] — Frontend fetches state + history
// ================================================================
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};

    // ── Email approve/deny action handler (chores) ──
    if (params.action === "approve" || params.action === "deny") {
      return handleEmailAction(params);
    }

    // ── Email approve/deny action handler (deposits) ──
    if (params.action === "depositApprove" || params.action === "depositDeny") {
      return handleDepositEmailAction(params);
    }

    // ── Email approve/deny action handler (withdrawals) — v35.0 Item 2 ──
    if (params.action === "withdrawApprove" || params.action === "withdrawDeny") {
      return handleWithdrawalEmailAction(params);
    }

    // ── Normal state fetch ──
    var state = loadState();
    state.history = loadHistory();
    // Net worth history per child for chart
    state.netWorthHistory = {};
    getChildNames(state).forEach(function(c) {
      state.netWorthHistory[c] = calcNetWorthHistory(c);
    });
    if (DEBUG_LOGGING) Logger.log("doGet OK — users: " + JSON.stringify(state.users));
    return ContentService
      .createTextOutput(JSON.stringify(state))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    Logger.log("doGet ERROR: " + err);
    return ContentService
      .createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * handleEmailAction — processes approve/deny links clicked in notification emails
 * URL format: ?action=approve&choreId=chore_123&child=Linnea&token=ABC123
 */
function handleEmailAction(params) {
  var action  = params.action;
  var choreId = params.choreId;
  var child   = params.child;
  var token   = params.token;

  // Validate token
  var expectedToken = generateToken(choreId, action);
  if (token !== expectedToken) {
    return buildActionPage("❌ Invalid or Expired Link",
      "This link is no longer valid. Please open the app to manage chores.",
      "#ef4444");
  }

  try {
    var state  = loadState();
    var data   = state.children && state.children[child];
    if (!data) return buildActionPage("❌ Error", "Child account not found.", "#ef4444");

    var chore = null;
    for (var i = 0; i < data.chores.length; i++) {
      if (data.chores[i].id === choreId) { chore = data.chores[i]; break; }
    }
    if (!chore) return buildActionPage("✅ Already Processed",
      "This chore has already been approved or denied.", "#10b981");
    if (chore.status !== "pending") return buildActionPage("✅ Already Processed",
      chore.name + " was already " + chore.status + ".", "#10b981");

    var bankName = getBankName(state);
    var primary  = getPrimary(state);
    var ledger   = getLedgerSheet();
    var tz       = getTimezone(state);
    var now      = Utilities.formatDate(new Date(), tz, "MMM d, yyyy h:mm a");

    if (action === "approve") {
      var ck = chore.amount * (chore.splitChk / 100);
      var sv = chore.amount * ((100 - chore.splitChk) / 100);
      data.balances.checking += ck;
      data.balances.savings  += sv;
      if (ck > 0) ledger.appendRow([now, "Bank", child, "Chore: " + chore.name + " (Chk)", ck]);
      if (sv > 0) ledger.appendRow([now, "Bank", child, "Chore: " + chore.name + " (Sav)", sv]);

      if (chore.schedule === "once") {
        data.chores = data.chores.filter(function(c) { return c.id !== choreId; });
      } else {
        chore.status        = "available";
        chore.completedBy   = null;
        chore.completedAt   = null;
        chore.denialNote    = null;
        chore.lastCompleted = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
        // Check streak milestone — auto-deposit bonus if milestone hit
        checkStreakMilestone(state, child, chore, ledger, now);
      }

      state.children[child] = data;
      saveState(state);

      // Send approval email to child
      sendEventEmail(state, "Chore Approved", child);
      // Sync calendar
      state._approvedChoreId       = choreId;
      state._approvedChoreTitle    = "🏦 " + chore.name + " — Earn $" + (chore.amount||0).toFixed(2);
      state._approvedChoreSchedule = chore.schedule;
      syncCalendarEvent(state, "Chore Approved", child);

      return buildActionPage("✅ Approved!",
        "<strong>" + chore.name + "</strong> approved for " + child + "!<br><br>" +
        "$" + chore.amount.toFixed(2) + " deposited to their account.<br>" +
        "Checking: +$" + ck.toFixed(2) + " &nbsp; Savings: +$" + sv.toFixed(2),
        "#10b981");

    } else { // deny
      if (chore.schedule === "once") {
        data.chores = data.chores.filter(function(c) { return c.id !== choreId; });
      } else {
        chore.status        = "available";
        chore.completedBy   = null;
        chore.completedAt   = null;
        chore.denialNote    = "Denied via email";
        chore.lastCompleted = null;
      }
      state.children[child] = data;
      saveState(state);
      sendEventEmail(state, "Chore Denied", child);

      return buildActionPage("❌ Denied",
        "<strong>" + chore.name + "</strong> has been denied for " + child + ".<br><br>" +
        "The chore will reappear in their list.",
        "#f59e0b");
    }
  } catch(err) {
    Logger.log("handleEmailAction ERROR: " + err);
    return buildActionPage("❌ Error", "Something went wrong: " + err.toString(), "#ef4444");
  }
}


/**
 * handleDepositEmailAction — processes approve/deny links for child deposit requests
 * URL format: ?action=depositApprove&depositId=dep_123&child=Linnea&token=ABC123
 */
function handleDepositEmailAction(params) {
  var action    = params.action;
  var depositId = params.depositId;
  var child     = params.child;
  var token     = params.token;

  var expectedToken = generateToken(depositId, action);
  if (token !== expectedToken) {
    return buildActionPage("❌ Invalid or Expired Link",
      "This link is no longer valid. Please open the app to manage deposits.",
      "#ef4444");
  }

  try {
    var state = loadState();
    var data  = state.children && state.children[child];
    if (!data) return buildActionPage("❌ Error", "Child account not found.", "#ef4444");

    var deposits = data.deposits || [];
    var deposit  = null;
    for (var i = 0; i < deposits.length; i++) {
      if (deposits[i].id === depositId) { deposit = deposits[i]; break; }
    }
    if (!deposit) return buildActionPage("✅ Already Processed",
      "This deposit has already been handled.", "#10b981");

    if (deposit.status !== "pending") return buildActionPage("✅ Already Processed",
      "This deposit was already " + deposit.status + ".", "#10b981");

    var ledger = getLedgerSheet();
    var tz     = getTimezone(state);
    var now    = Utilities.formatDate(new Date(), tz, "MMM d, yyyy h:mm a");

    if (action === "depositApprove") {
      var ck = deposit.amount * (deposit.splitChk / 100);
      var sv = deposit.amount * ((100 - deposit.splitChk) / 100);
      data.balances.checking += ck;
      data.balances.savings  += sv;
      if (ck > 0) ledger.appendRow([now, "Bank", child, "Deposit: " + deposit.source + " (Chk)", ck]);
      if (sv > 0) ledger.appendRow([now, "Bank", child, "Deposit: " + deposit.source + " (Sav)", sv]);
      deposit.status = "approved";
      state.children[child] = data;
      saveState(state);
      // Notify child
      var childEmail = getEmailFor(state, child);
      if (childEmail && notifyEmail(state, child)) {
        var html = buildSimpleEmailHtml(state,
          "💰 Deposit Approved, " + child + "!",
          "Your deposit of <strong>$" + deposit.amount.toFixed(2) + "</strong> from <em>" + deposit.source + "</em> was approved!",
          [
            {label: "Amount",           val: "+$" + deposit.amount.toFixed(2)},
            {label: "Source",           val: deposit.source},
            {label: "Checking",         val: "+$" + ck.toFixed(2)},
            {label: "Savings",          val: "+$" + sv.toFixed(2)},
            {label: "Checking Balance", val: "$" + data.balances.checking.toFixed(2)},
            {label: "Savings Balance",  val: "$" + data.balances.savings.toFixed(2)}
          ],
          "Great job saving that money! 💚"
        );
        sendSimpleEmail(childEmail, getBankName(state) + " — Your deposit was approved! 💰", html);
      }
      return buildActionPage("✅ Deposit Approved!",
        "<strong>$" + deposit.amount.toFixed(2) + "</strong> from " + deposit.source + " approved for " + child + "!<br><br>" +
        "Checking: +$" + ck.toFixed(2) + " &nbsp; Savings: +$" + sv.toFixed(2),
        "#10b981");

    } else { // depositDeny
      deposit.status = "denied";
      state.children[child] = data;
      saveState(state);
      var childEmail = getEmailFor(state, child);
      if (childEmail && notifyEmail(state, child)) {
        var html = buildSimpleEmailHtml(state,
          "Deposit Update for " + child,
          "Your deposit request of $" + deposit.amount.toFixed(2) + " from " + deposit.source + " was not approved this time. Talk to " + getParentName(state) + " if you have questions.",
          [], ""
        );
        sendSimpleEmail(childEmail, getBankName(state) + " — Deposit update", html);
      }
      return buildActionPage("❌ Deposit Denied",
        "The deposit request of <strong>$" + deposit.amount.toFixed(2) + "</strong> for " + child + " has been denied.",
        "#f59e0b");
    }
  } catch(err) {
    Logger.log("handleDepositEmailAction ERROR: " + err);
    return buildActionPage("❌ Error", "Something went wrong: " + err.toString(), "#ef4444");
  }
}

/** Generate a secure token for a chore action */
function generateToken(choreId, action) {
  var raw = choreId + "|" + action + "|" + APPROVAL_SECRET;
  return Utilities.base64Encode(raw).replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);
}

/** Build a simple mobile-friendly response page */
function buildActionPage(title, message, color) {
  var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
    + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
    + "<title>" + title + "</title>"
    + "<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;"
    + "min-height:100vh;margin:0;background:#f1f5f9;padding:20px;box-sizing:border-box;}"
    + ".card{background:white;border-radius:20px;padding:32px 28px;max-width:400px;width:100%;"
    + "text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.1);}"
    + ".icon{font-size:3rem;margin-bottom:16px;}"
    + "h1{margin:0 0 12px;font-size:1.4rem;color:#1e293b;}"
    + "p{margin:0 0 24px;color:#64748b;line-height:1.6;font-size:.95rem;}"
    + "a{display:inline-block;background:" + color + ";color:white;text-decoration:none;"
    + "padding:12px 24px;border-radius:10px;font-weight:700;font-size:.9rem;}"
    + "</style></head><body><div class='card'>"
    + "<div class='icon'>" + (title.indexOf("✅") === 0 ? "✅" : title.indexOf("❌") === 0 ? "❌" : "🏦") + "</div>"
    + "<h1>" + title.replace(/^[✅❌🏦]\s*/,"") + "</h1>"
    + "<p>" + message + "</p>"
    + "<a href='" + APP_URL + "'>Open Family Bank</a>"
    + "</div></body></html>";
  return HtmlService.createHtmlOutput(html)
    .setTitle(title.replace(/^[✅❌🏦]\s*/,""))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ================================================================
// [DOPOST] — Frontend saves state + new transactions
// ================================================================
function doPost(e) {
  try {
    var body         = JSON.parse(e.postData.contents);
    var transactions = body.tempTransactions || [];
    var lastAction   = body.lastAction || "Update";
    var activeChild  = body.activeChild || null;

    if (DEBUG_LOGGING) Logger.log("doPost: " + lastAction + " | child: " + activeChild);

    // v33.0 — Pull proof photo off body BEFORE saveState (sheet A1 has ~50K char limit)
    // Keep a local reference so we can attach it inline to the chore-submitted email.
    var proofPhoto = body.proofPhoto || null;
    delete body.proofPhoto;

    // v33.0 — Load prior state once so we can diff signup requests (added/approved/denied)
    var priorState = null;
    try { priorState = loadState(); } catch(le) { priorState = null; }

    // Strip frontend-only keys before saving
    delete body.tempTransactions;
    delete body.lastAction;
    delete body.history;
    delete body.activeChild;
    // Strip any orphaned calendar helper keys — these must never persist in state
    delete body._deletedChoreName;
    delete body._deletedChoreTitle;
    delete body._deletedChoreId;
    delete body._approvedChoreName;
    delete body._approvedChoreTitle;
    delete body._approvedChoreId;
    delete body._approvedChoreSchedule;
    delete body._editedChoreName;
    delete body._editedChoreId;
    delete body._deletedCalEventIds;
    delete body._deletedCalEventId;
    delete body._approvedCalEventId;

    saveState(body);

    // Write transactions to Ledger
    var ledger = getLedgerSheet();
    var tz     = getTimezone(body);
    transactions.forEach(function(tx) {
      var ts = Utilities.formatDate(new Date(), tz, "MMM d, yyyy h:mm a");
      ledger.appendRow([
        tx.date || ts,
        tx.user  || "System",
        tx.child || activeChild || "",
        tx.note  || lastAction,
        tx.amt   || 0
      ]);
    });

    // Trigger any email notifications based on the action
    sendEventEmail(body, lastAction, activeChild, proofPhoto);

    // v33.0 — Process signup request diffs (new request → admin email; approval/denial → requester email)
    try { processSignupDiff(priorState, body); } catch(se) { Logger.log("processSignupDiff ERROR: " + se); }

    // v35.0 Item 3 — Process share-child diffs (new child assignment → welcome email to receiving parent)
    try { processShareChildDiff(priorState, body); } catch(ce) { Logger.log("processShareChildDiff ERROR: " + ce); }

    // Sync Google Calendar events based on the action
    syncCalendarEvent(body, lastAction, activeChild);

    return ContentService
      .createTextOutput(JSON.stringify({status: "ok"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    Logger.log("doPost ERROR: " + err);
    return ContentService
      .createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ================================================================
// [HISTORY] — Load Ledger, return rows grouped by child name
// ================================================================
function loadHistory() {
  var sheet = getLedgerSheet();
  var data  = sheet.getDataRange().getValues();
  var history = {};
  // Skip header row
  var start = (data.length > 0 && String(data[0][0]).toLowerCase().includes("date")) ? 1 : 0;
  for (var i = start; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1] && !row[4]) continue; // skip blank rows
    var child = String(row[2] || DEFAULT_CHILD_NAME);
    if (!history[child]) history[child] = [];
    history[child].push({
      date:  String(row[0] || ""),
      user:  String(row[1] || ""),
      child: child,
      note:  String(row[3] || ""),
      amt:   parseFloat(row[4]) || 0
    });
  }
  return history;
}

// ================================================================
// [TRIGGERS] — Scheduled automation functions
// ================================================================

/**
 * TRIGGER: Every Monday 8 AM — weekly allowance per child
 */
function automatedMondayDeposit() {
  try {
    var state   = loadState();
    var ledger  = getLedgerSheet();
    var tz      = getTimezone(state);
    var now     = Utilities.formatDate(new Date(), tz, "MMM d, yyyy h:mm a");
    var changed = false;

    getChildNames(state).forEach(function(childName) {
      var data = state.children[childName];
      var chk  = parseFloat(data.autoDeposit && data.autoDeposit.checking) || 0;
      var sav  = parseFloat(data.autoDeposit && data.autoDeposit.savings)  || 0;
      if (chk === 0 && sav === 0) return;
      data.balances.checking += chk;
      data.balances.savings  += sav;
      if (chk > 0) ledger.appendRow([now, "Bank", childName, "Weekly Allowance (Chk)", chk]);
      if (sav > 0) ledger.appendRow([now, "Bank", childName, "Weekly Allowance (Sav)", sav]);
      // Email child: allowance deposited
      var childEmail = getEmailFor(state, childName);
      if (childEmail && notifyEmail(state, childName)) {
        var bankName = getBankName(state);
        var total    = chk + sav;
        sendSimpleEmail(childEmail,
          bankName + " — Your allowance of $" + total.toFixed(2) + " arrived! 💵",
          buildSimpleEmailHtml(state,
            "💵 Allowance Deposited!",
            "Hi " + childName + "! Your weekly allowance of <strong>$" + total.toFixed(2) + "</strong> has been added to your account.",
            [
              {label: "Checking", val: "+$" + chk.toFixed(2)},
              {label: "Savings",  val: "+$" + sav.toFixed(2)},
              {label: "New Checking Balance", val: "$" + data.balances.checking.toFixed(2)},
              {label: "New Savings Balance",  val: "$" + data.balances.savings.toFixed(2)}
            ],
            "Keep saving! 🌟"
          )
        );
      }
      changed = true;
      Logger.log("Allowance: " + childName + " CHK+$" + chk + " SAV+$" + sav);
    });

    if (changed) saveState(state);
  } catch(err) { Logger.log("automatedMondayDeposit ERROR: " + err); }
}

/**
 * TRIGGER: 1st of month 7 AM — interest + monthly statement per child
 */
function monthlyMaintenance() {
  try {
    var state  = loadState();
    var ledger = getLedgerSheet();
    var tz     = getTimezone(state);
    var now    = Utilities.formatDate(new Date(), tz, "MMM d, yyyy h:mm a");

    getChildNames(state).forEach(function(childName) {
      var data    = state.children[childName];
      var prevChk = parseFloat(data.balances.checking) || 0;
      var prevSav = parseFloat(data.balances.savings)  || 0;
      var rc      = parseFloat(data.rates && data.rates.checking) || 0;
      var rs      = parseFloat(data.rates && data.rates.savings)  || 0;
      var ic      = prevChk * (rc / 100 / 12);
      var is_     = prevSav * (rs / 100 / 12);

      data.balances.checking += ic;
      data.balances.savings  += is_;

      if (ic  > 0) ledger.appendRow([now, "Bank", childName, "Monthly Interest (Chk)", ic]);
      if (is_ > 0) ledger.appendRow([now, "Bank", childName, "Monthly Interest (Sav)", is_]);

      Logger.log("Interest: " + childName + " CHK+$" + ic.toFixed(4) + " SAV+$" + is_.toFixed(4));

      // Send statement to all parents + the child
      sendMonthlyStatement(state, childName, data, prevChk, prevSav, ic, is_);
    });

    saveState(state);
  } catch(err) { Logger.log("monthlyMaintenance ERROR: " + err); }
}

/**
 * TRIGGER: Every day 6 AM — reset recurring chores by schedule
 */
function dailyChoreReset() {
  try {
    var state   = loadState();
    var changed = false;
    var today   = new Date();

    getChildNames(state).forEach(function(childName) {
      var chores = state.children[childName].chores || [];
      chores.forEach(function(chore) {
        if (chore.schedule === "once") return;
        if (chore.status === "available" || chore.status === "pending") return;
        if (chore.endDate && chore.endDate < todayDateStr()) return;
        var reset = false;
        if (chore.schedule === "daily")    reset = true;
        if (chore.schedule === "weekly")   reset = isDayInterval(today, chore.createdAt, 7);
        if (chore.schedule === "biweekly") reset = isDayInterval(today, chore.createdAt, 14);
        if (chore.schedule === "monthly")  reset = (today.getDate() === parseInt(chore.monthlyDay || 1));
        if (reset) {
          // Clear lastCompleted so chore reappears on next scheduled day
          chore.status        = "available";
          chore.completedBy   = null;
          chore.completedAt   = null;
          chore.denialNote    = null;
          chore.lastCompleted = null;
          changed = true;
          Logger.log("dailyChoreReset: reset '" + chore.name + "' for " + childName);
        }
      });
    });

    if (changed) saveState(state);
  } catch(err) { Logger.log("dailyChoreReset ERROR: " + err); }
}

/**
 * TRIGGER: Every Sunday 9 AM — chore reminder email per child
 */
function sundayChoreReminder() {
  try {
    var state = loadState();

    getChildNames(state).forEach(function(childName) {
      var data      = state.children[childName];
      var chores    = data.chores || [];
      var available = chores.filter(function(c) {
        return c.status !== "pending" && (!c.endDate || c.endDate >= todayDateStr());
      });

      if (!available.length) {
        Logger.log("sundayChoreReminder: no chores for " + childName + " — skipping");
        return;
      }

      var childEmail  = getEmailFor(state, childName);
      var parentEmails= getParentEmails(state, childName);
      var bankName    = getBankName(state);
      var primary     = getPrimary(state);
      var secondary   = getSecondary(state);
      var totalPossible = available.reduce(function(s, c) { return s + (parseFloat(c.amount) || 0); }, 0);

      var subject = "🏦 " + bankName + " — Your chores this week, " + childName + "!";

      var choreRows = available.map(function(c) {
        var sched = {once:"One-time",daily:"Daily",weekly:"Weekly",biweekly:"Bi-weekly",monthly:"Monthly"}[c.schedule] || c.schedule;
        var split = c.childChooses ? "You choose" : c.splitChk + "% Checking / " + (100 - c.splitChk) + "% Savings";
        return {label: c.name + " (" + sched + ")", val: "$" + (c.amount || 0).toFixed(2) + " — " + split};
      });

      var html = buildReminderEmailHtml(state, childName, data, totalPossible, choreRows);

      var childWantsEmail = notifyEmail(state, childName);
      if (childEmail && childWantsEmail) {
        var opts = {to: childEmail, subject: subject, htmlBody: html};
        if (parentEmails.length) opts.cc = parentEmails.join(",");
        MailApp.sendEmail(opts);
        Logger.log("sundayChoreReminder: sent for " + childName + " → " + childEmail);
      } else if (parentEmails.length) {
        // Send to parent only (child has no email or email notifications off)
        MailApp.sendEmail({to: parentEmails.join(","), subject: subject, htmlBody: html});
        Logger.log("sundayChoreReminder: sent to parent only for " + childName);
      }
    });
  } catch(err) { Logger.log("sundayChoreReminder ERROR: " + err); }
}

// ================================================================
// [EVENT EMAILS] — Triggered by doPost actions
// ================================================================
function sendEventEmail(state, lastAction, activeChild, proofPhoto) {
  try {
    if (!activeChild) return;
    var config      = state.config || {};
    var bankName    = getBankName(state);
    var childName   = activeChild;
    var childEmail  = getEmailFor(state, childName);
    var parentEmails= getParentEmails(state, childName);
    var data        = state.children && state.children[childName];
    var chores      = data ? (data.chores || []) : [];

    if (lastAction === "Chore Submitted") {
      // → All parents get notified (parents always get emails)
      var pending = chores.filter(function(c) { return c.status === "pending"; });
      if (!pending.length || !parentEmails.length) return;
      var chore   = pending[pending.length - 1];
      var split   = chore.splitChk + "% Checking / " + (100 - chore.splitChk) + "% Savings";
      var approveToken = generateToken(chore.id, "approve");
      var denyToken    = generateToken(chore.id, "deny");
      var approveUrl   = APP_URL + "?action=approve&choreId=" + chore.id + "&child=" + encodeURIComponent(childName) + "&token=" + approveToken;
      var denyUrl      = APP_URL + "?action=deny&choreId="    + chore.id + "&child=" + encodeURIComponent(childName) + "&token=" + denyToken;
      // Replace APP_URL with the Apps Script Web App URL for action handling
      var scriptUrl    = ScriptApp.getService().getUrl();
      approveUrl       = scriptUrl + "?action=approve&choreId=" + chore.id + "&child=" + encodeURIComponent(childName) + "&token=" + approveToken;
      denyUrl          = scriptUrl + "?action=deny&choreId="    + chore.id + "&child=" + encodeURIComponent(childName) + "&token=" + denyToken;

      var primary   = getPrimary(state);
      var secondary = getSecondary(state);
      var html = buildSimpleEmailHtml(state,
        "✋ " + childName + " completed a chore!",
        childName + " marked <strong>" + chore.name + "</strong> complete and is waiting for your approval.",
        [
          {label: "Chore",     val: chore.name},
          {label: "Reward",    val: "$" + (chore.amount || 0).toFixed(2)},
          {label: "Split",     val: split},
          {label: "Completed", val: chore.completedAt || "just now"}
        ],
        ""
      );
      // Inject approve/deny buttons using the placeholder we put in buildSimpleEmailHtml
      var btnHtml = "<div style='display:flex;gap:12px;justify-content:center;margin:0 0 16px;'>"
        + "<a href='" + approveUrl + "' style='flex:1;display:block;background:" + secondary + ";color:white;"
        + "text-decoration:none;padding:14px;border-radius:10px;font-weight:800;font-size:1rem;"
        + "text-align:center;'>✅ Approve</a>"
        + "<a href='" + denyUrl + "' style='flex:1;display:block;background:#ef4444;color:white;"
        + "text-decoration:none;padding:14px;border-radius:10px;font-weight:800;font-size:1rem;"
        + "text-align:center;'>❌ Deny</a>"
        + "</div>";
      // v33.0 — Embed proof photo inline if supplied
      // Limits to be aware of (best-effort: failures don't block chore submission):
      //   • Gmail free tier: 100 recipients/day
      //   • Single message max: 25 MB
      //   • Apps Script daily email quota: 100 free / 1500 workspace
      //   • Sheet A1 cell: 50 K chars (we strip proofPhoto BEFORE saveState)
      var proofBlob = null;
      var photoHtml = "";
      if (proofPhoto) {
        try {
          var m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(proofPhoto);
          if (m) {
            var mime  = m[1];
            var b64   = m[2];
            var bytes = Utilities.base64Decode(b64);
            var ext   = (mime.split("/")[1] || "jpg").replace("jpeg", "jpg");
            proofBlob = Utilities.newBlob(bytes, mime, (chore.name || "proof") + "." + ext);
            photoHtml = "<div style='margin:0 0 16px;text-align:center;'>"
              + "<p style='font-weight:700;margin:0 0 8px;color:#334155;'>Proof photo</p>"
              + "<img src='cid:choreProof' style='max-width:100%;border-radius:10px;border:1px solid #e2e8f0;'>"
              + "</div>";
          }
        } catch(pe) { Logger.log("proofPhoto decode ERROR: " + pe); proofBlob = null; photoHtml = ""; }
      }

      html = html.replace("<!-- ACTION_BUTTONS -->", photoHtml + btnHtml);

      parentEmails.forEach(function(email) {
        try {
          if (proofBlob) {
            MailApp.sendEmail({
              to:           email,
              subject:      bankName + " — " + childName + " completed a chore! ✋",
              htmlBody:     html,
              inlineImages: { choreProof: proofBlob }
            });
          } else {
            sendSimpleEmail(email, bankName + " — " + childName + " completed a chore! ✋", html);
          }
        } catch(ee) {
          Logger.log("Chore Submitted email FAIL (" + email + "): " + ee);
          // Best-effort fallback: send without inline image
          try {
            var fallbackHtml = html.replace(/<img src='cid:choreProof'[^>]*>/g, "<em>(photo could not be attached)</em>");
            sendSimpleEmail(email, bankName + " — " + childName + " completed a chore! ✋", fallbackHtml);
          } catch(e2) { Logger.log("Chore Submitted fallback FAIL (" + email + "): " + e2); }
        }
      });
      Logger.log("Chore Submitted email → " + parentEmails.join(", ") + (proofBlob ? " [+ proof photo]" : ""));

    } else if (lastAction === "Chore Created" && childEmail && notifyEmail(state, childName)) {
      // → Child gets notified of new chore
      var recentChore = chores[chores.length - 1];
      if (!recentChore) return;
      var split = recentChore.childChooses ? "You choose" : recentChore.splitChk + "% Checking / " + (100 - recentChore.splitChk) + "% Savings";
      var html = buildSimpleEmailHtml(state,
        "📋 New chore assigned, " + childName + "!",
        "A new chore has been added to your list in " + bankName + ".",
        [
          {label: "Chore",    val: recentChore.name},
          {label: "Reward",   val: "$" + (recentChore.amount || 0).toFixed(2)},
          {label: "Schedule", val: {once:"One-time",daily:"Daily",weekly:"Weekly",biweekly:"Bi-weekly",monthly:"Monthly"}[recentChore.schedule] || recentChore.schedule},
          {label: "Split",    val: split}
        ],
        "Log in to " + bankName + " to see your chores! 💪"
      );
      sendSimpleEmail(childEmail, bankName + " — You have a new chore! 📋", html);
      Logger.log("Chore Created email → " + childEmail);

    } else if (lastAction === "Chore Approved" && childEmail && notifyEmail(state, childName)) {
      // → Child gets approval confirmation with new balances
      var row = getLastChoreEntry(childName);
      var choreName = row ? String(row[3]).replace(/Chore: | \(Chk\)| \(Sav\)/g, "") : "your chore";
      var earned    = row ? Math.abs(parseFloat(row[4]) || 0) : 0;
      var html = buildSimpleEmailHtml(state,
        "🎉 Chore approved, " + childName + "!",
        "Great work! Your chore <strong>" + choreName + "</strong> was approved.",
        [
          {label: "Earned",           val: "+$" + earned.toFixed(2)},
          {label: "Checking Balance", val: "$" + (data.balances.checking || 0).toFixed(2)},
          {label: "Savings Balance",  val: "$" + (data.balances.savings  || 0).toFixed(2)},
          {label: "Total Wealth",     val: "$" + ((data.balances.checking || 0) + (data.balances.savings || 0)).toFixed(2)}
        ],
        "Keep up the amazing work! 💪🌟"
      );
      sendSimpleEmail(childEmail, bankName + " — Your chore was approved! 🎉", html);
      Logger.log("Chore Approved email → " + childEmail);

    } else if (lastAction === "Chore Denied" && childEmail && notifyEmail(state, childName)) {
      // → Child gets denial notice
      var parentName = getParentName(state);
      var html = buildSimpleEmailHtml(state,
        "Chore Update for " + childName,
        "Your chore wasn't approved this time. Talk to " + parentName + " if you have questions — and try again next time! 💪",
        [],
        ""
      );
      sendSimpleEmail(childEmail, bankName + " — Chore update", html);
      Logger.log("Chore Denied email → " + childEmail);

    } else if (lastAction === "Deposit Submitted") {
      // → All assigned parents get notified with approve/deny buttons
      var deposits = data ? (data.deposits || []) : [];
      var pending  = deposits.filter(function(d) { return d.status === "pending"; });
      if (!pending.length || !parentEmails.length) return;
      var dep = pending[pending.length - 1];
      var split = dep.splitChk + "% Checking / " + (100 - dep.splitChk) + "% Savings";
      var scriptUrl     = ScriptApp.getService().getUrl();
      var approveToken  = generateToken(dep.id, "depositApprove");
      var denyToken     = generateToken(dep.id, "depositDeny");
      var approveUrl    = scriptUrl + "?action=depositApprove&depositId=" + dep.id + "&child=" + encodeURIComponent(childName) + "&token=" + approveToken;
      var denyUrl       = scriptUrl + "?action=depositDeny&depositId="    + dep.id + "&child=" + encodeURIComponent(childName) + "&token=" + denyToken;
      var secondary     = getSecondary(state);
      var html = buildSimpleEmailHtml(state,
        "💰 " + childName + " wants to make a deposit!",
        childName + " would like to deposit <strong>$" + dep.amount.toFixed(2) + "</strong> from <em>" + dep.source + "</em> into their account.",
        [
          {label: "Amount", val: "$" + dep.amount.toFixed(2)},
          {label: "Source", val: dep.source},
          {label: "Split",  val: split},
          {label: "Time",   val: dep.submittedAt || "just now"}
        ],
        ""
      );
      var btnHtml = "<div style='display:flex;gap:12px;justify-content:center;margin:0 0 16px;'>"
        + "<a href='" + approveUrl + "' style='flex:1;display:block;background:" + secondary + ";color:white;"
        + "text-decoration:none;padding:14px;border-radius:10px;font-weight:800;font-size:1rem;"
        + "text-align:center;'>✅ Approve</a>"
        + "<a href='" + denyUrl + "' style='flex:1;display:block;background:#ef4444;color:white;"
        + "text-decoration:none;padding:14px;border-radius:10px;font-weight:800;font-size:1rem;"
        + "text-align:center;'>❌ Deny</a>"
        + "</div>";
      html = html.replace("<!-- ACTION_BUTTONS -->", btnHtml);
      parentEmails.forEach(function(email) {
        sendSimpleEmail(email, bankName + " — " + childName + " wants to make a deposit! 💰", html);
      });
    } else if (lastAction === "Withdrawal Submitted") {
      // v35.0 Item 2 — pending-approval flow (mirrors Deposit Submitted).
      // All assigned parents get an email with Approve/Deny buttons.
      var pendingW = data ? (data.pendingWithdrawals || []) : [];
      if (!pendingW.length || !parentEmails.length) return;
      var wd        = pendingW[pendingW.length - 1];
      var scriptUrl    = ScriptApp.getService().getUrl();
      var approveToken = generateToken(wd.id, "withdrawApprove");
      var denyToken    = generateToken(wd.id, "withdrawDeny");
      var approveUrl   = scriptUrl + "?action=withdrawApprove&withdrawalId=" + wd.id + "&child=" + encodeURIComponent(childName) + "&token=" + approveToken;
      var denyUrl      = scriptUrl + "?action=withdrawDeny&withdrawalId="    + wd.id + "&child=" + encodeURIComponent(childName) + "&token=" + denyToken;
      var secondary    = getSecondary(state);
      var html = buildSimpleEmailHtml(state,
        "💸 " + childName + " wants to make a withdrawal",
        childName + " is requesting to withdraw <strong>$" + wd.amount.toFixed(2) + "</strong> from their checking account.",
        [
          {label: "Amount", val: "$" + wd.amount.toFixed(2)},
          {label: "Note",   val: wd.note || "—"},
          {label: "From",   val: "Checking"},
          {label: "Time",   val: wd.submittedAt || "just now"}
        ],
        ""
      );
      var btnHtml = "<div style='display:flex;gap:12px;justify-content:center;margin:0 0 16px;'>"
        + "<a href='" + approveUrl + "' style='flex:1;display:block;background:" + secondary + ";color:white;"
        + "text-decoration:none;padding:14px;border-radius:10px;font-weight:800;font-size:1rem;"
        + "text-align:center;'>✅ Approve</a>"
        + "<a href='" + denyUrl + "' style='flex:1;display:block;background:#ef4444;color:white;"
        + "text-decoration:none;padding:14px;border-radius:10px;font-weight:800;font-size:1rem;"
        + "text-align:center;'>❌ Deny</a>"
        + "</div>";
      html = html.replace("<!-- ACTION_BUTTONS -->", btnHtml);
      parentEmails.forEach(function(email) {
        sendSimpleEmail(email, bankName + " — " + childName + " wants to withdraw $" + wd.amount.toFixed(2), html);
      });
      Logger.log("Withdrawal Submitted email → " + parentEmails.join(", "));

    } else if (lastAction === "Withdrawal Approved" && childEmail && notifyEmail(state, childName)) {
      // v35.0 Item 2 — child gets confirmation
      var rowW = getLastWithdrawEntry(childName);
      var wAmt = rowW ? Math.abs(parseFloat(rowW[4]) || 0) : 0;
      var wNote = rowW ? String(rowW[2]).replace(/^Withdraw:\s*/, "") : "your withdrawal";
      var html = buildSimpleEmailHtml(state,
        "✅ Withdrawal approved, " + childName + "!",
        "Your withdrawal request was approved.",
        [
          {label: "Amount",          val: "$" + wAmt.toFixed(2)},
          {label: "Note",            val: wNote},
          {label: "Checking Balance",val: "$" + ((data.balances && data.balances.checking) || 0).toFixed(2)}
        ],
        ""
      );
      sendSimpleEmail(childEmail, bankName + " — Your withdrawal was approved 💸", html);
      Logger.log("Withdrawal Approved email → " + childEmail);

    } else if (lastAction === "Withdrawal Denied" && childEmail && notifyEmail(state, childName)) {
      // v35.0 Item 2 — child gets denial notice
      var parentName = getParentName(state);
      var html = buildSimpleEmailHtml(state,
        "Withdrawal update for " + childName,
        "Your withdrawal request wasn't approved this time. Talk to " + parentName + " if you have questions.",
        [],
        ""
      );
      sendSimpleEmail(childEmail, bankName + " — Withdrawal update", html);
      Logger.log("Withdrawal Denied email → " + childEmail);

    }
  } catch(err) { Logger.log("sendEventEmail ERROR: " + err); }
}

// ================================================================
// [SIGNUP REQUESTS] v33.0 — Admin-approved parent account creation
// Diffs state.config.pendingUsers between prior and current states.
//   • New entry       → email admin (adminEmail) with requester details
//   • Removed entry   → either approved (user now exists) or denied
//     ─ Approved: welcome email to requester
//     ─ Denied:   denial email to requester (reason if present in state._denialReasons[id])
// The frontend is responsible for creating state.users / state.pins / state.roles
// during approval and for optionally attaching a denial reason via
// state._denialReasons[id] = "reason text" (consumed then stripped here).
// ================================================================
function processSignupDiff(priorState, newState) {
  if (!newState || !newState.config) return;
  var adminEmail = (newState.config.adminEmail || "").trim();
  var bankName   = getBankName(newState);
  var appUrl     = APP_URL;

  var priorPending = (priorState && priorState.config && priorState.config.pendingUsers) || [];
  var newPending   = newState.config.pendingUsers || [];
  var denialReasons = newState._denialReasons || {};
  // Reasons are consumed one-shot; strip so they don't persist
  if (newState._denialReasons) delete newState._denialReasons;

  // Build id → entry maps
  function indexById(list) {
    var m = {};
    (list || []).forEach(function(e) { if (e && e.id) m[e.id] = e; });
    return m;
  }
  var priorMap = indexById(priorPending);
  var newMap   = indexById(newPending);

  // 1) ADDED — entries present in new but not in prior → email admin
  newPending.forEach(function(req) {
    if (!req || !req.id) return;
    if (priorMap[req.id]) return; // already existed
    if (!adminEmail) {
      Logger.log("Signup request received but adminEmail is empty — skipping admin notification.");
      return;
    }
    try {
      var html = buildSimpleEmailHtml(newState,
        "📝 New account request",
        "Someone is requesting a parent account for <strong>" + bankName + "</strong>.",
        [
          {label: "Name",      val: req.name  || "(not provided)"},
          {label: "Email",     val: req.email || "(not provided)"},
          {label: "Requested", val: req.requestedAt || "just now"}
        ],
        "Open " + bankName + " → Admin → Pending Requests to approve or deny."
      );
      html = html.replace("<!-- ACTION_BUTTONS -->",
        "<div style='text-align:center;margin:0 0 16px;'>"
        + "<a href='" + appUrl + "' style='display:inline-block;background:" + getPrimary(newState)
        + ";color:white;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:800;'>"
        + "Open " + bankName + "</a></div>");
      sendSimpleEmail(adminEmail, bankName + " — New signup request: " + (req.name || ""), html);
      Logger.log("Signup request email → " + adminEmail + " for " + (req.name || req.id));
    } catch(e) { Logger.log("signup admin notify ERROR: " + e); }
  });

  // 2) REMOVED — entries present in prior but not in new → approved or denied
  priorPending.forEach(function(req) {
    if (!req || !req.id) return;
    if (newMap[req.id]) return; // still pending
    if (!req.email) return;     // nowhere to notify
    var nowHasUser = !!(newState.users && newState.users.indexOf(req.name) !== -1)
                  || !!(newState.pins  && newState.pins[req.name]);
    try {
      if (nowHasUser) {
        var htmlA = buildSimpleEmailHtml(newState,
          "🎉 You're in!",
          "Your account for <strong>" + bankName + "</strong> is ready.",
          [
            {label: "Display name", val: req.name || ""},
            {label: "How to sign in", val: "Open the app, choose your name, enter your PIN."}
          ],
          "Welcome to " + bankName + "!"
        );
        htmlA = htmlA.replace("<!-- ACTION_BUTTONS -->",
          "<div style='text-align:center;margin:0 0 16px;'>"
          + "<a href='" + appUrl + "' style='display:inline-block;background:" + getPrimary(newState)
          + ";color:white;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:800;'>"
          + "Log in now</a></div>");
        sendSimpleEmail(req.email, bankName + " — Account approved 🎉", htmlA);
        Logger.log("Signup APPROVED email → " + req.email);
      } else {
        var reason = (denialReasons[req.id] || "").toString().trim();
        var body   = reason
          ? "Your account request wasn't approved. Reason: <em>" + reason + "</em>"
          : "Your account request wasn't approved at this time.";
        var htmlD = buildSimpleEmailHtml(newState,
          "Account request update",
          body,
          [],
          "If you think this is a mistake, reply to this email."
        );
        sendSimpleEmail(req.email, bankName + " — Account request update", htmlD);
        Logger.log("Signup DENIED email → " + req.email);
      }
    } catch(e) { Logger.log("signup decision email ERROR: " + e); }
  });
}

// ================================================================
// [MONTHLY STATEMENT EMAIL] — Rich HTML, interest growth highlighted
// ================================================================
function sendMonthlyStatement(state, childName, data, prevChk, prevSav, interestChk, interestSav) {
  try {
    var bankName    = getBankName(state);
    var primary     = getPrimary(state);
    var secondary   = getSecondary(state);
    var primaryDark = shadeColorGs(primary, -20);
    var secDark     = shadeColorGs(secondary, -20);
    var month       = Utilities.formatDate(new Date(), BANK_TIMEZONE, "MMMM yyyy");

    var checking    = (data.balances.checking || 0);
    var savings     = (data.balances.savings  || 0);
    var total       = checking + savings;
    var prevTotal   = prevChk + prevSav;
    var totalInterest = interestChk + interestSav;
    var growth      = total - prevTotal;
    var allowChk    = (data.autoDeposit && data.autoDeposit.checking) || 0;
    var allowSav    = (data.autoDeposit && data.autoDeposit.savings)  || 0;
    var rateChk     = (data.rates && data.rates.checking) || 0;
    var rateSav     = (data.rates && data.rates.savings)  || 0;

    // Year-to-date interest — sum from Ledger
    var ytdInterest = calcYTDInterest(childName);

    // Simple 12-month projection: current balance + 52 weeks allowance + 12 months interest
    var weeklyTotal    = allowChk + allowSav;
    var projectedSavings = savings * Math.pow(1 + rateSav/100/12, 12) + (allowSav * 52);
    var projectedChecking= checking * Math.pow(1 + rateChk/100/12, 12) + (allowChk * 52);
    var projectedTotal   = projectedChecking + projectedSavings;

    var subject = bankName + " — " + childName + "'s Statement — " + month;

    // Calculate chore streaks for statement
    var choreStreaks = calcChoreStreaks(childName, data);

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
      + '<style>'
      + 'body{margin:0;padding:16px;background:#f1f5f9;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;font-size:15px}'
      + '.wrap{max-width:540px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)}'
      + '.header{background:linear-gradient(135deg,'+primary+' 0%,'+primaryDark+' 100%);padding:36px 32px 28px;text-align:center;color:white}'
      + '.header h1{margin:0 0 6px;font-size:28px;font-weight:800;letter-spacing:-0.5px}'
      + '.header p{margin:0;font-size:15px;opacity:0.88;font-weight:500}'
      + '.body{padding:28px 32px}'
      // Total wealth hero
      + '.wealth-card{background:linear-gradient(135deg,#f0f6ff,#e8f0fe);border:2px solid #bfdbfe;border-radius:16px;padding:24px;text-align:center;margin-bottom:22px}'
      + '.wealth-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:8px}'
      + '.wealth-total{font-size:48px;font-weight:900;color:'+primary+';letter-spacing:-2px;margin:0 0 6px;line-height:1}'
      + '.wealth-sub{font-size:14px;color:#64748b;font-weight:500}'
      + '.wealth-growth{display:inline-block;background:'+secondary+';color:white;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;margin-top:10px}'
      // Account cards
      + '.acct-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px}'
      + '.acct-card{border-radius:14px;padding:20px;color:white;text-align:center}'
      + '.acct-chk{background:linear-gradient(135deg,'+primary+','+primaryDark+')}'
      + '.acct-sav{background:linear-gradient(135deg,'+secondary+','+secDark+')}'
      + '.acct-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;margin-bottom:8px}'
      + '.acct-amt{font-size:26px;font-weight:800;letter-spacing:-0.5px}'
      + '.acct-rate{font-size:11px;opacity:0.78;margin-top:4px;font-weight:600}'
      // Interest highlight card
      + '.interest-card{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:22px;margin-bottom:22px}'
      + '.int-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#15803d;margin-bottom:14px}'
      + '.int-hero{font-size:40px;font-weight:900;color:'+secondary+';text-align:center;letter-spacing:-1px;margin:10px 0 4px;line-height:1}'
      + '.int-sub{font-size:13px;color:#16a34a;text-align:center;margin-bottom:16px;font-weight:600}'
      + '.int-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #bbf7d0;font-size:14px}'
      + '.int-row:last-child{border-bottom:none}'
      + '.int-label{color:#166534;font-weight:500}'
      + '.int-val{font-weight:800;color:'+secondary+'}'
      + '.int-val-muted{font-weight:700;color:#374151}'
      + '.ytd-badge{background:#166534;color:white;border-radius:10px;padding:8px 14px;text-align:center;margin-top:12px;font-size:13px;font-weight:700}'
      // Projection card
      + '.proj-card{background:linear-gradient(135deg,#fefce8,#fef9c3);border:2px solid #fde68a;border-radius:16px;padding:20px;margin-bottom:22px}'
      + '.proj-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#92400e;margin-bottom:12px}'
      + '.proj-amt{font-size:32px;font-weight:900;color:#d97706;text-align:center;letter-spacing:-1px;margin:8px 0 4px}'
      + '.proj-sub{font-size:12px;color:#92400e;text-align:center;font-weight:600}'
      // Section title
      + '.section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:22px 0 12px;padding-top:18px;border-top:1px solid #f1f5f9}'
      // Info rows
      + '.info-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f8fafc;font-size:14px}'
      + '.info-label{color:#64748b;font-weight:500}'
      + '.info-val{font-weight:700;color:#1e293b}'
      // Transaction table
      + 'table{width:100%;border-collapse:collapse;font-size:13px}'
      + 'th{background:'+primary+';color:white;padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em}'
      + 'td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#374151}'
      + 'tr:last-child td{border-bottom:none}'
      + '.td-pos{color:'+secondary+';font-weight:800}'
      + '.td-neg{color:#ef4444;font-weight:800}'
      + '.td-acct{font-size:10px;font-weight:700;padding:3px 7px;border-radius:10px;display:inline-block}'
      + '.td-chk{background:#dbeafe;color:#1d4ed8}'
      + '.td-sav{background:#d1fae5;color:#065f46}'
      // Footer
      + '.footer{background:#f8faff;padding:22px 32px;text-align:center;border-top:1px solid #e2e8f0}'
      + '.footer p{margin:0;font-size:13px;color:#94a3b8;line-height:1.6}'
      + '.footer strong{color:'+primary+'}'
      + '</style></head><body>'
      + '<div class="wrap">'

      // Header
      + '<div class="header">'
      + '<h1>🏦 ' + bankName + '</h1>'
      + '<p>' + childName + "'s Monthly Statement — " + month + '</p>'
      + '</div>'

      + '<div class="body">'

      // Total wealth hero
      + '<div class="wealth-card">'
      + '<div class="wealth-label">Total Wealth</div>'
      + '<div class="wealth-total">$' + total.toFixed(2) + '</div>'
      + '<div class="wealth-sub">Checking: <strong>$' + checking.toFixed(2) + '</strong> &nbsp;|&nbsp; Savings: <strong>$' + savings.toFixed(2) + '</strong></div>'
      + '<div class="wealth-growth">↑ Up $' + growth.toFixed(2) + ' this month</div>'
      + '</div>'

      // Account cards
      + '<div class="acct-grid">'
      + '<div class="acct-card acct-chk"><div class="acct-label">Checking</div><div class="acct-amt">$' + checking.toFixed(2) + '</div><div class="acct-rate">APY: ' + rateChk + '%</div></div>'
      + '<div class="acct-card acct-sav"><div class="acct-label">Savings</div><div class="acct-amt">$' + savings.toFixed(2) + '</div><div class="acct-rate">APY: ' + rateSav + '%</div></div>'
      + '</div>'

      // ★ Interest highlight — the star of the show
      + '<div class="interest-card">'
      + '<div class="int-title">📈 Interest Earned This Month</div>'
      + '<div class="int-hero">+$' + totalInterest.toFixed(2) + '</div>'
      + '<div class="int-sub">Your money grew while you slept! 💚</div>'
      + '<div class="int-row"><span class="int-label">Checking (' + rateChk + '% APY)</span><span class="int-val">+$' + interestChk.toFixed(4) + '</span></div>'
      + '<div class="int-row"><span class="int-label">Savings (' + rateSav + '% APY)</span><span class="int-val">+$' + interestSav.toFixed(4) + '</span></div>'
      + '<div class="int-row"><span class="int-label">Balance before interest</span><span class="int-val-muted">$' + prevTotal.toFixed(2) + '</span></div>'
      + '<div class="int-row"><span class="int-label">Balance after interest</span><span class="int-val-muted">$' + total.toFixed(2) + '</span></div>'
      + (ytdInterest > 0 ? '<div class="ytd-badge">🏆 Total interest earned this year: +$' + ytdInterest.toFixed(2) + '</div>' : '')
      + '</div>'

      // 12-month projection
      + '<div class="proj-card">'
      + '<div class="proj-title">🔮 If you keep saving... in 12 months:</div>'
      + '<div class="proj-amt">$' + projectedTotal.toFixed(2) + '</div>'
      + '<div class="proj-sub">Based on current allowance ($' + weeklyTotal.toFixed(2) + '/week) + compound interest</div>'
      + '</div>'

      // Allowance & rates info
      + '<div class="section-title">💵 Allowance & Rates</div>'
      + '<div class="info-row"><span class="info-label">Weekly Checking Allowance</span><span class="info-val">$' + allowChk.toFixed(2) + '/week</span></div>'
      + '<div class="info-row"><span class="info-label">Weekly Savings Allowance</span><span class="info-val">$' + allowSav.toFixed(2) + '/week</span></div>'
      + '<div class="info-row"><span class="info-label">Checking APY</span><span class="info-val">' + rateChk + '%</span></div>'
      + '<div class="info-row"><span class="info-label">Savings APY</span><span class="info-val">' + rateSav + '%</span></div>';

    // Recent activity table — last 10 transactions for this child
    var ledgerData = getLedgerSheet().getDataRange().getValues();
    var childRows  = [];
    for (var i = ledgerData.length - 1; i >= 1; i--) {
      var rowChild = String(ledgerData[i][2] || "");
      if (rowChild === childName || (!rowChild && childName === DEFAULT_CHILD_NAME)) {
        childRows.push(ledgerData[i]);
        if (childRows.length >= 10) break;
      }
    }

    if (childRows.length > 0) {
      html += '<div class="section-title">📋 Recent Activity</div>'
        + '<table><tr><th>Date</th><th>Account</th><th>Amount</th><th>Note</th></tr>';
      childRows.forEach(function(row) {
        var note   = String(row[3] || "");
        var amt    = parseFloat(row[4]) || 0;
        var isSav  = note.toLowerCase().includes("sav");
        var amtStr = (amt >= 0 ? "+$" : "-$") + Math.abs(amt).toFixed(2);
        var amtCls = amt >= 0 ? "td-pos" : "td-neg";
        var acctTag= isSav
          ? '<span class="td-acct td-sav">SAV</span>'
          : '<span class="td-acct td-chk">CHK</span>';
        var dateStr= "";
        try { dateStr = Utilities.formatDate(new Date(row[0]), BANK_TIMEZONE, "MM/dd"); } catch(e) { dateStr = String(row[0]||""); }
        html += '<tr><td>' + dateStr + '</td><td>' + acctTag + '</td>'
          + '<td class="' + amtCls + '">' + amtStr + '</td><td>' + note + '</td></tr>';
      });
      html += '</table>';
    }

    html += '</div>'
      + '<div class="footer" style="background:#f8faff;padding:22px 32px;text-align:center;border-top:1px solid #e2e8f0;"><a href="' + APP_URL + '" style="display:inline-block;background:' + primary + ';color:white;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:20px;margin-bottom:12px;">🏦 Open Family Bank</a><p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">Keep up the amazing work, <strong style="color:'+primary+';">' + childName + '</strong>! 🌟<br>— <strong>' + bankName + '</strong></p></div>'
      + '</div></body></html>';

    // Send to child + all parents
    var childEmail   = getEmailFor(state, childName);
    var parentEmails = getParentEmails(state, childName);
    var allRecipients= [];
    if (childEmail)      allRecipients.push(childEmail);
    parentEmails.forEach(function(e) { if (e !== childEmail) allRecipients.push(e); });

    if (allRecipients.length) {
      MailApp.sendEmail({to: allRecipients.join(","), subject: subject, htmlBody: html});
      Logger.log("Statement sent for " + childName + " → " + allRecipients.join(", "));
    }
  } catch(err) { Logger.log("sendMonthlyStatement ERROR: " + err); }
}

// ================================================================
// [EMAIL BUILDERS] — Reusable HTML email templates
// ================================================================

/**
 * Simple branded email: header + rows table + footer message
 * rows = [{label, val}, ...]
 */
function buildSimpleEmailHtml(state, title, intro, rows, footer) {
  var bankName  = getBankName(state);
  var primary   = getPrimary(state);
  var secondary = getSecondary(state);
  var darkPrimary = shadeColorGs(primary, -20);
  var rowsHtml = rows.map(function(r) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">'
      + '<span style="color:#64748b;font-weight:500;">' + r.label + '</span>'
      + '<span style="font-weight:800;color:#1e293b;">' + r.val + '</span>'
      + '</div>';
  }).join("");
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body '
    + 'style="margin:0;padding:16px;background:#f1f5f9;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:15px;">'
    + '<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">'
    + '<div style="background:linear-gradient(135deg,'+primary+','+darkPrimary+');padding:30px;text-align:center;color:white;">'
    + '<h1 style="margin:0 0 6px;font-size:22px;font-weight:800;">' + title + '</h1>'
    + '<p style="margin:0;font-size:13px;opacity:0.88;">🏦 ' + bankName + '</p>'
    + '</div>'
    + '<div style="padding:24px 28px;">'
    + '<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">' + intro + '</p>'
    + (rows.length ? '<div style="background:#f8fafc;border-radius:12px;padding:14px 16px;">' + rowsHtml + '</div>' : '')
    + (footer ? '<p style="margin:16px 0 0;color:#64748b;font-size:13px;text-align:center;font-weight:600;">' + footer + '</p>' : '')
    + '</div>'
    + '<div style="background:#f8faff;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">'
    + '<!-- ACTION_BUTTONS -->'
    + '<a href="' + APP_URL + '" style="display:inline-block;background:' + primary + ';color:white;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:20px;margin-bottom:10px;">🏦 Open Family Bank</a>'
    + '<p style="margin:0;font-size:12px;color:#94a3b8;">— <strong style="color:'+primary+';">' + bankName + '</strong></p>'
    + '</div></div></body></html>';
}

/**
 * Sunday reminder email — chore list for child
 */
function buildReminderEmailHtml(state, childName, data, totalPossible, choreRows) {
  var bankName  = getBankName(state);
  var primary   = getPrimary(state);
  var secondary = getSecondary(state);
  var darkPrimary = shadeColorGs(primary, -20);
  var checking  = (data.balances.checking || 0).toFixed(2);
  var savings   = (data.balances.savings  || 0).toFixed(2);
  var total     = ((data.balances.checking || 0) + (data.balances.savings || 0)).toFixed(2);

  var choresHtml = choreRows.map(function(r) {
    return '<div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;font-size:14px;">'
      + '<span style="font-weight:700;color:#1e293b;">' + r.label + '</span>'
      + '<span style="font-weight:800;color:' + secondary + ';">' + r.val + '</span>'
      + '</div>';
  }).join("");

  return '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body '
    + 'style="margin:0;padding:16px;background:#f1f5f9;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:15px;">'
    + '<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">'
    + '<div style="background:linear-gradient(135deg,'+primary+','+darkPrimary+');padding:30px;text-align:center;color:white;">'
    + '<h1 style="margin:0 0 6px;font-size:22px;font-weight:800;">🏦 ' + bankName + '</h1>'
    + '<p style="margin:0;font-size:14px;opacity:0.88;">Your chores this week, ' + childName + '!</p>'
    + '</div>'
    + '<div style="padding:24px 28px;">'
    + '<div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #fde68a;border-radius:14px;padding:20px;text-align:center;margin-bottom:20px;">'
    + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#92400e;margin-bottom:6px;">You could earn this week</div>'
    + '<div style="font-size:40px;font-weight:900;color:#d97706;letter-spacing:-1px;">$' + totalPossible.toFixed(2) + '</div>'
    + '</div>'
    + choresHtml
    + '<div style="background:#f0f6ff;border-radius:12px;padding:16px;margin-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;gap:8px;">'
    + '<div><div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Checking</div><div style="font-size:18px;font-weight:800;color:'+primary+';">$'+checking+'</div></div>'
    + '<div><div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Savings</div><div style="font-size:18px;font-weight:800;color:'+secondary+';">$'+savings+'</div></div>'
    + '<div><div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Total</div><div style="font-size:18px;font-weight:800;color:#1e293b;">$'+total+'</div></div>'
    + '</div>'
    + '<p style="margin:16px 0 0;color:#64748b;font-size:13px;text-align:center;font-weight:600;">Log in to complete your chores and earn money! 💪</p>'
    + '</div>'
    + '<div style="background:#f8faff;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">'
    + '<a href="' + APP_URL + '" style="display:inline-block;background:' + primary + ';color:white;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:20px;margin-bottom:10px;">🏦 Open Family Bank</a>'
    + '<p style="margin:0;font-size:12px;color:#94a3b8;">— <strong style="color:'+primary+';">' + bankName + '</strong></p>'
    + '</div></div></body></html>';
}

function sendSimpleEmail(to, subject, htmlBody) {
  try { MailApp.sendEmail({to: to, subject: subject, htmlBody: htmlBody}); }
  catch(err) { Logger.log("sendSimpleEmail ERROR to " + to + ": " + err); }
}

// ================================================================
// [HELPERS]
// ================================================================
function loadState() {
  try {
    // Check cache first — avoids Sheet read if data was recently loaded
    var cache = CacheService.getScriptCache();
    var cached = cache.get("familyBankState");
    if (cached) {
      if (DEBUG_LOGGING) Logger.log("loadState: cache hit");
      var s = JSON.parse(cached);
      if (s && s.pins) return postProcessState(s);
    }
    var raw = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getRange("A1").getValue();
    if (!raw) return buildDefaultState();
    var s = JSON.parse(raw);
    // postProcessState handles migration and defaults
    if (DEBUG_LOGGING) Logger.log("loadState OK: " + JSON.stringify(Object.keys(s)));
    // Cache for 60 seconds to speed up repeat reads
    try {
      var cache = CacheService.getScriptCache();
      var toCache = JSON.stringify(s);
      if (toCache.length < 100000) cache.put("familyBankState", toCache, 60);
    } catch(ce) {}
    return postProcessState(s);
  } catch(err) {
    Logger.log("loadState ERROR: " + err);
    return buildDefaultState();
  }
}

/** Post-process state after loading — migration and defaults */
function postProcessState(s) {
  if (!s.config)   s.config   = {};
  if (!s.children) s.children = {};
  if (!s.users)    s.users    = Object.keys(s.pins || {});
  if (!s.roles)    s.roles    = {};
  if (!s.config.emails)    s.config.emails    = {};
  if (!s.config.calendars) s.config.calendars = {};
  if (!s.config.notify)    s.config.notify    = {};
  if (!s.config.tabs)      s.config.tabs      = {};
  // Auto-migrate v1 flat structure → per-child
  if (s.balances) {
    var childName = getChildNames(s)[0] || DEFAULT_CHILD_NAME;
    if (!s.children[childName]) {
      s.children[childName] = {
        balances:    s.balances    || {checking: 0, savings: 0},
        rates:       s.rates       || {checking: 0, savings: 0},
        autoDeposit: s.autoDeposit || {checking: 0, savings: 0},
        chores:      s.chores      || []
      };
    }
    delete s.balances; delete s.rates; delete s.autoDeposit; delete s.chores;
    Logger.log("postProcessState: migrated v1 data");
  }
  return s;
}

function saveState(state) {
  SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getRange("A1").setValue(JSON.stringify(state));
  // Invalidate cache so next read gets fresh data
  try { CacheService.getScriptCache().remove("familyBankState"); } catch(e) {}
}

function getLedgerSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Ledger");
  if (!sheet) {
    sheet = ss.insertSheet("Ledger");
    sheet.appendRow(["Date", "User", "Child", "Note", "Amount"]);
    sheet.getRange("1:1").setFontWeight("bold");
  }
  return sheet;
}

function getChildNames(state) {
  var u = state.users || [];
  var r = state.roles || {};
  return u.filter(function(x) { return r[x] === "child"; });
}

function getParentNames(state) {
  var u = state.users || [];
  var r = state.roles || {};
  return u.filter(function(x) { return r[x] === "parent"; });
}

function getParentName(state) {
  return getParentNames(state)[0] || DEFAULT_PARENT_NAME;
}

/**
 * getParentEmails(state, childName)
 * Returns emails for parents assigned to childName.
 * If no per-parent assignments configured, returns all parent emails (backwards compatible).
 * childName is optional.
 */
function getParentEmails(state, childName) {
  var emails = [];
  var parentAssignments = state && state.config && state.config.parentChildren;
  getParentNames(state).forEach(function(name) {
    if (childName && parentAssignments && parentAssignments[name]) {
      var assigned = parentAssignments[name];
      if (assigned.indexOf(childName) === -1) return;
    }
    var e = getEmailFor(state, name);
    if (e) emails.push(e);
  });
  if (!emails.length && FALLBACK_PARENT_EMAIL) emails.push(FALLBACK_PARENT_EMAIL);
  return emails;
}

function getEmailFor(state, username) {
  var emails = state && state.config && state.config.emails;
  if (emails && emails[username]) return emails[username];
  // Fallbacks
  if (state && state.roles && state.roles[username] === "parent") return FALLBACK_PARENT_EMAIL;
  if (state && state.roles && state.roles[username] === "child")  return FALLBACK_CHILD_EMAIL;
  return "";
}

function getBankName(state)  { return (state && state.config && state.config.bankName) || BANK_NAME; }
function getPrimary(state)   { return (state && state.config && state.config.colorPrimary)   || DEFAULT_COLOR_PRIMARY; }
function getSecondary(state) { return (state && state.config && state.config.colorSecondary) || DEFAULT_COLOR_SECONDARY; }
function getParentName(state){ return getParentNames(state)[0] || DEFAULT_PARENT_NAME; }

function getTimezone(state) {
  var map = {
    "GMT-5":"America/New_York",  "GMT-6":"America/Chicago",
    "GMT-7":"America/Denver",    "GMT-8":"America/Los_Angeles",
    "GMT-4":"America/Halifax",   "GMT+0":"UTC",
    "GMT+1":"Europe/London",     "GMT+2":"Europe/Berlin"
  };
  var tz = (state && state.config && state.config.timezone) || "GMT-5";
  return map[tz] || BANK_TIMEZONE;
}

function shadeColorGs(hex, pct) {
  try {
    var n = parseInt((hex || "#2563eb").replace("#",""), 16);
    var r = Math.max(0, Math.min(255, (n >> 16)         + Math.round(2.55 * pct)));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + Math.round(2.55 * pct)));
    var b = Math.max(0, Math.min(255, (n & 0xff)        + Math.round(2.55 * pct)));
    return "#" + [r,g,b].map(function(x) { return x.toString(16).padStart(2,"0"); }).join("");
  } catch(e) { return "#1d4ed8"; }
}

function isDayInterval(today, anchorStr, days) {
  try {
    var anchor = new Date(anchorStr);
    if (isNaN(anchor.getTime())) return false;
    var diff = Math.floor((today.getTime() - anchor.getTime()) / (24*60*60*1000));
    return diff > 0 && diff % days === 0;
  } catch(e) { return false; }
}

function todayDateStr() {
  return Utilities.formatDate(new Date(), BANK_TIMEZONE, "yyyy-MM-dd");
}

function getLastChoreEntry(childName) {
  var data = getLedgerSheet().getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    var row   = data[i];
    var note  = String(row[3] || "");
    var child = String(row[2] || "");
    if ((child === childName || !child) && note.indexOf("Chore:") === 0) return row;
  }
  return null;
}

function calcYTDInterest(childName) {
  try {
    var data  = getLedgerSheet().getDataRange().getValues();
    var year  = new Date().getFullYear();
    var total = 0;
    for (var i = 1; i < data.length; i++) {
      var child = String(data[i][2] || "");
      var note  = String(data[i][3] || "").toLowerCase();
      var amt   = parseFloat(data[i][4]) || 0;
      var rowYear = 0;
      try { rowYear = new Date(data[i][0]).getFullYear(); } catch(e) {}
      if ((child === childName || !child) && note.includes("interest") && rowYear === year) {
        total += amt;
      }
    }
    return total;
  } catch(e) { return 0; }
}

// ================================================================
// [DEFAULT STATE] — Used only when Sheet1 A1 is blank
// ================================================================
function buildDefaultState() {
  var defaultState = {
    config: {
      bankName:       BANK_NAME,
      tagline:        BANK_TAGLINE,
      colorPrimary:   DEFAULT_COLOR_PRIMARY,
      colorSecondary: DEFAULT_COLOR_SECONDARY,
      imgBanner:  "images/banner.png",
      imgLogo:    "images/logo.png",
      imgIcon:    "images/icon.png",
      timezone:   "GMT-5",
      adminPin:   DEFAULT_ADMIN_PIN,
      emails: {}
    },
    pins:  {},
    roles: {},
    users: [DEFAULT_PARENT_NAME, DEFAULT_CHILD_NAME],
    children: {}
  };

  // Set up default parent
  defaultState.pins[DEFAULT_PARENT_NAME]  = DEFAULT_PARENT_PIN;
  defaultState.roles[DEFAULT_PARENT_NAME] = "parent";
  defaultState.config.emails[DEFAULT_PARENT_NAME] = FALLBACK_PARENT_EMAIL;

  // Set up default child
  defaultState.pins[DEFAULT_CHILD_NAME]  = DEFAULT_CHILD_PIN;
  defaultState.roles[DEFAULT_CHILD_NAME] = "child";
  defaultState.config.emails[DEFAULT_CHILD_NAME] = FALLBACK_CHILD_EMAIL;
  defaultState.children[DEFAULT_CHILD_NAME] = {
    balances:    {checking: DEFAULT_CHECKING_BALANCE, savings: DEFAULT_SAVINGS_BALANCE},
    rates:       {checking: DEFAULT_CHECKING_RATE,    savings: DEFAULT_SAVINGS_RATE},
    autoDeposit: {checking: DEFAULT_ALLOWANCE_CHECKING, savings: DEFAULT_ALLOWANCE_SAVINGS},
    chores: []
  };

  return defaultState;
}

// ================================================================
// [GOOGLE CALENDAR] — Per-child chore calendar integration
//
// SETUP (do this once per child in Google Calendar):
//   1. Create a new calendar named "[Child]'s Chores"
//   2. Share it with the child's email — "See all event details"
//   3. Go to calendar Settings → find Calendar ID
//      (looks like abc123@group.calendar.google.com)
//   4. Paste that ID into the Family Bank Admin panel
//      under the child's Calendar ID field
//   5. Save settings — all future chore events will sync automatically
//
// HOW IT WORKS:
//   Chore Created  → creates a calendar event (recurring if repeating)
//   Chore Edited   → updates the existing event
//   Chore Deleted  → removes the event
//   Chore Approved → removes the event (chore is done)
//   Chore Denied   → leaves the event (child needs to try again)
// ================================================================

/**
 * ════════════════════════════════════════════════════════════════════
 * v30 CALENDAR MODULE — STABLE PER-DAY SERIES
 * ════════════════════════════════════════════════════════════════════
 *
 * Each chore creates ONE event series per scheduled day-of-week. Each
 * series is anchored to its first instance and identified by a tag
 * embedded in its description: CHORE_ID:<id>:DAY:<n>
 *
 * This means:
 *   • Bi-weekly anchors are stable (no drift between parents)
 *   • Each day can have its own reminder time (chore.dayTimes[day])
 *   • Edits/deletes find events by tag — no reliance on title or
 *     stored event IDs (which were brittle in v29).
 *
 * Scan window is tightened to roughly the past month + next year, vs.
 * v29's 3-year window — ~12× faster on every chore mutation.
 */

/** Per-day reminder hour with fallback to single chore.reminderHour. */
function getReminderHourForDay(chore, dayNum) {
  if (chore.dayTimes && chore.dayTimes[dayNum] !== undefined) {
    return parseInt(chore.dayTimes[dayNum]) || 8;
  }
  if (chore.dayTimes && chore.dayTimes[String(dayNum)] !== undefined) {
    return parseInt(chore.dayTimes[String(dayNum)]) || 8;
  }
  return parseInt(chore.reminderHour) || 8;
}

/** Build the calendar event title shown to the user. */
function buildEventTitle(chore) {
  return "🏦 " + chore.name + " — Earn $" + (parseFloat(chore.amount) || 0).toFixed(2);
}

/** Build the description, embedding CHORE_ID + (optional) DAY tag for lookup. */
function buildEventDescription(chore, dayNum) {
  var split = chore.childChooses
    ? "You choose your own split"
    : (chore.splitChk || 100) + "% Checking / " + (100 - (chore.splitChk || 100)) + "% Savings";
  var tag = "CHORE_ID:" + (chore.id || "");
  if (dayNum !== undefined && dayNum !== null) tag += ":DAY:" + dayNum;
  var lines = [
    "💰 Reward: $" + (parseFloat(chore.amount) || 0).toFixed(2),
    "💵 Payout: " + split,
    "📅 Schedule: " + ({once:"One-time",daily:"Daily",weekly:"Weekly",biweekly:"Bi-weekly",monthly:"Monthly"}[chore.schedule] || chore.schedule),
    "",
    chore.desc ? "📝 " + chore.desc : "",
    "",
    "🏦 Mark complete in the Family Bank app:",
    APP_URL,
    "",
    tag
  ];
  return lines.filter(function(l){ return l !== undefined && l !== null; }).join("\n");
}

/** Resolve "last", "last-1", "last-2" to actual day numbers in a given month. */
function resolveMonthlyDayGs(monthlyDay, year, month) {
  var dim = new Date(year, month + 1, 0).getDate();
  if (monthlyDay === "last")   return dim;
  if (monthlyDay === "last-1") return dim - 1;
  if (monthlyDay === "last-2") return dim - 2;
  return parseInt(monthlyDay) || 1;
}

/** Return the calendar ID for a child, or null if unset. */
function getCalendarId(state, childName) {
  var cals = state && state.config && state.config.calendars;
  return (cals && cals[childName]) ? String(cals[childName]).trim() : null;
}

/**
 * Main router — called from doPost after every chore mutation.
 * Routes to delete + create in the right combination for the action.
 */
function syncCalendarEvent(state, lastAction, activeChild) {
  try {
    if (!activeChild) return;
    if (!notifyCalendar(state, activeChild)) {
      if (DEBUG_LOGGING) Logger.log("syncCalendarEvent: calendar OFF for " + activeChild);
      return;
    }
    var calendarId = getCalendarId(state, activeChild);
    if (!calendarId) {
      Logger.log("syncCalendarEvent: no Calendar ID for " + activeChild);
      return;
    }
    var data = state.children && state.children[activeChild];
    if (!data) return;
    var chores = data.chores || [];
    var tz     = getTimezone(state);

    if (lastAction === "Chore Created") {
      var newChore = chores[chores.length - 1];
      if (newChore) {
        deleteEventsByChoreId(calendarId, newChore.id);  // safety
        createEventsForChore(calendarId, newChore, tz);
        Logger.log("syncCalendarEvent: created event(s) for '" + newChore.name + "'");
      }

    } else if (lastAction === "Chore Edited") {
      var editedId = state._editedChoreId || null;
      chores.forEach(function(chore) {
        if (!editedId || chore.id === editedId) {
          deleteEventsByChoreId(calendarId, chore.id);
          createEventsForChore(calendarId, chore, tz);
        }
      });
      Logger.log("syncCalendarEvent: rebuilt event(s) for choreId=" + (editedId || "ALL"));

    } else if (lastAction === "Chore Deleted") {
      if (state._deletedChoreId) {
        deleteEventsByChoreId(calendarId, state._deletedChoreId);
        Logger.log("syncCalendarEvent: deleted event(s) for choreId=" + state._deletedChoreId);
      }

    } else if (lastAction === "Chore Approved") {
      if (state._approvedChoreSchedule === "once" && state._approvedChoreId) {
        deleteEventsByChoreId(calendarId, state._approvedChoreId);
        Logger.log("syncCalendarEvent: removed one-time event choreId=" + state._approvedChoreId);
      }
    }

    Logger.log("syncCalendarEvent: " + lastAction + " complete for " + activeChild);
  } catch(err) { Logger.log("syncCalendarEvent ERROR: " + err); }
}

/**
 * Delete all events whose description contains "CHORE_ID:<choreId>".
 * Searches a tight window: 1 month ago to 1 year ahead. Recurring event
 * series are matched and deleted as series (deleteEventSeries).
 */
function deleteEventsByChoreId(calendarId, choreId) {
  try {
    if (!choreId) return;
    var cal = CalendarApp.getCalendarById(calendarId);
    if (!cal) return;

    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var end   = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    var events = cal.getEvents(start, end);

    var seriesSeen = {};   // dedupe — series can return multiple instances
    var deletedSeries = 0;
    var deletedSingle = 0;
    var searchStr = "CHORE_ID:" + choreId;

    events.forEach(function(ev) {
      try {
        var desc = ev.getDescription() || "";
        if (desc.indexOf(searchStr) === -1) return;
        if (ev.isRecurringEvent()) {
          var sid = ev.getEventSeries().getId();
          if (seriesSeen[sid]) return;
          seriesSeen[sid] = true;
          ev.getEventSeries().deleteEventSeries();
          deletedSeries++;
        } else {
          ev.deleteEvent();
          deletedSingle++;
        }
      } catch(e) { Logger.log("deleteEventsByChoreId: skip event — " + e); }
    });

    Logger.log("deleteEventsByChoreId: " + deletedSeries + " series + " + deletedSingle + " single event(s) for choreId=" + choreId);
  } catch(err) { Logger.log("deleteEventsByChoreId ERROR: " + err); }
}

/**
 * Create all events for a chore based on its schedule.
 *   • once    → single event on chore.onceDate
 *   • daily   → one daily-recurring series
 *   • weekly  → one weekly series PER selected day-of-week (each independent)
 *   • biweekly→ one bi-weekly series PER selected day-of-week (each anchored
 *               to its first occurrence — no drift)
 *   • monthly → one monthly series on the resolved day-of-month
 *
 * For weekly/biweekly multi-day chores, each day's series uses its own
 * reminder hour from chore.dayTimes[day] (falling back to chore.reminderHour).
 */
function createEventsForChore(calendarId, chore, tz) {
  try {
    var cal = CalendarApp.getCalendarById(calendarId);
    if (!cal) { Logger.log("createEventsForChore: calendar not found — " + calendarId); return; }
    if (!chore || !chore.id) return;

    var title = buildEventTitle(chore);
    var now   = new Date();

    if (chore.schedule === "once") {
      var hour = parseInt(chore.reminderHour) || 8;
      var d = chore.onceDate ? new Date(chore.onceDate + "T00:00:00") : new Date();
      d.setHours(hour, 0, 0, 0);
      var endDt = new Date(d.getTime() + 30 * 60 * 1000);
      cal.createEvent(title, d, endDt, {description: buildEventDescription(chore)});
      Logger.log("createEventsForChore[once] '" + chore.name + "' → " + d.toString());
      return;
    }

    if (chore.schedule === "daily") {
      var hour = parseInt(chore.reminderHour) || 8;
      var s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
      var e = new Date(s.getTime() + 30 * 60 * 1000);
      var rec = CalendarApp.newRecurrence().addDailyRule();
      cal.createEventSeries(title, s, e, rec, {description: buildEventDescription(chore)});
      Logger.log("createEventsForChore[daily] '" + chore.name + "'");
      return;
    }

    if (chore.schedule === "weekly" || chore.schedule === "biweekly") {
      var weekdayMap = [
        CalendarApp.Weekday.SUNDAY, CalendarApp.Weekday.MONDAY,
        CalendarApp.Weekday.TUESDAY, CalendarApp.Weekday.WEDNESDAY,
        CalendarApp.Weekday.THURSDAY, CalendarApp.Weekday.FRIDAY,
        CalendarApp.Weekday.SATURDAY
      ];
      var days = (chore.weekdays && chore.weekdays.length)
        ? chore.weekdays.map(function(d){ return parseInt(d); })
        : (chore.weekday !== undefined ? [parseInt(chore.weekday)] : [now.getDay()]);

      // One independent series PER selected day. Each anchored to its first
      // future occurrence — bi-weekly cadence is then stable.
      // v30.1: if chore.skipFirstWeek, shift anchor +7 days (bi-weekly only)
      var skipWeek = (chore.schedule === "biweekly" && chore.skipFirstWeek === true);
      days.forEach(function(targetDay) {
        var hour = getReminderHourForDay(chore, targetDay);
        var daysUntil = (targetDay - now.getDay() + 7) % 7;
        if (daysUntil === 0 && now.getHours() >= hour) daysUntil = 7;
        if (skipWeek) daysUntil += 7;
        var anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil, hour, 0, 0);
        var endDt  = new Date(anchor.getTime() + 30 * 60 * 1000);
        var rec = (chore.schedule === "weekly")
          ? CalendarApp.newRecurrence().addWeeklyRule().onlyOnWeekday(weekdayMap[targetDay])
          : CalendarApp.newRecurrence().addWeeklyRule().interval(2).onlyOnWeekday(weekdayMap[targetDay]);
        cal.createEventSeries(title, anchor, endDt, rec, {description: buildEventDescription(chore, targetDay)});
        Logger.log("createEventsForChore[" + chore.schedule + "] '" + chore.name + "' day=" + targetDay + " hour=" + hour + (skipWeek ? " (skip week)" : ""));
      });
      return;
    }

    if (chore.schedule === "monthly") {
      var hour = parseInt(chore.reminderHour) || 8;
      var resolvedDay = resolveMonthlyDayGs(chore.monthlyDay || "1", now.getFullYear(), now.getMonth());
      var anchor = new Date(now.getFullYear(), now.getMonth(), resolvedDay, hour, 0, 0);
      if (anchor < now) anchor = new Date(now.getFullYear(), now.getMonth() + 1, resolvedDay, hour, 0, 0);
      var endDt = new Date(anchor.getTime() + 30 * 60 * 1000);
      var rec = CalendarApp.newRecurrence().addMonthlyRule();
      cal.createEventSeries(title, anchor, endDt, rec, {description: buildEventDescription(chore)});
      Logger.log("createEventsForChore[monthly] '" + chore.name + "' day=" + resolvedDay);
      return;
    }
  } catch(err) {
    Logger.log("createEventsForChore ERROR for '" + (chore && chore.name || "?") + "': " + err.toString());
  }
}

/**
 * Admin tool — run from Apps Script editor to nuke and rebuild ALL
 * calendar events for one child. Use when calendar drifts out of sync.
 *
 * Usage: change CHILD_NAME below, then Run.
 */
function resyncCalendarForChild() {
  var CHILD_NAME = "Linnea";  // ← change this to the child you want to resync

  var state = loadState();
  if (!state.children || !state.children[CHILD_NAME]) {
    Logger.log("resyncCalendarForChild: no such child — " + CHILD_NAME);
    return;
  }
  var calendarId = getCalendarId(state, CHILD_NAME);
  if (!calendarId) {
    Logger.log("resyncCalendarForChild: no Calendar ID set for " + CHILD_NAME);
    return;
  }
  var chores = state.children[CHILD_NAME].chores || [];
  var tz = getTimezone(state);
  Logger.log("resyncCalendarForChild: " + CHILD_NAME + " has " + chores.length + " chore(s)");
  chores.forEach(function(chore) {
    deleteEventsByChoreId(calendarId, chore.id);
    createEventsForChore(calendarId, chore, tz);
  });
  Logger.log("resyncCalendarForChild: complete for " + CHILD_NAME);
}

/** Check if a user has email notifications enabled (default: true) */
function notifyEmail(state, username) {
  var n = state && state.config && state.config.notify && state.config.notify[username];
  if (!n) return true; // default ON if not set
  return n.email !== false;
}

/** Check if a user has calendar notifications enabled (default: false) */
function notifyCalendar(state, username) {
  var n = state && state.config && state.config.notify && state.config.notify[username];
  if (!n) return false; // default OFF if not set
  return n.calendar === true;
}

/**
 * TEST TOOL — Run from Apps Script editor to test calendar integration
 * Creates a test event on the child's calendar and immediately deletes it
 */
function testCalendarIntegration() {
  var state = loadState();
  var children = getChildNames(state);
  if (!children.length) { Logger.log("testCalendarIntegration: no children found"); return; }
  var childName  = children[0];
  var calendarId = getCalendarId(state, childName);
  if (!calendarId) {
    Logger.log("testCalendarIntegration: no calendar ID set for " + childName + " — add it in the Admin panel first");
    return;
  }
  Logger.log("testCalendarIntegration: testing calendar '" + calendarId + "' for " + childName);
  var cal = CalendarApp.getCalendarById(calendarId);
  if (!cal) { Logger.log("testCalendarIntegration: calendar not found — check the ID"); return; }
  var testEvent = cal.createAllDayEvent("🏦 Family Bank Test Event — safe to delete", new Date());
  Logger.log("testCalendarIntegration: SUCCESS — test event created. Check " + childName + "'s calendar.");
  Logger.log("testCalendarIntegration: deleting test event now...");
  testEvent.deleteEvent();
  Logger.log("testCalendarIntegration: test event deleted. Calendar integration is working!");
}

// ================================================================
// [DEBUG TEST FUNCTIONS] — Run from Apps Script editor to diagnose issues
// ================================================================

/**
 * testCreateChoreEvent
 * Creates a real weekly recurring test chore event on the child's calendar
 * and logs every step in detail. Run this, then paste the Execution Log
 * into chat so we can see exactly where it fails.
 */
function testCreateChoreEvent() {
  Logger.log("=== testCreateChoreEvent START ===");

  // Load state and find first child with a calendar ID
  var state     = loadState();
  var children  = getChildNames(state);
  Logger.log("Children found: " + JSON.stringify(children));

  if (!children.length) { Logger.log("ERROR: No children found in state"); return; }

  var childName  = children[0];
  var calendarId = getCalendarId(state, childName);
  Logger.log("Child: " + childName);
  Logger.log("Calendar ID: " + (calendarId || "NOT SET"));
  Logger.log("Calendar notifications enabled: " + notifyCalendar(state, childName));

  if (!calendarId) {
    Logger.log("ERROR: No Calendar ID set for " + childName + " — add it in Admin panel first");
    return;
  }

  // Get the calendar
  Logger.log("Getting calendar by ID...");
  var cal = CalendarApp.getCalendarById(calendarId);
  Logger.log("Calendar object: " + (cal ? cal.getName() : "NULL — calendar not found"));
  if (!cal) { Logger.log("ERROR: Calendar not found — check the ID is correct"); return; }

  // Build a test chore mimicking a weekly Tuesday chore
  var testChore = {
    id:           "test_" + Date.now(),
    name:         "TEST Weekly Chore — safe to delete",
    amount:       1.00,
    schedule:     "weekly",
    weekday:      2,  // Tuesday (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
    reminderHour: 17, // 5:00 PM
    splitChk:     100,
    childChooses: false,
    desc:         "Debug test event"
  };

  Logger.log("Test chore: " + JSON.stringify(testChore));

  // Log the weekday mapping
  var weekdayMap = [
    CalendarApp.Weekday.SUNDAY,
    CalendarApp.Weekday.MONDAY,
    CalendarApp.Weekday.TUESDAY,
    CalendarApp.Weekday.WEDNESDAY,
    CalendarApp.Weekday.THURSDAY,
    CalendarApp.Weekday.FRIDAY,
    CalendarApp.Weekday.SATURDAY
  ];
  Logger.log("Weekday enum for Tuesday (2): " + weekdayMap[2]);
  Logger.log("All weekday enums: " + JSON.stringify(weekdayMap));

  // Calculate event date
  var now       = new Date();
  var h         = testChore.reminderHour;
  var targetDay = testChore.weekday;
  var daysUntil = (targetDay - now.getDay() + 7) % 7;
  if (daysUntil === 0 && now.getHours() >= h) daysUntil = 7;
  var startMs   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0).getTime();
  var eventDate = new Date(startMs + daysUntil * 24*60*60*1000);
  var endDate   = new Date(eventDate.getTime() + 30*60*1000);

  Logger.log("Today: " + now.toDateString() + " (day " + now.getDay() + ")");
  Logger.log("Target weekday: " + targetDay + " (Tuesday)");
  Logger.log("Days until: " + daysUntil);
  Logger.log("Event date: " + eventDate.toDateString() + " at " + eventDate.toTimeString());
  Logger.log("Event end:  " + endDate.toDateString() + " at " + endDate.toTimeString());

  // Build recurrence rule
  Logger.log("Building recurrence rule...");
  var recur = CalendarApp.newRecurrence().addWeeklyRule().onlyOnWeekday(weekdayMap[targetDay]);
  Logger.log("Recurrence rule built: " + recur);

  // Create a real weekly test event using confirmed working createEventSeries
  Logger.log("Creating weekly test event with createEventSeries...");
  try {
    var series = cal.createEventSeries(
      "🏦 TEST Weekly — safe to delete",
      eventDate, endDate, recur,
      {description: "Family Bank test event — delete me after checking calendar"}
    );
    Logger.log("SUCCESS — Event series ID: " + series.getId());
    Logger.log("Check calendar: should show as 'Weekly on Tuesdays' at 5pm");
    Logger.log("Delete it manually from Google Calendar when done.");
    Logger.log("=== testCreateChoreEvent COMPLETE ===");
  } catch(err) {
    Logger.log("ERROR: " + err.toString());
    Logger.log("=== testCreateChoreEvent FAILED ===");
  }
}

/**
 * printReadableState
 * Prints a clean, human-readable summary of the entire bank state
 * to the Execution Log. Much easier than reading raw JSON in the sheet.
 */
function printReadableState() {
  Logger.log("=== FAMILY BANK — READABLE STATE ===");
  var s = loadState();
  Logger.log("Bank: " + getBankName(s));
  Logger.log("Tagline: " + (s.config.tagline || "none"));
  Logger.log("Admin PIN: " + (s.config.adminPin || "not set"));
  Logger.log("Timezone: " + (s.config.timezone || "not set"));
  Logger.log("");
  Logger.log("--- USERS ---");
  (s.users || []).forEach(function(u) {
    var role  = (s.roles || {})[u] || "unknown";
    var email = (s.config.emails || {})[u] || "no email";
    var calId = (s.config.calendars || {})[u] || "no calendar";
    var notify= (s.config.notify || {})[u] || {};
    Logger.log(u + " [" + role + "] email:" + email
      + " | emailNotif:" + (notify.email !== false)
      + " | calNotif:" + (!!notify.calendar)
      + (role === "child" ? " | calID:" + calId : ""));
  });
  Logger.log("");
  Logger.log("--- CHILDREN ---");
  getChildNames(s).forEach(function(c) {
    var d = s.children[c] || {};
    var b = d.balances || {};
    var r = d.rates || {};
    var a = d.autoDeposit || {};
    var chores = d.chores || [];
    Logger.log(c + ":");
    Logger.log("  Checking: $" + (b.checking||0).toFixed(2) + " @ " + (r.checking||0) + "% APY");
    Logger.log("  Savings:  $" + (b.savings||0).toFixed(2)  + " @ " + (r.savings||0)  + "% APY");
    Logger.log("  Allowance: $" + (a.checking||0).toFixed(2) + " chk / $" + (a.savings||0).toFixed(2) + " sav per week");
    Logger.log("  Chores (" + chores.length + "):");
    chores.forEach(function(ch) {
      Logger.log("    - " + ch.name
        + " | $" + (ch.amount||0).toFixed(2)
        + " | " + ch.schedule
        + (ch.weekday !== undefined ? " (day " + ch.weekday + ")" : "")
        + (ch.monthlyDay ? " (day " + ch.monthlyDay + ")" : "")
        + " | status:" + (ch.status||"?")
        + " | calEventId:" + (ch.calendarEventId||"none")
        + " | reminderHour:" + (ch.reminderHour||8));
    });
  });
  Logger.log("");
  Logger.log("--- LEDGER ROWS ---");
  var history = loadHistory();
  var total = 0;
  Object.keys(history).forEach(function(child) {
    Logger.log(child + ": " + (history[child]||[]).length + " transactions");
    total += (history[child]||[]).length;
  });
  Logger.log("Total: " + total + " transactions");
  Logger.log("=== END OF STATE ===");
}

// ================================================================
// [STREAK & NET WORTH HELPERS]
// ================================================================


// ================================================================
// [STREAK MILESTONE] — Auto-deposit bonus when milestone hit
// ================================================================
/**
 * checkStreakMilestone — called after chore approval.
 * Increments chore.streakCount. If it hits a multiple of streakMilestone,
 * auto-deposits streakReward into checking.
 * Returns the bonus amount deposited (0 if no milestone hit).
 */
function checkStreakMilestone(state, child, chore, ledger, now) {
  try {
    if (!chore.streakMilestone || !chore.streakReward) return 0;
    var milestone = parseInt(chore.streakMilestone) || 0;
    var reward    = parseFloat(chore.streakReward) || 0;
    if (milestone <= 0 || reward <= 0) return 0;

    // Increment instance count
    chore.streakCount = (parseInt(chore.streakCount) || 0) + 1;
    var effective = chore.streakCount + (parseInt(chore.streakStart) || 0);

    if (effective % milestone !== 0) return 0;

    // Milestone hit — deposit bonus to checking
    var data = state.children[child];
    data.balances.checking += reward;
    ledger.appendRow([now, "Bank", child,
      "🔥 Streak Bonus: " + chore.name + " (" + effective + " in a row!) (Chk)", reward]);
    Logger.log("checkStreakMilestone: " + child + " — " + chore.name + " hit " + effective + " streak! Bonus $" + reward);
    return reward;
  } catch(e) {
    Logger.log("checkStreakMilestone ERROR: " + e);
    return 0;
  }
}

function calcChoreStreaks(childName, data) {
  try {
    var chores = data.chores || [];
    var ledger = getLedgerSheet().getDataRange().getValues();
    var streaks = [];
    chores.forEach(function(chore) {
      if (!chore.name) return;
      var completions = [];
      for (var i = 1; i < ledger.length; i++) {
        var row = ledger[i];
        var child = String(row[2] || "");
        var note  = String(row[3] || "");
        if ((child === childName || !child) && note.indexOf("Chore: " + chore.name) === 0) {
          try { completions.push(new Date(row[0])); } catch(e) {}
        }
      }
      if (!completions.length) return;
      completions.sort(function(a,b){return a-b;});
      var streak = 1;
      var interval = chore.schedule === "daily" ? 1 : chore.schedule === "weekly" ? 7 : chore.schedule === "biweekly" ? 14 : 30;
      for (var j = completions.length - 1; j > 0; j--) {
        var diff = Math.round((completions[j] - completions[j-1]) / (24*60*60*1000));
        if (diff <= interval + 2) { streak++; } else { break; }
      }
      var unit = chore.schedule === "daily" ? "days" : chore.schedule === "monthly" ? "months" : "weeks";
      if (streak >= 2) streaks.push({name: chore.name, streak: streak, unit: unit});
    });
    return streaks.sort(function(a,b){return b.streak - a.streak;});
  } catch(e) { Logger.log("calcChoreStreaks ERROR: " + e); return []; }
}

function calcNetWorthHistory(childName) {
  try {
    var ledger = getLedgerSheet().getDataRange().getValues();
    var running = 0;
    var monthly = {};
    for (var i = 1; i < ledger.length; i++) {
      var row   = ledger[i];
      var child = String(row[2] || "");
      if (child !== childName && child !== "") continue;
      var amt = parseFloat(row[4]) || 0;
      running += amt;
      try {
        var d   = new Date(row[0]);
        var key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
        monthly[key] = running;
      } catch(e) {}
    }
    // v30.1: Always ensure a current-month data point exists so day-one charts
    // aren't empty. If the current month already has ledger activity, its
    // running total is already correct. Otherwise, fall back to current balance.
    try {
      var state = loadState();
      var child = state.children && state.children[childName];
      if (child && child.balances) {
        var now = new Date();
        var currentKey = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
        if (!monthly.hasOwnProperty(currentKey)) {
          var total = (parseFloat(child.balances.checking) || 0) + (parseFloat(child.balances.savings) || 0);
          monthly[currentKey] = total;
        }
      }
    } catch(e) { Logger.log("calcNetWorthHistory: fallback skipped — " + e); }

    var result = [];
    Object.keys(monthly).sort().forEach(function(k){ result.push({month: k, total: parseFloat(monthly[k].toFixed(2))}); });
    return result;
  } catch(e) { Logger.log("calcNetWorthHistory ERROR: " + e); return []; }
}

// ================================================================
// [SETUP] — Run once from Apps Script editor after pasting this file
// ================================================================
function setupBank() {
  // Create Ledger tab if it doesn't exist
  getLedgerSheet();

  // Write default state to A1 only if it's empty
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (!sheet.getRange("A1").getValue()) {
    saveState(buildDefaultState());
    Logger.log("setupBank: default state written to A1");
  } else {
    Logger.log("setupBank: A1 already has data — not overwriting (existing bank data is safe)");
  }

  // Install triggers (skips any that already exist)
  var existing = {};
  ScriptApp.getProjectTriggers().forEach(function(t) {
    existing[t.getHandlerFunction()] = true;
  });

  [
    {fn: "automatedMondayDeposit", type: "weekly",  day: ScriptApp.WeekDay.MONDAY, hour: 8},
    {fn: "monthlyMaintenance",     type: "monthly", day: 1,                        hour: 7},
    {fn: "dailyChoreReset",        type: "daily",   hour: 6},
    {fn: "sundayChoreReminder",    type: "weekly",  day: ScriptApp.WeekDay.SUNDAY, hour: 9}
  ].forEach(function(t) {
    if (existing[t.fn]) {
      Logger.log("setupBank: trigger already installed — " + t.fn);
      return;
    }
    var tb = ScriptApp.newTrigger(t.fn).timeBased();
    if (t.type === "weekly")  tb = tb.onWeekDay(t.day).atHour(t.hour);
    if (t.type === "monthly") tb = tb.onMonthDay(t.day).atHour(t.hour);
    if (t.type === "daily")   tb = tb.everyDays(1).atHour(t.hour);
    tb.create();
    Logger.log("setupBank: trigger installed — " + t.fn);
  });

  Logger.log("setupBank: done! Deploy as Web App → Execute as Me → Anyone can access.");
}

// ================================================================
// [TOOLS] — Run any of these manually from the Apps Script editor
// ================================================================

/**
 * cleanOrphanedStateKeys
 * Run this ONCE manually to clean up leftover calendar helper keys
 * that got permanently saved into the state blob in Sheet1 A1.
 * Safe to run — only removes the specific keys, touches nothing else.
 */
function cleanOrphanedStateKeys() {
  Logger.log("cleanOrphanedStateKeys: loading state...");
  var state = loadState();
  var keysToRemove = [
    "_deletedChoreName", "_deletedChoreTitle", "_deletedChoreId",
    "_approvedChoreName", "_approvedChoreTitle", "_approvedChoreId", "_approvedChoreSchedule",
    "_editedChoreName", "_editedChoreId",
    "_deletedCalEventIds", "_deletedCalEventId", "_approvedCalEventId"
  ];
  var removed = [];
  keysToRemove.forEach(function(k) {
    if (state.hasOwnProperty(k)) {
      delete state[k];
      removed.push(k);
    }
  });
  if (removed.length) {
    saveState(state);
    Logger.log("cleanOrphanedStateKeys: removed " + removed.length + " key(s): " + removed.join(", "));
    Logger.log("cleanOrphanedStateKeys: state saved. You are good to go!");
  } else {
    Logger.log("cleanOrphanedStateKeys: no orphaned keys found — state is already clean.");
  }
}

/** REQUIRED: Run once after pasting this file to authorize Gmail */
function grantEmailPermission() {
  MailApp.sendEmail({
    to:      Session.getActiveUser().getEmail(),
    subject: BANK_NAME + " — Gmail permission granted ✓",
    body:    "Gmail access is now authorized. You can delete this message."
  });
  Logger.log("grantEmailPermission: done — Gmail is now authorized");
}

/** Test: manually trigger Monday allowance */
function runAllowanceNow()     { automatedMondayDeposit(); }

/** Test: manually trigger monthly interest + statements */
function runInterestNow()      { monthlyMaintenance(); }

/** Test: manually trigger daily chore reset */
function runChoreResetNow()    { dailyChoreReset(); }

/** Test: manually trigger Sunday reminder emails */
function runSundayReminderNow(){ sundayChoreReminder(); }

/** Debug: print current state to Execution Log */
function printState() {
  var s = loadState();
  Logger.log("=== FAMILY BANK STATE ===");
  Logger.log("Bank: " + getBankName(s));
  Logger.log("Users: " + JSON.stringify(s.users));
  Logger.log("Roles: " + JSON.stringify(s.roles));
  getChildNames(s).forEach(function(c) {
    var d = s.children[c];
    Logger.log(c + ": CHK=$" + (d.balances.checking||0).toFixed(2)
      + " SAV=$" + (d.balances.savings||0).toFixed(2)
      + " Chores:" + (d.chores||[]).length
      + " Email:" + getEmailFor(s, c));
  });
}

/**
 * DANGER: Wipe everything and reset to defaults.
 * Set CONFIRM = true to actually run this. Cannot be undone.
 */
function DANGER_resetEverything() {
  var CONFIRM = false; // ← change to true to actually run
  if (!CONFIRM) { Logger.log("Set CONFIRM = true to reset. This cannot be undone."); return; }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheets()[0].getRange("A1").setValue("");
  var l = ss.getSheetByName("Ledger");
  if (l) { l.clearContents(); l.appendRow(["Date","User","Child","Note","Amount"]); }
  saveState(buildDefaultState());
  Logger.log("DANGER_resetEverything: complete. All data wiped and reset to defaults.");
}

// ================================================================
// [SHARE CHILD] v35.0 Item 3 — Welcome email to the receiving parent
// when another parent grants them access to a child via Share Child.
// Diffs state.config.parentChildren[receiver] between prior and new.
// Sends one email per child newly added to the receiver's list.
// ================================================================
function processShareChildDiff(priorState, newState) {
  try {
    if (!newState || !newState.config) return;
    var priorPC = (priorState && priorState.config && priorState.config.parentChildren) || {};
    var newPC   = newState.config.parentChildren || {};
    var bankName = getBankName(newState);

    Object.keys(newPC).forEach(function(parentName){
      var was = priorPC[parentName] || [];
      var now = newPC[parentName]   || [];
      var added = now.filter(function(c){ return was.indexOf(c) === -1; });
      if (!added.length) return;

      var parentEmail = getEmailFor(newState, parentName);
      if (!parentEmail) {
        Logger.log("processShareChildDiff: " + parentName + " has no email on file — skipping");
        return;
      }

      added.forEach(function(childName){
        try {
          var html = buildSimpleEmailHtml(newState,
            "👋 You've been added as a co-parent",
            "You've been granted access to manage <strong>" + childName + "</strong> in " + bankName + ".",
            [
              {label: "Child",  val: childName},
              {label: "Access", val: "Full co-parent (approve chores, deposits, adjust balances)"}
            ],
            "Log in to " + bankName + " to start managing this child."
          );
          sendSimpleEmail(parentEmail, bankName + " — " + childName + " was shared with you", html);
          Logger.log("Share Child email → " + parentEmail + " for " + childName);
        } catch(se){ Logger.log("Share Child inner ERROR: " + se); }
      });
    });
  } catch(err) {
    Logger.log("processShareChildDiff ERROR: " + err);
  }
}

// ================================================================
// v35.0 Item 2 — handleWithdrawalEmailAction
// Processes approve/deny links for child withdrawal requests.
// URL format: ?action=withdrawApprove&withdrawalId=wd_123&child=Linnea&token=ABC
// ================================================================
function handleWithdrawalEmailAction(params) {
  var action       = params.action;
  var withdrawalId = params.withdrawalId;
  var child        = params.child;
  var token        = params.token;

  var expectedToken = generateToken(withdrawalId, action);
  if (token !== expectedToken) {
    return buildActionPage("❌ Invalid or Expired Link",
      "This link is no longer valid. Please open the app to manage withdrawals.",
      "#ef4444");
  }

  try {
    var state = loadState();
    var data  = state.children && state.children[child];
    if (!data) return buildActionPage("❌ Error", "Child account not found.", "#ef4444");

    var pending = data.pendingWithdrawals || [];
    var wd = null;
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].id === withdrawalId) { wd = pending[i]; break; }
    }
    if (!wd) return buildActionPage("✅ Already Processed",
      "This withdrawal has already been handled.", "#10b981");

    var ledger = getLedgerSheet();
    var tz     = getTimezone(state);
    var now    = Utilities.formatDate(new Date(), tz, "MMM d, yyyy h:mm a");

    if (action === "withdrawApprove") {
      if (wd.amount > (data.balances.checking || 0)) {
        return buildActionPage("❌ Insufficient Funds",
          child + " only has $" + (data.balances.checking || 0).toFixed(2) + " in checking — can't approve a $" +
          wd.amount.toFixed(2) + " withdrawal. Ask them to reduce the amount.",
          "#ef4444");
      }
      data.balances.checking -= wd.amount;
      ledger.appendRow([now, child, child, "Withdraw: " + (wd.note || ""), -wd.amount]);
      data.pendingWithdrawals = pending.filter(function(p){ return p.id !== withdrawalId; });
      state.children[child] = data;
      saveState(state);

      // Notify child
      var childEmail = getEmailFor(state, child);
      if (childEmail && notifyEmail(state, child)) {
        var html = buildSimpleEmailHtml(state,
          "✅ Withdrawal approved, " + child + "!",
          "Your withdrawal request was approved.",
          [
            {label: "Amount",           val: "$" + wd.amount.toFixed(2)},
            {label: "Note",             val: wd.note || "—"},
            {label: "Checking Balance", val: "$" + data.balances.checking.toFixed(2)}
          ],
          ""
        );
        sendSimpleEmail(childEmail, getBankName(state) + " — Your withdrawal was approved 💸", html);
      }
      return buildActionPage("✅ Withdrawal Approved!",
        "<strong>$" + wd.amount.toFixed(2) + "</strong> withdrawn for " + child + ".<br><br>" +
        "Checking balance: $" + data.balances.checking.toFixed(2),
        "#10b981");

    } else { // withdrawDeny
      data.pendingWithdrawals = pending.filter(function(p){ return p.id !== withdrawalId; });
      state.children[child] = data;
      saveState(state);

      var childEmail = getEmailFor(state, child);
      if (childEmail && notifyEmail(state, child)) {
        var html = buildSimpleEmailHtml(state,
          "Withdrawal update for " + child,
          "Your withdrawal request of $" + wd.amount.toFixed(2) + " was not approved this time. Talk to " + getParentName(state) + " if you have questions.",
          [], ""
        );
        sendSimpleEmail(childEmail, getBankName(state) + " — Withdrawal update", html);
      }
      return buildActionPage("❌ Withdrawal Denied",
        "The withdrawal request of <strong>$" + wd.amount.toFixed(2) + "</strong> for " + child + " has been denied. No money was deducted.",
        "#f59e0b");
    }
  } catch(err) {
    Logger.log("handleWithdrawalEmailAction ERROR: " + err);
    return buildActionPage("❌ Error", "Something went wrong: " + err.toString(), "#ef4444");
  }
}

// v35.0 Item 2 — lookup last "Withdraw:" ledger row for a child (used by approval email)
function getLastWithdrawEntry(childName) {
  try {
    var ledger = getLedgerSheet();
    var rows = ledger.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (rows[i][2] === childName && String(rows[i][3] || "").indexOf("Withdraw:") === 0) {
        return rows[i];
      }
    }
  } catch(e) { Logger.log("getLastWithdrawEntry ERROR: " + e); }
  return null;
}
