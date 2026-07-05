// ===== THE LIBERTY MODEL — RULES ENGINE =====
// Deterministic entitlement checker. No ML, no learned weights.
// Statutory text verified against the official BNSS Gazette publication (MHA, 2024).

const MAX_SENTENCE_YEARS = {
  "Minor (Theft, Fraud)": 3,
  "Moderate (Assault, Extortion)": 7,
  "Severe (Murder, NDPS)": 14
};

function daysToYears(days) { return days / 365; }

// Returns an array of triggered rule objects for a single case
function checkEntitlements(c) {
  const flags = [];
  const maxYears = MAX_SENTENCE_YEARS[c.offence] || 7;
  const maxDays = maxYears * 365;
  const proportionServed = c.custodyDays / maxDays;

  // The applicable BNSS s.479 threshold for THIS person:
  // first-time offender => 1/3 of max sentence; otherwise => 1/2
  const threshold = c.priorRecord ? 0.5 : (1/3);
  const thresholdDays = Math.round(maxDays * threshold);

  // Priority % — how far through the applicable statutory threshold this person is.
  // 100% = threshold reached (entitlement crystallised). >100% = over-detained past it.
  c.priorityPct = Math.round((c.custodyDays / thresholdDays) * 100);
  c.thresholdDays = thresholdDays;

  // Rule 1 — BNSS s.479(1): half-custody rule (non-first-offenders)
  if (c.priorRecord && proportionServed >= 0.5) {
    flags.push({
      id: "BNSS-479-HALF",
      citation: "BNSS s.479(1)",
      label: "Served ≥50% of maximum sentence — release on bail is mandated",
      detail: `${c.custodyDays} days served vs. ${thresholdDays}-day threshold. The section reads "he shall be released by the Court on bail" — mandatory language, subject to the second proviso (court may extend with written reasons).`
    });
  }

  // Rule 2 — BNSS s.479(1) first proviso: one-third rule (first-time offenders → bond)
  if (!c.priorRecord && proportionServed >= (1/3)) {
    flags.push({
      id: "BNSS-479-THIRD",
      citation: "BNSS s.479(1), first proviso",
      label: "First-time offender served ≥⅓ of maximum sentence — release on bond",
      detail: `${c.custodyDays} days served vs. ${thresholdDays}-day threshold. First-time offenders (never convicted) "shall be released on bond" — a lower bar and a lighter condition than bail.`
    });
  }

  // Rule 2b — BNSS s.479(3): Jail Superintendent's duty crystallised
  if (proportionServed >= threshold) {
    flags.push({
      id: "BNSS-479-3",
      citation: "BNSS s.479(3)",
      label: "Jail Superintendent's duty to apply to the Court has crystallised",
      detail: "On completion of the one-half or one-third period, the Superintendent of jail \"shall forthwith make an application in writing to the Court\" for release. If this case is still pending, that statutory duty has not been discharged."
    });
  }

  // Rule 3 — Satender Kumar Antil: presumptive bail categories (non-severe offences)
  if (c.offence !== "Severe (Murder, NDPS)" && c.custodyDays > 90) {
    flags.push({
      id: "ANTIL-CATEGORY",
      citation: "Satender Kumar Antil v CBI (2022)",
      label: "Presumptive-bail category, custody exceeds 90 days",
      detail: "Offence falls within a category where bail is the norm; prolonged custody without progress weighs toward release."
    });
  }

  // Rule 4 — Hussainara Khatoon: disproportionate custody vs. likely sentence
  if (proportionServed >= 0.6) {
    flags.push({
      id: "HUSSAINARA",
      citation: "Hussainara Khatoon v State of Bihar (1979)",
      label: "Custody disproportionate to likely sentence on conviction",
      detail: "Time already served approaches or exceeds what a conviction would likely carry — an Article 21 speedy-trial concern."
    });
  }

  // Rule 5 — Age/vulnerability ground
  if (c.age >= 60) {
    flags.push({
      id: "AGE-GROUND",
      citation: "Judicial guidance — age & vulnerability",
      label: "Accused aged 60 or above",
      detail: `Age ${c.age} — humanitarian ground for expedited review, not an automatic entitlement.`
    });
  }

  // Rule 6 — Co-accused parity
  if (c.coAccusedBail) {
    flags.push({
      id: "PARITY",
      citation: "Parity principle (settled practice)",
      label: "Co-accused in the same case already granted bail",
      detail: "Similarly situated co-accused already released — parity is a recognised ground for review."
    });
  }

  return flags;
}

// Tiering: how many independent legal grounds apply
function tierFor(flags) {
  if (flags.length >= 2) return { tier: "flagged", label: "Flagged — Priority Review" };
  if (flags.length === 1) return { tier: "review", label: "Review Recommended" };
  return { tier: "clear", label: "No Current Entitlement Detected" };
}

// Process a full case list — sorted by priority % (most over-threshold first)
function processCases(cases) {
  const processed = cases.map(c => {
    const flags = checkEntitlements(c);
    const { tier, label } = tierFor(flags);
    return { ...c, flags, tier, tierLabel: label };
  });
  processed.sort((a, b) => b.priorityPct - a.priorityPct);
  return processed;
}

// ===== NOTIFICATION / ESCALATION ENGINE =====
// Operationalises BNSS s.479(3): the Superintendent's duty to apply "forthwith"
// requires knowing, case by case, when the threshold is crossed. These are the
// messages a production system would dispatch (simulated here — nothing is sent).

function notificationsFor(c) {
  const msgs = [];
  const daysOver = c.custodyDays - c.thresholdDays;
  const provision = c.priorRecord ? "BNSS s.479(1) — half-sentence rule" : "BNSS s.479(1) proviso — one-third rule (first-time offender)";
  const releaseType = c.priorRecord ? "bail" : "bond";

  // Stage 0 — approaching threshold (within ~30 days of crossing)
  if (c.priorityPct >= 90 && c.priorityPct < 100) {
    const daysLeft = c.thresholdDays - c.custodyDays;
    msgs.push({
      stage: 0, stageLabel: "Advance Alert",
      to: "Superintendent of Jail",
      channel: "WhatsApp / SMS",
      text: `ADVANCE ALERT — Case ${c.id}: undertrial will complete the statutory custody threshold (${c.thresholdDays} days, ${provision}) in ${daysLeft} days. Prepare the s.479(3) application for release on ${releaseType}.`
    });
  }

  // Stage 1 — threshold crossed (day 0–7)
  if (daysOver >= 0 && daysOver <= 7) {
    msgs.push({
      stage: 1, stageLabel: "Duty Crystallised",
      to: "Superintendent of Jail + District Legal Services Authority",
      channel: "WhatsApp / SMS",
      text: `STATUTORY DUTY ACTIVE — Case ${c.id}: undertrial has completed ${c.custodyDays} of ${c.thresholdDays} threshold days (${provision}). Under BNSS s.479(3), the Superintendent shall forthwith make a written application to the Court for release on ${releaseType}.`
    });
  }

  // Stage 2 — 8–30 days past threshold, still detained
  if (daysOver > 7 && daysOver <= 30) {
    msgs.push({
      stage: 2, stageLabel: "Escalation",
      to: "DLSA Secretary (cc: Superintendent of Jail)",
      channel: "WhatsApp + Email",
      text: `ESCALATION — Case ${c.id}: ${daysOver} days have passed since the s.479 threshold was crossed (${c.custodyDays} days served vs ${c.thresholdDays} threshold). No release recorded. Legal aid intervention recommended; grounds on file: ${c.flags.length}.`
    });
  }

  // Stage 3 — 30+ days past threshold: UTRC digest entry
  if (daysOver > 30) {
    msgs.push({
      stage: 3, stageLabel: "UTRC Digest",
      to: "UTRC Chairperson (District Judge)",
      channel: "Monthly digest (Email + printed annexure)",
      text: `UTRC DIGEST ENTRY — Case ${c.id}: undertrial detained ${daysOver} days beyond the applicable s.479 threshold (served ${c.custodyDays}; threshold ${c.thresholdDays}; ${provision}). Independent legal grounds on file: ${c.flags.length}. Flagged for priority listing at the next committee sitting.`
    });
  }

  return msgs;
}

function buildNotificationQueue(processedCases) {
  const queue = [];
  processedCases.forEach(c => {
    notificationsFor(c).forEach(m => queue.push({ ...m, caseId: c.id, priorityPct: c.priorityPct, daysOver: c.custodyDays - c.thresholdDays }));
  });
  queue.sort((a, b) => b.stage - a.stage || b.daysOver - a.daysOver);
  return queue;
}
