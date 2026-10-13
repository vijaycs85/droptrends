# DropTrends Data Dictionary

This document defines the schema contracts for extracted module signals, enriched telemetry, and evaluated DropScore metrics.

---

## 1. `RawModuleData` (Extracted from DOM)

Schema extracted by `extension/src/content/extractor.js`:

```typescript
interface RawModuleData {
  // Module identification
  machineName: string;          // e.g. "token", "pathauto"
  title: string;                // e.g. "Token"
  url: string;                  // Canonical project URL
  categories: string[];         // e.g. ["Automation", "Developer tools"]

  // Security signals
  isSecurityCovered: boolean;   // True if shield icon/policy coverage text present
  securityPolicyText?: string;  // Text from security section

  // Usage & Installation
  activeInstalls: number;       // Reported number of sites using this module

  // Release & Temporal signals
  lastReleaseDate: string | null;      // ISO string or parsed date
  lastReleaseDaysAgo: number | null;   // Elapsed days since last release
  latestVersion: string | null;        // e.g. "8.x-1.17"
  composerCommand: string | null;      // e.g. "composer require 'drupal/token:^1.17'"

  // Core & Runtime Compatibility
  compatibilityStrings: string[];      // e.g. ["Works with Drupal: ^10.3 || ^11"]
  supportsDrupal11: boolean;           // True if ^11, ~11, or 11.x is found
  supportsDrupal10: boolean;           // True if ^10, ~10, or 10.x is found
  modernPhpSupported: boolean;         // True if PHP 8.2+ mentioned

  // Maintenance Status
  maintenanceStatus: string | null;    // e.g. "Actively maintained", "Minimally maintained"
  developmentStatus: string | null;    // e.g. "Under active development", "Obsolete"

  // Maintainer & Community
  maintainersCount: number;            // Number of registered maintainers
  maintainerNames: string[];           // List of maintainer usernames
  sponsorsCount: number;               // Number of supporting organizations listed
  sponsorNames: string[];              // List of sponsor names

  // Issue Queue Metrics
  openIssuesCount: number | null;      // e.g. 461
  rtbcCount: number | null;            // e.g. 11
  totalIssuesCount: number | null;     // e.g. 1896
  openBugsCount: number | null;        // e.g. 185

  // Repository & GitLab
  gitlabRepoUrl: string | null;        // e.g. "https://git.drupalcode.org/project/token"
  defaultBranch: string | null;        // e.g. "8.x-1.x"
}
```

---

## 2. `EnrichedModuleData` (Async Telemetry)

Schema added by `extension/src/content/enricher.js`:

```typescript
interface EnrichedModuleData extends RawModuleData {
  // GitLab CI status
  gitlabPipelineStatus: 'passed' | 'failed' | 'running' | 'manual' | 'unknown';
  hasAutomatedTests: boolean;
  
  // Drupal.org Node API metadata (if fetched)
  d7UsageByBranch?: Record<string, number>;
  d7CreatedTimestamp?: number;
  d7ChangedTimestamp?: number;
}
```

---

## 3. `DropScoreEvaluation` (Output of Scoring Engine)

Schema produced by `extension/src/scoring/dropscore.js`:

```typescript
interface DropScoreEvaluation {
  // Overall metrics
  score: number;               // 0 to 100 integer
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  gradeLabel: string;          // e.g. "Exceptional", "Healthy", "Warning"
  gradeColor: string;          // Hex color e.g. "#10b981"

  // 5 Pillar breakdown
  pillars: {
    security: {
      score: number;           // Max 25
      max: 25;
      label: "Security & Trust";
      breakdown: {
        coverage: number;      // 0 or 16
        maintainers: number;   // 0 to 5
        sponsors: number;      // 0 to 4
      };
    };
    maintenance: {
      score: number;           // Max 25
      max: 25;
      label: "Maintenance & Velocity";
      breakdown: {
        status: number;        // 0 to 10
        recency: number;       // 0 to 8
        issues: number;        // 0 to 7
      };
    };
    modernity: {
      score: number;           // Max 20
      max: 20;
      label: "Modernity & Compatibility";
      breakdown: {
        drupal11: number;      // 0 or 10
        drupal10: number;      // 0 or 6
        modernPhp: number;     // 0 or 2
        recipes: number;       // 0 or 2
      };
    };
    quality: {
      score: number;           // Max 15
      max: 15;
      label: "Code Quality & CI";
      breakdown: {
        pipeline: number;      // 0 to 10
        tests: number;         // 0 to 5
      };
    };
    adoption: {
      score: number;           // Max 15
      max: 15;
      label: "Adoption & Community";
      breakdown: {
        installs: number;      // 0 to 10
        contributors: number;  // 0 to 5
      };
    };
  };

  // Badges & Alerts
  flags: {
    type: 'positive' | 'warning' | 'critical';
    icon: string;
    text: string;
    description: string;
  }[];

  // Actionable tips for site builders
  recommendations: string[];
}
```
