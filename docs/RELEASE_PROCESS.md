# DropTrends Release & Publishing Process

This document describes the automated release workflow for the DropTrends browser extension across the Chrome Web Store and Mozilla Firefox Add-ons (AMO).

---

## 1. Quick Start

Ensure you are on the `1.x` branch with a clean git working directory, then run:

```bash
# For a bug fix or minor calibration (1.1.0 -> 1.1.1)
pnpm release patch

# For new features, UI enhancements, or scoring engine additions (1.1.0 -> 1.2.0)
pnpm release minor

# For breaking architectural changes or major redesigns (1.1.0 -> 2.0.0)
pnpm release major

# Or target an explicit semver string
pnpm release 1.2.0
```

### Dry Run (Preview without modifying files or git)
```bash
pnpm release patch --dry-run
```

---

## 2. What the Release Automation Does

Running `pnpm release <bump>` executes [`scripts/release.js`](../scripts/release.js), which automatically handles:

1. **Pre-flight Safety Checks**:
   - Ensures the git working tree is clean (no uncommitted edits).
   - Validates the current semver and calculates the target version.
   - Verifies the target git tag does not already exist.
   - Executes the automated test suite (`tests/**/*.test.js`) before modifying any files. If any test fails, the release halts immediately.

2. **Synchronizes Version Numbers Across All Project Files**:
   - `package.json`: Updates `"version": "X.Y.Z"`
   - `extension/manifest.json`: Updates Chrome Manifest V3 `"version"`
   - `extension/manifest.firefox.json`: Updates Firefox Manifest V3 `"version"`
   - `extension/src/popup/popup.html`: Updates header badge (`vX.Y.Z`)
   - `CHROMEWEBSTORE.md`: Updates `Last Updated` date to today and prepends a new changelog entry under `## 7. Version History` by collecting recent git commit messages.

3. **Re-generates Assets & Distribution Packages**:
   - Re-generates native icon sets across all required resolutions (16px, 32px, 48px, 128px, 512px).
   - Runs `scripts/build.js` to verify manifest declarations, content scripts, background worker, and popup.
   - Runs `scripts/package-extension.js` to create fresh zip bundles:
     - `droptrends-chrome.zip` (and `droptrends-extension.zip`) for the Chrome Web Store.
     - `droptrends-firefox.zip` for Mozilla Firefox Add-ons (AMO).

4. **Git Commit & Tagging**:
   - Stages all modified version files.
   - Commits with message: `chore(release): bump version to X.Y.Z`.
   - Creates an annotated git tag: `X.Y.Z` with message `Release X.Y.Z`.

---

## 3. Post-Release Publishing Steps

After the release script finishes:

### Step 1: Push Commit and Tags to Git Remote
```bash
git push origin 1.x --tags
```
*(If you only want to push the specific tag: `git push origin 1.x && git push origin <version>`)*

### Step 2: Upload to Chrome Web Store
1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click on the **DropTrends: Drupal Module Health & DropScore** item.
3. In the left navigation, click **Package**.
4. Click **Upload new package**.
5. Select the newly generated `droptrends-chrome.zip` from your project root.
6. Review the **Store Listing** and **Privacy** tabs if permissions or features were modified (refer to [`CHROMEWEBSTORE.md`](../CHROMEWEBSTORE.md) as the single source of truth).
7. Click **Submit for review**.

### Step 3: (Optional) Upload to Firefox Add-ons (AMO)
1. Open the [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Select **DropTrends**.
3. Click **Upload New Version**.
4. Select `droptrends-firefox.zip`.
5. Complete the submission review prompts.

---

## 4. Command Line Options & Flags

| Flag | Description |
| :--- | :--- |
| `--dry-run` | Simulates the entire process without modifying files on disk or making git commits/tags. |
| `--allow-dirty` | Allows running even if there are uncommitted changes in the git working tree. |
| `--no-test` | Skips running the unit test suite before creating the release. |
| `--no-tag` | Skips creating the git tag (only updates files, packages, and commits). |
| `--help`, `-h` | Displays the help menu with usage instructions and examples. |

---

## 5. Rollback / Abort Procedures

If you ever need to undo a local release that hasn't been pushed to remote:

```bash
# Delete the local tag
git tag -d <version>

# Undo the release commit (keeping file changes unstaged)
git reset HEAD~1

# Discard all file changes back to the previous commit
git restore .
```
