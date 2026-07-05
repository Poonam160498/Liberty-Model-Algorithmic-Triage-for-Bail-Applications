// ===== THE LIBERTY MODEL — RULES ENGINE =====
// Deterministic entitlement checker. No ML, no learned weights.
// Each rule maps directly to a statute or precedent (see methodology.html).

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
  const servedYears = daysToYears(c.custodyDays);
  const proportionServed = servedYears / maxYears;

  // Rule 1 — BNSS s.479(1): half-custody rule (non-first-offenders)
  if (c.priorRecord && proportionServed >= 0.5) {
    flags.push({
      id: "BNSS-479-HALF",
      citation: "BNSS s.479(1)",
      label: "Served ≥50% of maximum sentence in custody",
      detail: `${c.custodyDays} days served vs. ~${Math.round(maxYears * 365 * 0.5)} day threshold for this offence class.`
    });
  }

  // Rule 2 — BNSS s.479(1) proviso: one-third rule (first-time offenders)
  if (!c.priorRecord && proportionServed >= 0.33) {
    flags.push({
      id: "BNSS-479-THIRD",
      citation: "BNSS s.479(1), proviso",
      label: "First-time offender served ≥33% of maximum sentence",
      detail: `${c.custodyDays} days served vs. ~${Math.round(maxYears * 365 * 0.33)} day threshold (lower bar — no prior record).`
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
      detail: "Time already served approaches or exceeds what a conviction would likely carry."
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

// Process a full case list
function processCases(cases) {
  return cases.map(c => {
    const flags = checkEntitlements(c);
    const { tier, label } = tierFor(flags);
    return { ...c, flags, tier, tierLabel: label };
  });
}
