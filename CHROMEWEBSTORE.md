# Chrome Web Store Listing — DropTrends

> Last Updated: 2026-10-14

---

## 1. Store Listing

### Extension Name [REQUIRED]
<!-- Must match manifest.json "name". Max 75 characters. (Current: 47 chars) -->
DropTrends: Drupal Module Health & DropScore

### Short Description [REQUIRED]
<!-- Max 132 characters. Shown in search results and tiles. (Current: 108 chars) -->
Instant DropScore health ratings (0-100), Drupal compatibility checks, and security insights directly on Drupal.org.

### Detailed Description [REQUIRED]
<!-- Max 16,000 characters. Formatted for Chrome Web Store plain text display. -->
Evaluate Drupal modules with confidence. DropTrends brings objective, real-time health ratings—the DropScore (0–100)—directly onto Drupal.org project pages.

Stop guessing whether a contributed module is maintained, secure, or ready for Drupal. DropTrends automatically evaluates every module across five objective pillars:

• Security & Trust (25 pts): View Drupal Security Advisory coverage (shield verification) and maintainer track records at a glance.
• Maintenance & Velocity (25 pts): Track release recency, commit momentum, maintenance status tags, and issue queue activity so you avoid abandoned projects.
• Modernity & Compatibility (20 pts): Instantly identify Drupal 12 and Drupal 11 readiness, Drupal 10 EOL alerts, recipe compatibility, and modern PHP 8.3+ support.
• Code Quality & CI (15 pts): See automated GitLab CI test pipeline status and test suite passing signals directly under each release.
• Adoption & Community (15 pts): Evaluate real-world adoption through active site installs, contributor breadth, and supporting organizations.

KEY FEATURES
• Instant DropScore Pill: Displays the overall score (0–100) and sentiment status (Exceptional, Strong, Moderate, Needs Review, Emerging) directly beside the project title.
• Multi-Release Selector: Easily toggle between releases (e.g., 6.3.x vs 6.2.x, or stable vs next-gen beta) to see compatibility, Composer commands, and health metrics for each branch.
• Slide-Out Detail Drawer: Click any pill to view full pillar point breakdowns, automated risk warnings, and architect recommendations.
• One-Click Composer Command: Copy the exact composer require command for any selected release with a single click.
• Zero Configuration: Works automatically on any canonical Drupal.org project page without setup or accounts.
• Privacy-First: Operates locally on your device with no trackers, no user analytics, and no external data transmission.

HOW TO USE
1. Install DropTrends from the Chrome Web Store.
2. Visit any project page on Drupal.org (for example: drupal.org/project/token or drupal.org/project/webform).
3. Look for the DropScore pill next to the project title for an immediate rating.
4. Click the pill to open the comprehensive breakdown drawer.
5. Click the extension toolbar icon at any time for quick access to your recently inspected module.

PRIVACY & SECURITY
DropTrends respects your privacy. All evaluations are performed locally inside your browser from publicly available Drupal.org page data. We do not collect, store, or sell personal data or browsing history.

SUPPORT & OPEN SOURCE
DropTrends is free, open source, and built for the Drupal community.
GitHub: https://github.com/vijaycs85/droptrends
Issue Tracker: https://github.com/vijaycs85/droptrends/issues

### Category [REQUIRED]
Developer Tools

### Single Purpose [REQUIRED]
Evaluates Drupal project health, Drupal compatibility, and security coverage with an instant 0–100 DropScore rating directly on Drupal.org.

### Primary Language [REQUIRED]
English

---

## 2. Graphics & Assets

| Asset | Dimensions | Format | Status | Filename / Path |
| :--- | :--- | :--- | :--- | :--- |
| Store Icon [REQUIRED] | 128×128 | PNG (24-bit) | ✅ Ready | `extension/icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | 24-bit PNG / JPEG (No Alpha) | ✅ Ready | `screenshots/droptrends-entity-1.png` (or `.jpg`) |
| Screenshot 2 [RECOMMENDED] | 1280×800 | 24-bit PNG / JPEG (No Alpha) | ✅ Ready | `screenshots/droptrends-entity-2.png` (or `.jpg`) |
| Screenshot 3 [RECOMMENDED] | 1280×800 | 24-bit PNG / JPEG (No Alpha) | ✅ Ready | `screenshots/droptrends-webform-1.png` (or `.jpg`) |
| Screenshot 4 [RECOMMENDED] | 1280×800 | 24-bit PNG / JPEG (No Alpha) | ✅ Ready | `screenshots/droptrends-webform-2.png` (or `.jpg`) |
| Screenshot 5 [RECOMMENDED] | 1280×800 | 24-bit PNG / JPEG (No Alpha) | ✅ Ready | `screenshots/droptrends-webform-3.png` (or `.jpg`) |
| Small Promo Tile [OPTIONAL] | 440×280 | PNG | 🟡 Optional | Promotional graphic for Chrome Web Store search card |
| Marquee Promo Tile [OPTIONAL] | 1400×560 | PNG | 🟡 Optional | Hero banner for featured placements |

### Screenshot Breakdown (All compliant with 1280×800, no alpha channel):
- **Screenshot 1 (`droptrends-entity-1`)**: Drupal.org project page overview showing the inline DropScore badge and title header.
- **Screenshot 2 (`droptrends-entity-2`)**: Slide-out detail drawer displaying full 5-pillar health score breakdown and recommendations.
- **Screenshot 3 (`droptrends-webform-1`)**: Webform module overview featuring multi-release badge indicator.
- **Screenshot 4 (`droptrends-webform-2`)**: Full drawer breakdown for high-complexity module with security shield verification and velocity score.
- **Screenshot 5 (`droptrends-webform-3`)**: Releases table highlighting automated GitLab CI test pipeline status badges.

---

## 3. Permissions Justification

<!-- Copy-paste these exact justifications into the Chrome Developer Dashboard form: -->

| Permission / Host | Type | Justification for Chrome Review Team |
| :--- | :--- | :--- |
| `storage` | permissions | Stores user UI preferences locally (such as inline pill display toggles) and caches recently inspected module scores on-device for fast toolbar popup rendering. No personal data is stored. |
| `activeTab` | permissions | Allows the extension toolbar popup to inspect the active tab's URL upon user click to detect whether the user is on a Drupal.org project page and display the matching DropScore card. |
| `*://*.drupal.org/*` | host_permissions | Required to inject the DropScore health badge and read publicly displayed module metadata (releases, maintenance status, issue counts) directly on canonical Drupal.org project pages. |
| `*://git.drupalcode.org/*` | host_permissions | Required to query official public GitLab CI pipeline status endpoints (git.drupalcode.org/api/v4/projects/.../pipelines/latest) to display automated test passing status in the code quality evaluation. |

---

## 4. Privacy & Data Use Disclosure

<!-- These map directly to the Chrome Web Store Developer Dashboard "Privacy" tab: -->

### Data Collection
**Does the extension collect user data?** No

| Data Type | Collected? | Transmitted Off-Device? |
| :--- | :--- | :--- |
| Personally identifiable info | No | No |
| Health info | No | No |
| Financial info | No | No |
| Authentication info | No | No |
| Personal communications | No | No |
| Location | No | No |
| Web history | No | No |
| User activity | No | No |
| Website content | No (Parsed locally in-memory only) | No |

### Data Use Certification
- [x] Data is NOT sold to third parties.
- [x] Data is NOT used for purposes unrelated to the extension's core functionality.
- [x] Data is NOT used for creditworthiness or lending purposes.

---

## 5. Privacy Policy

**Privacy Policy URL [REQUIRED]**:
`https://www.drupaldroptrends.com/privacy`

*(Fallback repo URL: `https://github.com/vijaycs85/droptrends/blob/1.x/PRIVACY.md`)*

---

## 6. Distribution & Developer Info

- **Store Listing URL**: `https://chromewebstore.google.com/detail/mbgbbpappbamimibipcbehnjchpplcip`
- **Visibility**: Public
- **Regions**: All regions
- **Publisher Name**: DropTrends Team
- **Support URL**: `https://github.com/vijaycs85/droptrends/issues`
- **Homepage URL**: `https://www.drupaldroptrends.com`

---

## 7. Version History

### Version 1.1.0 (2026-10-14)
- Redesigned visual identity: official Drupal drop geometry with score spectrum bars and updated icons.
- Lighthouse-inspired scorecard UI: interactive circular hero score gauge, category meters with grade chips, and auto-scrolling insights.
- Calibrated DropScore algorithm:
  - Enhanced issue queue scoring with bonuses for Inbox Zero and pristine zero-bug queues.
  - Recalibrated release velocity ladders (widened 90-day grace window) and adoption point ladders.
  - Strict disqualification (score 0) and warning disclaimers for obsolete, unsupported, and revoked projects.
  - Forward-compatibility engine: Drupal 12 readiness support, dynamic core schedules, PHP 8.5+ baseline, and Drupal 10 EOL alerts.
- High-density slide drawer UX with ultra-compact 24px micro-bar footer and direct GitLab repository navigation.
- Toolbar popup enhancements: circular gauge dial and grade chip lockup matching the on-page drawer.
- Firefox Manifest V3 cross-browser packaging support.

### Version 1.0.0 (2026-10-13)
- Initial Chrome Web Store release.
- Client-side DOM parsing on canonical `drupal.org/project/*` pages.
- 5-Pillar DropScore algorithm (0–100) with calibrated sentiment labels (Exceptional, Strong, Moderate, Needs Review, Emerging).
- Multi-release comparison: switch between stable and development/pre-releases with dynamic Composer commands.
- Security advisory policy verification with shield badge detection.
- Real-time GitLab CI pipeline status detection via on-page DOM and GitLab API.
- Isolated Shadow DOM UI overlay: Health Pill & Interactive Breakdown Drawer.
- Fast toolbar popup for quick access to inspected modules.
