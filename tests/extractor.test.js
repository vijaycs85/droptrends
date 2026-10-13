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
              if (attr === 'datetime') return String(Math.floor(Date.now() / 1000) - 86400 * 10);
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

    assert.strictEqual(data.isExcluded, false);
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

  it('excludes Drupal Core and Drupal CMS platforms from evaluation', () => {
    assert.strictEqual(DrupalDomExtractor.isExcludedProject('drupal'), true);
    assert.strictEqual(DrupalDomExtractor.isExcludedProject('drupal_cms'), true);
    assert.strictEqual(DrupalDomExtractor.isExcludedProject('cms'), true);
    assert.strictEqual(DrupalDomExtractor.isExcludedProject('token'), false);
    assert.strictEqual(DrupalDomExtractor.isExcludedProject('pathauto'), false);
    assert.strictEqual(DrupalDomExtractor.isExcludedProject('nightingale'), false);
  });

  it('generates accurate Composer commands across semver, pre-releases, and legacy branches', () => {
    // Stable release with semver
    assert.strictEqual(
      DrupalDomExtractor.generateComposerCommand('flowdrop', '2.6.0', true),
      "composer require 'drupal/flowdrop:^2.6'"
    );

    // Pre-release
    assert.strictEqual(
      DrupalDomExtractor.generateComposerCommand('flowdrop', '2.7.0-alpha2', false),
      "composer require 'drupal/flowdrop:2.7.0-alpha2'"
    );

    // Legacy branch format (Token)
    assert.strictEqual(
      DrupalDomExtractor.generateComposerCommand('token', '8.x-1.14', true),
      "composer require 'drupal/token:^1'"
    );

    // Fallback when no version specified
    assert.strictEqual(
      DrupalDomExtractor.generateComposerCommand('token', null),
      'composer require drupal/token'
    );
  });

  it('accurately detects uncovered projects (Dreditor) with alert shields and warning banners', () => {
    const mockDreditorDoc = {
      querySelector(selector) {
        if (selector === '#page-title') {
          return {
            cloneNode() {
              return {
                querySelectorAll() { return []; },
                textContent: 'Dreditor (moved)'
              };
            }
          };
        }
        if (selector === '.breadbox, .breadcrumb') {
          return { textContent: 'Modules' };
        }
        if (selector === '.note-warning') {
          return {
            textContent: 'This project is not covered by Drupal’s security advisory policy.'
          };
        }
        if (selector === '.project-info') {
          return {
            textContent: 'Unsupported. Obsolete. Created by sun on 21 July 2009. This project is not covered by the security advisory policy. Use at your own risk! It may have publicly disclosed vulnerabilities.',
            querySelector(sel) {
              if (sel.includes('shield-icon-alert') || sel.includes('shield alert')) {
                return {
                  getAttribute(attr) {
                    if (attr === 'src') return '/sites/all/modules/drupalorg/drupalorg/images/shield-icon-alert.svg';
                    if (attr === 'alt') return 'shield alert';
                    return null;
                  }
                };
              }
              return null;
            }
          };
        }
        if (selector === '#content') {
          return {
            textContent: 'The Dreditor project (patch review) has moved. This project is not covered by Drupal’s security advisory policy.'
          };
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector.includes('.note-warning')) {
          return [{
            textContent: 'This project is not covered by Drupal’s security advisory policy.'
          }];
        }
        if (selector.includes('shield-icon') || selector.includes('shield')) {
          return [{
            getAttribute(attr) {
              if (attr === 'src') return '/sites/all/modules/drupalorg/drupalorg/images/shield-icon-alert.svg';
              if (attr === 'alt') return 'shield alert';
              return null;
            },
            src: '/sites/all/modules/drupalorg/drupalorg/images/shield-icon-alert.svg',
            alt: 'shield alert'
          }];
        }
        if (selector.includes('.view-drupalorg-project-downloads .release')) {
          return [];
        }
        return [];
      }
    };

    const data = DrupalDomExtractor.extract(mockDreditorDoc);

    assert.strictEqual(data.isExcluded, false);
    assert.strictEqual(data.title, 'Dreditor (moved)');
    assert.strictEqual(data.isSecurityCovered, false, 'Dreditor must NOT be security covered');
  });

  it('correctly discriminates release rows with shield-icon-black from shield-icon-alert', () => {
    const mockReleasesDoc = {
      querySelectorAll(selector) {
        if (selector === '.view-drupalorg-project-downloads .release') {
          return [
            {
              classList: { contains(c) { return c === 'stability-stable'; } },
              querySelector(sel) {
                if (sel.includes('release-version a')) return { textContent: '2.0.0' };
                if (sel.includes('shield-icon-alert') || sel.includes('shield alert')) {
                  return {
                    getAttribute(attr) {
                      if (attr === 'src') return '/shield-icon-alert.svg';
                      if (attr === 'alt') return 'shield alert';
                      return null;
                    }
                  };
                }
                if (sel.includes('shield-icon')) {
                  return {
                    getAttribute(attr) {
                      if (attr === 'src') return '/shield-icon-alert.svg';
                      if (attr === 'alt') return 'shield alert';
                      return null;
                    }
                  };
                }
                return null;
              },
              textContent: '2.0.0 released 1 Oct 2026'
            },
            {
              classList: { contains(c) { return c === 'stability-stable' || c === 'security-covered'; } },
              querySelector(sel) {
                if (sel.includes('release-version a')) return { textContent: '1.0.0' };
                if (sel.includes('shield-icon-alert')) return null;
                if (sel.includes('shield-icon-black') || sel.includes('shield-icon')) {
                  return {
                    getAttribute(attr) {
                      if (attr === 'src') return '/shield-icon-black.svg';
                      if (attr === 'alt') return 'Stable release covered';
                      return null;
                    }
                  };
                }
                return null;
              },
              textContent: '1.0.0 released 1 Jan 2026'
            }
          ];
        }
        return [];
      }
    };

    const releases = DrupalDomExtractor.extractAllReleases(mockReleasesDoc, 'testmod');
    assert.strictEqual(releases.length, 2);
    assert.strictEqual(releases[0].version, '2.0.0');
    assert.strictEqual(releases[0].isSecurityCovered, false, 'Release with shield-icon-alert must NOT be security covered');
    assert.strictEqual(releases[1].version, '1.0.0');
    assert.strictEqual(releases[1].isSecurityCovered, true, 'Release with shield-icon-black must be security covered');
  });
});

