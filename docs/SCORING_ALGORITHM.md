# DropScore Algorithm Specification (v1.0)

## 1. Overview & Objective

The **DropScore** is an objective, normalized metric on a scale from **0 to 100** designed to quantify the health, reliability, security posture, and ecosystem readiness of any Drupal contributed project.

It synthesizes multiple disparate signals into 5 weighted pillars:

```
┌───────────────────────────────────────────────────────────┐
│                     DropScore (0 - 100)                  │
├───────────────────────────────┬───────────────────────────┤
│ Pillar                        │ Maximum Points            │
├───────────────────────────────┼───────────────────────────┤
│ 🛡️ Security & Trust           │ 25 points                 │
│ ⚡ Maintenance & Velocity      │ 25 points                 │
│ 🚀 Modernity & Compatibility  │ 20 points                 │
│ 🧪 Code Quality & CI          │ 15 points                 │
│ 📈 Adoption & Community       │ 15 points                 │
└───────────────────────────────┴───────────────────────────┘
```

---

## 2. Pillar Breakdown & Scoring Logic

### Pillar 1: 🛡️ Security & Trust (Max 25 pts)

Security is paramount in enterprise Drupal. This pillar assesses whether the project is covered by the Drupal Security Advisory team and maintainer trust.

| Signal | Criteria | Points |
| :--- | :--- | :--- |
| **Security Advisory Coverage** | Covered by Drupal Security Team (Shield icon present) | **+16 pts** |
| | Not covered / unsupported for security advisories | 0 pts |
| **Maintainer Trust & Track Record** | 2 or more registered maintainers | **+5 pts** |
| | Exactly 1 maintainer | +2 pts |
| | 0 maintainers / unassigned | 0 pts |
| **Supporting Organizations** | Has verified supporting organization sponsors | **+4 pts** |
| | No sponsor organizations listed | 0 pts |

*Critical Security Penalty*: If a project is explicitly marked as having an unresolved critical advisory or abandoned security status, a flat penalty of `-25 pts` is deducted from the overall score.

---

### Pillar 2: ⚡ Maintenance & Velocity (Max 25 pts)

Evaluates whether the codebase is actively nurtured or drifting toward obsolescence.

#### 2.1 Maintenance & Development Status (10 pts)
Extracted from Drupal.org sidebar project metadata:
- **Actively maintained**: 10 pts
- **Minimally maintained**: 6 pts
- **Seeking co-maintainer(s)**: 5 pts
- **Seeking new maintainer**: 2 pts
- **Unsupported / Obsolete**: 0 pts (triggers additional deprecation penalty)

#### 2.2 Release Recency (8 pts)
Based on elapsed days since the latest stable release or development snapshot:
- **< 30 days**: 8 pts
- **30 – 90 days**: 7 pts
- **91 – 180 days**: 5 pts
- **181 – 365 days (1 year)**: 3 pts
- **1 – 2 years**: 1 pt
- **> 2 years**: 0 pts

#### 2.3 Issue Queue Velocity & Health (7 pts)
Calculated from active issue ratios and review momentum:
- **Reviewed & Tested By Community (RTBC)**:
  - $\ge 5$ RTBC issues: 3 pts (high community engagement)
  - $1 - 4$ RTBC issues: 2 pts
  - 0 RTBC issues: 1 pt
- **Bug Backlog Ratio** (open bugs / total issues):
  - Bug ratio $\le 25\%$: 4 pts
  - Bug ratio $26\% - 50\%$: 3 pts
  - Bug ratio $51\% - 75\%$: 2 pts
  - Bug ratio $> 75\%$: 1 pt

---

### Pillar 3: 🚀 Modernity & Compatibility (Max 20 pts)

Assesses compatibility with current and future Drupal core versions.

| Signal | Criteria | Points |
| :--- | :--- | :--- |
| **Drupal 11 Compatibility** | Explicitly declares Drupal `^11` support in releases or composer | **+10 pts** |
| | No Drupal 11 release yet | 0 pts |
| **Drupal 10 Compatibility** | Supports Drupal `^10` | **+6 pts** |
| | Only supports Drupal 9 or legacy D8/D7 | 0 pts |
| **PHP & Modern Standards** | Modern PHP 8.2+ compatibility mentioned or OOP architecture | **+2 pts** |
| **Recipe / Modern Architecture** | Drupal Recipes compatibility or modern plugin architecture | **+2 pts** |

---

### Pillar 4: 🧪 Code Quality & CI (Max 15 pts)

Measures automated validation and continuous integration posture.

| Signal | Criteria | Points |
| :--- | :--- | :--- |
| **GitLab CI Pipeline Status** | GitLab CI status is `passed` | **+10 pts** |
| | GitLab CI status is `running` / `manual` | +5 pts |
| | GitLab CI status is `unknown` (no pipeline data) | +4 pts |
| | GitLab CI status is `failed` | 0 pts |
| **Automated Testing Footprint** | Automated tests detected (Unit/Kernel/Functional or PHPStan) | **+5 pts** |
| | Minimal or unverified test coverage | +2 pts |

---

### Pillar 5: 📈 Adoption & Community (Max 15 pts)

Quantifies real-world ecosystem validation based on reported installations.

#### 5.1 Active Site Installs (10 pts)
Extracted from `X sites report using this module`:
- **> 100,000 installs**: 10 pts (Ubiquitous core ecosystem module)
- **20,000 – 99,999 installs**: 8 pts (Very popular)
- **5,000 – 19,999 installs**: 6 pts (Popular)
- **1,000 – 4,999 installs**: 4 pts (Moderate adoption)
- **200 – 999 installs**: 2 pts (Niche / Emerging)
- **< 200 installs**: 1 pt (Early stage)

#### 5.2 Contributor Breadth (5 pts)
- **$\ge 5$ maintainers / committers**: 5 pts
- **3 – 4 maintainers**: 4 pts
- **2 maintainers**: 3 pts
- **1 maintainer**: 1 pt

---

## 3. Letter Grade Thresholds

The numerical DropScore maps to standardized letter grades and semantic sentiment:

| Range | Grade | Label | Semantic Color | Description |
| :--- | :--- | :--- | :--- | :--- |
| **90 – 100** | **A+** | Exceptional | `#10b981` (Emerald) | Top-tier module. Exemplary security, continuous releases, and active community. |
| **80 – 89** | **A** | Healthy | `#059669` (Green) | Solid, reliable module with modern Drupal compatibility. |
| **70 – 79** | **B** | Good | `#0d9488` (Teal) | Good module, minor maintenance backlog or slower release cadence. |
| **55 – 69** | **C** | Fair | `#d97706` (Amber) | Proceed with awareness. May lack D11 support or have stagnant issues. |
| **40 – 54** | **D** | Warning | `#ea580c` (Orange) | High risk. Missing security coverage or long release inactivity. |
| **0 – 39** | **F** | Critical | `#dc2626` (Red) | Deprecated, obsolete, unsupported, or incompatible with modern Drupal. |

---

## 4. Automatic Flags & Recommendations

The algorithm automatically generates contextual insight tags:

### Positive Flags (Badges):
- `🛡️ Security Covered`: Covered by the Drupal Security Advisory policy.
- `🚀 D11 Ready`: Confirmed Drupal 11 compatibility.
- `⚡ Rapid Releases`: Stable or dev release within the last 30 days.
- `📈 High Adoption`: Over 20k active installations.
- `🧪 CI Green`: GitLab CI automated pipeline is passing.

### Warning Flags (Alerts):
- `⚠️ No Security Coverage`: Not covered by Drupal security team (site builders must review manually).
- `⚠️ Lacks Drupal 11 Support`: No D11-compatible release detected.
- `⚠️ Stale Releases`: Last release was over 1 year ago.
- `⚠️ Single Maintainer`: Bus factor risk (only 1 committer).
- `🚫 Unsupported / Deprecated`: Project is marked obsolete or unsupported.
