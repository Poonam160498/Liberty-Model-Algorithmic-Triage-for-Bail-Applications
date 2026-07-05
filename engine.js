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
