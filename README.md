# DropTrends (DropScore)

> Intelligent health ratings, quality metrics, and discoverability for the Drupal ecosystem.

## Vision

Choosing Drupal modules today is plagued by decision paralysis: outdated modules, abandoned issue queues, and multiple competing options for the same feature. **DropTrends** introduces a standardized, objective evaluation standard—the **DropScore** (0–100)—and surfaces it directly inside Drupal.org via a lightweight browser extension and standalone comparison web app.

---

## Architecture Overview

### 1. Phased Architecture Strategy

```
Phase 1: Browser Extension (Zero-Infrastructure MVP)
├── Page Context Detection (drupal.org/project/*)
├── Client-side DOM Data Extraction (instant, 0 API calls required)
├── Optional Enrichment (Packagist / GitLab CI test status)
├── DropScore Algorithm (Local JS execution)
└── Injected UI Overlay (Health Pill + Breakdown Card)

Phase 2: Hybrid Lazy Cache & API (Serverless Backend)
├── Cloudflare Worker / Edge API
├── On-Demand Cache (stores modules as users view them)
└── Module comparison endpoint

Phase 3: Web App & Ecosystem Trends
├── Head-to-Head Comparison (like npm-trends for Drupal)
├── Curated Category Leaderboards
└── Drush / Composer CI integration
```

---

## The DropScore™ Metric Formula (0–100)

DropScore grades modules across 5 objective pillars:

| Pillar | Weight | Key Signals |
| :--- | :--- | :--- |
| **🛡️ Security & Trust** | **25 pts** | Security advisory coverage (shield icon), critical advisory history, maintainer trust |
| **⚡ Maintenance & Velocity** | **25 pts** | Last release date, commit recency, maintenance status, issue queue velocity |
| **🚀 Modernity & Compatibility** | **20 pts** | Drupal 10 & 11 core support, modern PHP 8.2+ compatibility, Recipe readiness |
| **🧪 Code Quality & CI** | **15 pts** | GitLab CI test pass rate, automated test presence (Unit/Kernel/Functional), PHPStan score |
| **📈 Adoption & Community** | **15 pts** | Reported active installations (Drupal.org), Packagist download velocity, contributor count |

---

## Project Structure

```
droptrends/
├── docs/                 # Architecture, scoring algorithm specs, data dictionary
├── extension/            # Chrome & Firefox Browser Extension (Manifest V3)
│   ├── manifest.json
│   ├── src/
│   │   ├── content/      # Injected script on drupal.org
│   │   ├── scoring/      # DropScore formula & evaluation engine
│   │   ├── popup/        # Quick inspect popup
│   │   └── ui/           # Badges, overlays, and modal views
└── README.md
```
