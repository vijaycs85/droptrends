# DropTrends Architecture Specification

## 1. Executive Summary

**DropTrends (DropScore)** is an open ecosystem analytics platform and browser extension for Drupal modules. It provides Drupal site builders, architects, and technical decision-makers with an instant, objective health rating (the **DropScore™**, 0–100) directly on `drupal.org/project/*` pages.

Historically, evaluating Drupal modules requires manually scanning fragmented page elements:
- Security advisory shield coverage
- Maintenance & development status text in the sidebar
- Date of the last stable release and development commit
- Drupal 10/11 version constraints in release notes
- Issue queue activity (open bugs, RTBC count, first response times)
- GitLab CI test pipelines
- Active install statistics

DropTrends automates this evaluation instantaneously directly inside the user's browser, eliminating decision paralysis without adding server infrastructure overhead.

---

## 2. Multi-Phase Architecture Roadmap

```
Phase 1: Browser Extension (Zero-Infrastructure MVP)  <-- CURRENT PHASE
├── Client-side DOM Extraction (instant, 0 ms network latency)
├── Client-side DropScore™ Engine (pure JavaScript)
├── Isolated Shadow DOM UI (Health Pill + Interactive Breakdown Card)
├── Optional Asynchronous Enrichment (GitLab CI badge & Drupal.org API)
└── Extension Popup (Quick Search & Config)

Phase 2: Hybrid Serverless Edge & Cache (Edge API)
├── Cloudflare Worker / Edge Functions
├── On-Demand Metadata Cache (KV / Redis)
├── Ecosystem Aggregation & Historical Tracking
└── Module Comparison API (`/api/v1/compare?modules=token,pathauto`)

Phase 3: DropTrends Web Application & Developer Tooling
├── Head-to-Head Comparison Web App (npm-trends for Drupal)
├── Curated Category Leaderboards (SEO, Media, Commerce, Layout)
├── Composer Plugin / Drush Command (`drush dropscore:audit`)
└── CI/CD Health Check Gate for Enterprise Drupal Sites
```

---

## 3. Phase 1 Architecture (Browser Extension)

### 3.1 Component Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Drupal.org Project Page (DOM)                                    │
│ ┌──────────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│ │ Project Header       │  │ Release Table   │  │ Sidebar Info  │ │
│ └──────────┬───────────┘  └────────┬────────┘  └───────┬───────┘ │
└────────────┼───────────────────────┼───────────────────┼─────────┘
             │                       │                   │
             ▼                       ▼                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ extension/src/content/extractor.js                               │
│ • Zero API calls, pure DOM parsing                               │
│ • Resilient selector fallbacks                                   │
│ • Returns NormalizedModuleData schema                            │
└────────────────────────────────────┬─────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ extension/src/content/enricher.js (Async, Optional)              │
│ • GitLab CI status (pipeline badge fetch with timeout)           │
│ • Fallback to pure DOM if network is offline or throttled        │
└────────────────────────────────────┬─────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ extension/src/scoring/dropscore.js                               │
│ • Evaluates 5 pillars (Security, Maintenance, Modernity,         │
│   Quality, Adoption)                                             │
│ • Applies weighted formula & penalty factors                     │
│ • Calculates 0-100 score, letter grade (A+ to F), and flags      │
└────────────────────────────────────┬─────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ extension/src/ui/card.js (Shadow DOM Injection)                  │
│ • Injects <drop-trends-root> with closed/open Shadow Root        │
│ • Health Pill: Injected in page header beside module title       │
│ • Breakdown Card: Drawer/modal with detailed breakdown          │
│ • Zero CSS conflicts with Drupal's Bluecheese theme              │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Technical Decisions

1. **Client-Side First (Zero Infrastructure)**:
   Extracting signals directly from the DOM allows DropTrends to function with zero external backend servers, zero latency, and zero API rate-limit bottlenecks. Users get instant scores the millisecond the page renders.

2. **Shadow DOM Encapsulation**:
   Drupal.org uses the legacy "Bluecheese" theme with broad CSS resets. By mounting all DropTrends UI elements inside an open Shadow Root (`element.attachShadow({ mode: 'open' })`), styles are 100% isolated. DropTrends styles cannot break Drupal.org, and Drupal.org CSS cannot bleed into DropTrends components.

3. **Resilient Selectors**:
   Drupal.org markup contains both structured classes (e.g. `.view-drupalorg-project-downloads`, `.issue-cockpit-totals`) and loose markup. The extractor uses multi-tiered selectors with regex fallbacks to ensure compatibility across Drupal.org theme updates.

4. **Manifest V3 Best Practices**:
   - Modern service worker architecture (`service-worker.js`).
   - Declarative and strictly scoped `host_permissions` (`*://*.drupal.org/*`, `*://git.drupalcode.org/*`).
   - Pure async/await design with no synchronous blocking.
   - Dynamic tab action badge updates showing the active module's DropScore in the browser toolbar.
