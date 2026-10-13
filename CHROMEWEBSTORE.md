# Chrome Web Store Listing: DropTrends (DropScore for Drupal)

Last Updated: 2026-10-13

---

## 1. Store Listing Metadata

### Extension Name
**DropTrends: Drupal Module Health & DropScore**

### Short Description (max 132 characters)
Instant DropScore health ratings (0-100), Drupal 11 compatibility checks, and security insights directly on Drupal.org project pages.

### Category
**Developer Tools**

### Primary Language
**English**

### Detailed Description

Evaluate Drupal modules with confidence. **DropTrends** brings objective, instant health ratings—the **DropScore™** (0–100)—directly inside Drupal.org module pages.

Say goodbye to decision paralysis and manually scanning through release tables, issue queues, security advisory shields, and compatibility notes. DropTrends automatically evaluates every module across five objective pillars:

🛡️ **Security & Trust (25 pts)**
Instantly view Drupal Security Advisory policy coverage (shield status) and maintainer track records.

⚡ **Maintenance & Velocity (25 pts)**
Track commit and release recency, maintenance status tags, and issue queue velocity so you avoid abandoned modules.

🚀 **Modernity & Compatibility (20 pts)**
Identify Drupal 11 and Drupal 10 readiness at a glance, plus modern PHP 8.2+ compatibility.

🧪 **Code Quality & CI (15 pts)**
See automated GitLab CI test pipeline status and test suite coverage before installing.

📈 **Adoption & Community (15 pts)**
Evaluate real-world adoption through reported active installation numbers, contributor breadth, and sponsoring organizations.

### Key Features:
- **Instant Health Pill**: Displays the overall score and letter grade (A+ through F) beside the module title.
- **Interactive Breakdown Drawer**: Click the badge to reveal in-depth pillar breakdowns, strengths, and risk warnings.
- **One-Click Composer Command**: Copy `composer require drupal/<module>` directly from the drawer.
- **Zero Configuration & Zero Lag**: Runs client-side for immediate results without waiting on backend servers.
- **Privacy First**: Does not track browsing habits or collect any personal data.

---

## 2. Permissions Justification

| Permission / Host Permission | Why It Is Needed |
| :--- | :--- |
| `storage` | Saves user preferences locally, including preferred badge position and UI display mode. No personal data is stored. |
| `activeTab` | Enables the toolbar popup to read the current tab URL to detect if the user is viewing a Drupal.org project page. |
| `https://*.drupal.org/*` | Necessary to inject the DropScore health pill and read publicly displayed module metadata on Drupal.org project pages (`drupal.org/project/*`). |
| `https://git.drupalcode.org/*` | Used solely to fetch publicly displayed GitLab CI pipeline status badges for Drupal modules to calculate automated test passing rates. |

---

## 3. Privacy & Data Use Disclosures

### Single Purpose Description
DropTrends displays objective module health scores and compatibility information on Drupal.org project pages to help developers choose maintained and secure modules.

### Data Collection & Usage Disclosures
- **Personally Identifiable Information**: DropTrends does NOT collect names, emails, credentials, or user identifiers.
- **User Activity & History**: DropTrends does NOT track user browsing history, search terms, or IP addresses.
- **Third-Party Data Sharing**: No data is sold, monetized, or shared with third parties.
- **Website Content**: Only publicly available open-source module metadata visible on Drupal.org project pages is parsed locally on the client.

---

## 4. Assets & Store Requirements

- [x] Extension Icons: `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`
- [ ] Store Promo Marquee (440×280 px)
- [ ] Store Screenshots (1280×800 px)
- [x] Privacy Policy Document

---

## 5. Version History

### Version 1.0.0 (2026-10-13)
- Initial release.
- Client-side DOM parsing on `drupal.org/project/*` pages.
- 5-Pillar DropScore algorithm (0–100) with letter grades (A+ to F).
- Isolated Shadow DOM UI overlay: Health Pill & Interactive Breakdown Drawer.
- GitLab CI pipeline status detection.
- Quick toolbar popup with module search and settings.
