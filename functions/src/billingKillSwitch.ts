/**
 * Billing kill switch — surfSUP cost protection.
 *
 * Triggered by a Pub/Sub message from a Cloud Billing budget alert.
 * If the project's current spend has reached or exceeded the budget
 * amount, this detaches the project's billing account, which stops
 * all billable usage (Firestore, Storage, Functions, everything).
 *
 * This is a LAST-RESORT circuit breaker, not a routine cost control —
 * it will break the live app for all users until billing is manually
 * re-attached in the Cloud Console. That trade (app goes down vs.
 * an unbounded bill) is intentional for a no-budget solo project.
 *
 * Setup required (one-time, manual, in Google Cloud Console — cannot
 * be done from code):
 *   1. Create a Pub/Sub topic, e.g. "billing-killswitch"
 *      (Pub/Sub → Topics → Create Topic)
 *   2. Connect that topic to your budget
 *      (Billing → Budgets & alerts → [your budget] → Manage notifications
 *       → Connect a Pub/Sub topic to this budget)
 *   3. Grant the function's runtime service account the
 *      "Billing Account Administrator" role ON THE BILLING ACCOUNT
 *      (Billing → Account Management → Permissions → Add Principal).
 *      Without this, disableBilling() will throw a permission error
 *      and NOT silently fail to protect you — check function logs.
 *   4. Deploy: firebase deploy --only functions:billingKillSwitch
 *
 * To test safely without actually cutting billing, see SIMULATE below.
 */

import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { CloudBillingClient } from "@google-cloud/billing";

// Flip to false only after you've verified logs look correct on a
// real (or manually-published test) budget message. While true, the
// function logs what it WOULD do but never actually touches billing.
const SIMULATE = false;

// One-time permission verification: when true, a budget-exceeded message
// triggers a READ-ONLY check (getProjectBillingInfo) to confirm the
// service account's IAM role actually works, WITHOUT ever calling the
// destructive updateProjectBillingInfo. Safe to leave on during setup;
// turn off (set to false) once verified — it has no effect when
// SIMULATE is false, since the real disableBilling() path takes over.
const VERIFY_PERMISSIONS_ONLY = true;

const billing = new CloudBillingClient();

interface BudgetNotification {
  budgetDisplayName?: string;
  costAmount?: number;
  budgetAmount?: number;
  currencyCode?: string;
}

export const billingKillSwitch = onMessagePublished(
  { topic: "billing-killswitch", region: "us-central1" },
  async (event) => {
    const raw = event.data.message.data; // base64-encoded JSON, per Cloud Billing docs
    if (!raw) {
      logger.warn("[billingKillSwitch] Received message with no data payload.");
      return;
    }

    let payload: BudgetNotification;
    try {
      payload = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    } catch (err) {
      logger.error("[billingKillSwitch] Failed to parse Pub/Sub payload:", err);
      return;
    }

    const { budgetDisplayName, costAmount, budgetAmount, currencyCode } = payload;

    if (costAmount == null || budgetAmount == null) {
      logger.warn("[billingKillSwitch] Payload missing costAmount/budgetAmount.", payload);
      return;
    }

    logger.info(
      `[billingKillSwitch] Budget "${budgetDisplayName}": ` +
      `spent ${costAmount} ${currencyCode ?? ""} of ${budgetAmount} ${currencyCode ?? ""}`
    );

    if (costAmount < budgetAmount) {
      logger.info("[billingKillSwitch] Under budget — no action.");
      return;
    }

    logger.warn(
      `[billingKillSwitch] BUDGET EXCEEDED (${costAmount} >= ${budgetAmount}). ` +
      (SIMULATE ? "SIMULATE=true — would disable billing now, but not actually doing it." : "Disabling billing now.")
    );

    if (SIMULATE) {
      if (VERIFY_PERMISSIONS_ONLY) {
        await verifyBillingPermission();
      }
      return;
    }

    await disableBilling();
  }
);

async function verifyBillingPermission(): Promise<void> {
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    logger.error("[billingKillSwitch] GCLOUD_PROJECT env var not set — cannot run permission check.");
    return;
  }
  const projectName = `projects/${projectId}`;

  try {
    const [billingInfo] = await billing.getProjectBillingInfo({ name: projectName });
    logger.info(
      `[billingKillSwitch] PERMISSION CHECK PASSED — read billing info OK. ` +
      `billingEnabled=${billingInfo.billingEnabled}, billingAccountName=${billingInfo.billingAccountName}. ` +
      `This confirms the service account's IAM role works. No changes were made.`
    );
  } catch (err) {
    logger.error(
      "[billingKillSwitch] PERMISSION CHECK FAILED — the service account cannot read billing info. " +
      "This means disableBilling() would ALSO fail if it ever needed to run. Check the IAM grant on the billing account.",
      err
    );
  }
}

async function disableBilling(): Promise<void> {
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    logger.error("[billingKillSwitch] GCLOUD_PROJECT env var not set — cannot identify project.");
    return;
  }
  const projectName = `projects/${projectId}`;

  try {
    const [billingInfo] = await billing.getProjectBillingInfo({ name: projectName });

    if (!billingInfo.billingEnabled) {
      logger.info("[billingKillSwitch] Billing already disabled — nothing to do.");
      return;
    }

    await billing.updateProjectBillingInfo({
      name: projectName,
      projectBillingInfo: { billingAccountName: "" }, // detaching = disabling billing
    });

    logger.warn(`[billingKillSwitch] Billing DISABLED for ${projectName}.`);
  } catch (err) {
    // If this throws, it's almost always a missing IAM role on the
    // function's service account (see setup step 3 above). Logging
    // loudly here matters — a silent failure here means the kill
    // switch did nothing and you're still exposed.
    logger.error("[billingKillSwitch] FAILED to disable billing:", err);
    throw err;
  }
}