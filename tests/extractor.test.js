import { describe, it } from 'node:test';
import assert from 'node:assert';
import '../extension/src/content/extractor.js';

const { DrupalDomExtractor } = globalThis;

describe('DOM Extractor Unit Tests', () => {
  it('extracts security coverage, active installs, and release info from mock DOM', () => {
    // Create a mock DOM document representing Drupal.org Token project page
    const mockDoc = {
      querySelector(selector) {
        if (selector === '#page-title') {
          return {
            cloneNode() {
              return {
                querySelectorAll() { return []; },
                textContent: 'Token'
              };
            }
          };
        }
        if (selector === '.project-info') {
          return {
            textContent: '520,202 sites report using this module. Stable releases for this project are covered by the security advisory policy.'
          };
        }
        if (selector === 'textarea.drupalorg-copy-release, .composer-command') {
          return {
            value: "composer require 'drupal/token:^1.17'"
          };
        }
        if (selector === '.view-drupalorg-project-downloads .release.stability-stable, .view-drupalorg-project-downloads .release') {
          return {
            querySelector(sel) {
              if (sel === '.views-field-field-release-version a') {
                return { textContent: '8.x-1.17' };
              }
              if (sel === '.views-field-created') {
                return { textContent: 'released 9 January 2026' };
              }
              return null;
            }
          };
        }
        if (selector === '#block-project-issue-issue-cockpit') {
          return {
            querySelector(sel) {
              if (sel === '.issue-cockpit-All .issue-cockpit-totals') {
                return { textContent: '461 open, 11 RTBC, 1,896 total' };
              }
              if (sel === '.issue-cockpit-1 .issue-cockpit-totals') {
                return { textContent: '185 open, 4 RTBC, 765 total' };
              }
              return null;
            }
          };
        }
        if (selector === '#block-drupalorg-project-maintainers') {
          return {
            querySelectorAll() {
              return [{ textContent: 'dave reid' }, { textContent: 'eaton' }, { textContent: 'berdir' }];
            }
          };
        }
        if (selector === '#content') {
          return {
            textContent: 'Works with Drupal: ^10.3 || ^11. PHP 8.5 compatibility.'
          };
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector.includes('shield-icon') || selector.includes('shield')) {
          return [{ src: '/shield-icon-black.svg' }];
        }
        if (selector.includes('views-field')) {
          return [{ textContent: 'Works with Drupal: ^10.3 || ^11' }];
        }
        if (selector.includes('supporting-organizations')) {
          return [
            { querySelector() { return { textContent: 'Lullabot' }; } },
            { querySelector() { return { textContent: 'MD Systems' }; } }
          ];
        }
        return [];
      }
    };

    const data = DrupalDomExtractor.extract(mockDoc);

    assert.strictEqual(data.title, 'Token');
    assert.strictEqual(data.isSecurityCovered, true);
    assert.strictEqual(data.activeInstalls, 520202);
    assert.strictEqual(data.latestVersion, '8.x-1.17');
    assert.strictEqual(data.supportsDrupal11, true);
    assert.strictEqual(data.supportsDrupal10, true);
    assert.strictEqual(data.modernPhpSupported, true);
    assert.strictEqual(data.openIssuesCount, 461);
    assert.strictEqual(data.rtbcCount, 11);
    assert.strictEqual(data.totalIssuesCount, 1896);
    assert.strictEqual(data.openBugsCount, 185);
    assert.strictEqual(data.maintainersCount, 3);
    assert.strictEqual(data.sponsorsCount, 2);
  });
});
