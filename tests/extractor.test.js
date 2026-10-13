import { describe, it } from 'node:test';
import assert from 'node:assert';
import '../extension/src/content/extractor.js';

const { DrupalDomExtractor } = globalThis;

describe('DOM Extractor Unit Tests', () => {
  it('extracts security coverage, active installs, releases, and age from mock DOM', () => {
    const mockDoc = {
      querySelector(selector) {
        if (selector === '#page-title') {
          return {
            cloneNode() {
              return {
                querySelectorAll() { return []; },
                textContent: 'Nightingale'
              };
            }
          };
        }
        if (selector === '.breadbox, .breadcrumb') {
          return { textContent: 'General projects > Site Templates' };
        }
        if (selector.includes('time[pubdate]')) {
          return {
            getAttribute(attr) {
              if (attr === 'datetime') return String(Math.floor(Date.now() / 1000) - 86400 * 10); // 10 days ago
              return null;
            },
            textContent: '1 October 2026'
          };
        }
        if (selector === '.project-info') {
          return {
            textContent: 'Stable releases for this project are covered by the security advisory policy.'
          };
        }
        if (selector === '#content') {
          return {
            textContent: 'ddev config --project-type=drupal11. Nightingale is a Drupal CMS site template.'
          };
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector.includes('shield-icon') || selector.includes('shield')) {
          return [{ src: '/shield-icon-black.svg' }];
        }
        if (selector.includes('.view-drupalorg-project-downloads .release')) {
          return [
            {
              classList: { contains(c) { return c === 'stability-stable' || c === 'security-covered'; } },
              querySelector(sel) {
                if (sel.includes('release-version a')) return { textContent: '1.0.1', href: '/project/nightingale/releases/1.0.1' };
                if (sel.includes('created')) return { textContent: 'released 10 October 2026' };
                if (sel.includes('composer-command')) return { value: 'composer require drupal/nightingale:^1.0' };
                return null;
              },
              textContent: '1.0.1 released 10 October 2026. Works with Drupal: ^11'
            },
            {
              classList: { contains() { return false; } },
              querySelector(sel) {
                if (sel.includes('release-version a')) return { textContent: '1.x-dev', href: '/project/nightingale/releases/1.x-dev' };
                return null;
              },
              textContent: '1.x-dev updated 8 Oct 2026'
            }
          ];
        }
        if (selector.includes('supporting-organizations')) {
          return [
            { querySelector() { return { textContent: 'Reading Room' }; } },
            { querySelector() { return { textContent: 'Solathat' }; } }
          ];
        }
        return [];
      }
    };

    const data = DrupalDomExtractor.extract(mockDoc);

    assert.strictEqual(data.title, 'Nightingale');
    assert.strictEqual(data.isSecurityCovered, true);
    assert.strictEqual(data.isEmergingProject, true);
    assert.strictEqual(data.supportsDrupal11, true);
    assert.strictEqual(data.latestVersion, '1.0.1');
    assert.strictEqual(data.releases.length, 2);
    assert.strictEqual(data.releases[0].version, '1.0.1');
    assert.strictEqual(data.releases[0].isSecurityCovered, true);
    assert.strictEqual(data.releases[1].version, '1.x-dev');
  });
});
