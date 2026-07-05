# The Liberty Model

**Rules-as-code triage for undertrial entitlement — not a risk predictor.**

Roughly three in four prisoners in India are undertrials. Many already qualify for release
under existing law but are lost in a system where prison and court data are never joined up.
The Liberty Model does not predict who deserves liberty. It checks, deterministically, who the
law has already granted it to — and cites exactly where.

🔗 **Live demo:https://poonam160498.github.io/Liberty-Model-Algorithmic-Triage-for-Bail-Applications/

## Why rules, not machine learning

Predictive bail models estimate reoffending or flight risk from historical data — bias in, bias
out, and opaque at the point where it matters most. This project takes a different, narrower
approach: every check answers a factual, verifiable question ("has this person served the
custody threshold the law itself set?"), not a predictive one. See `methodology.html` for the
full rulebook and citations (BNSS s.479, *Satender Kumar Antil v CBI*, *Hussainara Khatoon v
State of Bihar*, and others).

## What's real and what's synthetic (read this first)

- **Dashboard case data**: 120 synthetic cases, generated to resemble realistic patterns. No
  real individual's data is shown.
- **Homepage statistics**: real aggregate figures from NCRB Prison Statistics / NJDG, used for
  context only — not linked to any case in the dashboard.
- **Data extraction pipeline** (`/pipeline` scripts, not connected to the live site): a proof of
  concept for pulling anonymised case metadata from public eCourts/NJDG pages, built to test
  feasibility for a future, properly-reviewed real-data version.

Full caveats and what would need to happen before any real-world use are on `about.html`.

## Tech

Static HTML/CSS/JS. `js/engine.js` is a deterministic rules engine — no ML, no learned weights.
`cases.json` holds the synthetic case set consumed by the dashboard.

## Author

Poonam Nauroji — LLM (Criminal Law) · MSc Business Analytics, University of Exeter.
Part of a research thread that also includes an [analysis of UK asylum appeal
outcomes](#) and an LLM dissertation on unequal application of criminal law in India.

## Disclaimer

This is a research and portfolio project, not a legal service. Nothing here constitutes legal
advice or an automated legal decision.
