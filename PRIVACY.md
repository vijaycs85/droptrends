# Privacy Policy for DropTrends

Last updated: October 14, 2026  
Official Hosted Version: [https://www.drupaldroptrends.com/privacy](https://www.drupaldroptrends.com/privacy)

DropTrends ("the extension") is an open-source browser extension designed to provide objective project health ratings, compatibility insights, and security indicators directly on Drupal.org project pages.

We believe privacy is a fundamental right. DropTrends is built from the ground up with a privacy-first architecture.

---

## 1. What Data We Collect

**DropTrends does not collect, track, or transmit any personal data, account information, or browsing history.**

- **No Personal Information**: We do not collect names, email addresses, usernames, IP addresses, or device identifiers.
- **No Browsing History**: The extension does not record, log, or monitor URLs or websites you visit.
- **No Keystrokes or Form Input**: The extension never inspects or logs user input or form fields.

## 2. What Data Is Processed Locally

DropTrends operates entirely on your local machine:
- **Public Drupal.org Project Metadata**: When you navigate to a public project page (such as `drupal.org/project/token`), the extension reads publicly displayed project details (such as release dates, compatibility strings, and maintainer counts) solely to calculate the DropScore rating and render the on-page summary drawer.
- **Public GitLab CI Telemetry**: The extension queries public, open-access pipeline status badges from `git.drupalcode.org` solely to check whether automated tests are passing for open-source modules.

This processing occurs entirely in memory within your browser session and is never sent to external servers or analytics platforms.

## 3. Local Storage Usage

DropTrends utilizes `chrome.storage.local` strictly on your device to persist user preferences:
- Interface settings (such as showing/hiding the inline DropScore pill).
- Caching the most recently inspected project's score so the toolbar popup can render immediately without re-parsing.

No stored data ever leaves your device.

## 4. Third-Party Services and Analytics

- DropTrends uses **zero third-party analytics**, tracking scripts, advertising networks, or telemetry services (no Google Analytics, no Mixpanel, no Sentry).
- No data is sold, monetized, leased, or shared with third parties.

## 5. Security & Network Access

DropTrends only interacts with:
- `drupal.org` (to display the score overlay on public project pages).
- `git.drupalcode.org` (to retrieve public GitLab CI test results).

No requests are made to any other network destination.

## 6. Open Source Code Transparency

The full source code of DropTrends is publicly available for independent security and privacy auditing:
[https://github.com/vijaycs85/droptrends](https://github.com/vijaycs85/droptrends)

## 7. Changes to This Policy

If our privacy practices change in a future release, this policy will be updated with a revised "Last updated" date.

## 8. Contact

If you have questions or feedback regarding this Privacy Policy, please open an issue on GitHub:
[https://github.com/vijaycs85/droptrends/issues](https://github.com/vijaycs85/droptrends/issues)
