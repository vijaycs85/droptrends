#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function error(msg) {
  console.error(`${colors.red}✖ Error: ${msg}${colors.reset}`);
}

function success(msg) {
  console.log(`${colors.green}✔ ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`);
}

function showHelp() {
  console.log(`
${colors.bold}DropTrends Release Automation Tool${colors.reset}

${colors.bold}USAGE:${colors.reset}
  pnpm release <major|minor|patch|version> [options]
  node scripts/release.js <major|minor|patch|version> [options]

${colors.bold}ARGUMENTS:${colors.reset}
  major             Bump major version (e.g. 1.1.0 -> 2.0.0)
  minor             Bump minor version (e.g. 1.1.0 -> 1.2.0)
  patch             Bump patch version (e.g. 1.1.0 -> 1.1.1)
  <x.y.z>           Specify explicit semver version (e.g. 1.2.0)

${colors.bold}OPTIONS:${colors.reset}
  --dry-run         Simulate the release without writing files or creating git commits/tags
  --allow-dirty     Allow release even if working tree has uncommitted modifications
  --no-test         Skip running automated unit test suite before release
  --no-tag          Skip creating a git tag
  --help, -h        Display this help message

${colors.bold}EXAMPLES:${colors.reset}
  pnpm release patch
  pnpm release minor
  pnpm release major
  pnpm release 1.2.0
  pnpm release patch --dry-run
`);
}

function parseSemver(v) {
  const clean = v.replace(/^v/, '');
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    version: clean
  };
}

function calculateNextVersion(currentVersion, bumpArg) {
  const parsed = parseSemver(currentVersion);
  if (!parsed) {
    throw new Error(`Current version "${currentVersion}" in package.json is not valid semver.`);
  }

  const arg = bumpArg.toLowerCase().trim();
  if (arg === 'major') {
    return `${parsed.major + 1}.0.0`;
  } else if (arg === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  } else if (arg === 'patch') {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  } else {
    const explicit = parseSemver(bumpArg);
    if (!explicit) {
      throw new Error(`Invalid bump argument "${bumpArg}". Must be "major", "minor", "patch", or valid semver (e.g. 1.2.0).`);
    }
    return explicit.version;
  }
}

function getRecentCommits() {
  try {
    const latestTag = execSync('git describe --tags --abbrev=0', { cwd: rootDir, encoding: 'utf8' }).trim();
    const logOutput = execSync(`git log ${latestTag}..HEAD --oneline`, { cwd: rootDir, encoding: 'utf8' }).trim();
    if (!logOutput) return [];
    return logOutput.split('\n')
      .map(line => line.replace(/^[a-f0-9]+\s+/, '').trim())
      .filter(msg => msg && !msg.startsWith('chore(release):'));
  } catch {
    try {
      const logOutput = execSync('git log -n 5 --oneline', { cwd: rootDir, encoding: 'utf8' }).trim();
      if (!logOutput) return [];
      return logOutput.split('\n')
        .map(line => line.replace(/^[a-f0-9]+\s+/, '').trim())
        .filter(msg => msg && !msg.startsWith('chore(release):'));
    } catch {
      return [];
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const dryRun = args.includes('--dry-run');
  const allowDirty = args.includes('--allow-dirty');
  const noTest = args.includes('--no-test');
  const noTag = args.includes('--no-tag');

  const bumpArg = args.find(a => !a.startsWith('-'));
  if (!bumpArg) {
    error('Missing bump argument ("major", "minor", "patch", or version).');
    showHelp();
    process.exit(1);
  }

  log(`\n${colors.bold}=== DropTrends Release Preparation ===${colors.reset}`);
  if (dryRun) {
    info('DRY-RUN MODE ENABLED: No files will be permanently modified, no git commit/tag will be created.');
  }

  // 1. Check working directory status
  try {
    const status = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' }).trim();
    if (status && !allowDirty && !dryRun) {
      error('Git working directory is not clean. Commit or stash changes before releasing, or pass --allow-dirty.');
      console.log(status);
      process.exit(1);
    }
  } catch (err) {
    error(`Failed to verify git status: ${err.message}`);
    process.exit(1);
  }

  // 2. Read package.json to get current version
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    error('package.json not found in project root.');
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;

  // 3. Compute new version
  let nextVersion;
  try {
    nextVersion = calculateNextVersion(currentVersion, bumpArg);
  } catch (err) {
    error(err.message);
    process.exit(1);
  }

  log(`\n  Current version: ${colors.yellow}${currentVersion}${colors.reset}`);
  log(`  Target version:  ${colors.green}${colors.bold}${nextVersion}${colors.reset}\n`);

  if (currentVersion === nextVersion) {
    error(`Target version (${nextVersion}) is identical to current version (${currentVersion}).`);
    process.exit(1);
  }

  // Check if git tag already exists
  try {
    const existingTags = execSync(`git tag -l "${nextVersion}"`, { cwd: rootDir, encoding: 'utf8' }).trim();
    if (existingTags && !dryRun) {
      error(`Git tag "${nextVersion}" already exists. Cannot release duplicate version tag.`);
      process.exit(1);
    }
  } catch {
    // tag check failed, ignore
  }

  // 4. Run tests before touching files
  if (!noTest) {
    info('Running test suite before version bump...');
    try {
      execSync('node --test tests/**/*.test.js', { cwd: rootDir, stdio: 'inherit' });
      success('Automated tests passed successfully.');
    } catch {
      error('Automated test suite failed! Release aborted.');
      process.exit(1);
    }
  } else {
    info('Skipping test suite (--no-test passed).');
  }

  // 5. File modifications map
  const modifiedFiles = [];
  const today = new Date().toISOString().split('T')[0];

  // 5a. package.json
  const updatedPkgContent = fs.readFileSync(pkgPath, 'utf8')
    .replace(/"version":\s*"[^"]+"/, `"version": "${nextVersion}"`);
  modifiedFiles.push({ path: pkgPath, content: updatedPkgContent, label: 'package.json' });

  // 5b. extension/manifest.json
  const manifestPath = path.join(rootDir, 'extension/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    error('extension/manifest.json not found!');
    process.exit(1);
  }
  const updatedManifestContent = fs.readFileSync(manifestPath, 'utf8')
    .replace(/"version":\s*"[^"]+"/, `"version": "${nextVersion}"`);
  modifiedFiles.push({ path: manifestPath, content: updatedManifestContent, label: 'extension/manifest.json' });

  // 5c. extension/manifest.firefox.json
  const firefoxManifestPath = path.join(rootDir, 'extension/manifest.firefox.json');
  if (fs.existsSync(firefoxManifestPath)) {
    const updatedFirefoxContent = fs.readFileSync(firefoxManifestPath, 'utf8')
      .replace(/"version":\s*"[^"]+"/, `"version": "${nextVersion}"`);
    modifiedFiles.push({ path: firefoxManifestPath, content: updatedFirefoxContent, label: 'extension/manifest.firefox.json' });
  }

  // 5d. extension/src/popup/popup.html
  const popupHtmlPath = path.join(rootDir, 'extension/src/popup/popup.html');
  if (fs.existsSync(popupHtmlPath)) {
    const popupContent = fs.readFileSync(popupHtmlPath, 'utf8');
    const updatedPopupContent = popupContent.replace(
      /(<span\s+class="dt-version-badge">)v[^<]+(<\/span>)/,
      `$1v${nextVersion}$2`
    );
    modifiedFiles.push({ path: popupHtmlPath, content: updatedPopupContent, label: 'extension/src/popup/popup.html' });
  }

  // 5e. CHROMEWEBSTORE.md
  const storeDocPath = path.join(rootDir, 'CHROMEWEBSTORE.md');
  if (fs.existsSync(storeDocPath)) {
    let storeDocContent = fs.readFileSync(storeDocPath, 'utf8');
    // Update last updated date
    storeDocContent = storeDocContent.replace(
      /> Last Updated:\s*\d{4}-\d{2}-\d{2}/,
      `> Last Updated: ${today}`
    );

    // Extract recent commits for release bullet notes
    const recentCommits = getRecentCommits();
    let changelogNotes = '';
    if (recentCommits.length > 0) {
      changelogNotes = recentCommits.map(c => `- ${c}`).join('\n');
    } else {
      changelogNotes = `- Release version ${nextVersion}.`;
    }

    const versionHeaderRegex = /(## 7\. Version History\s*\n\n)/;
    if (versionHeaderRegex.test(storeDocContent)) {
      const newEntry = `### Version ${nextVersion} (${today})\n${changelogNotes}\n\n`;
      storeDocContent = storeDocContent.replace(versionHeaderRegex, `$1${newEntry}`);
    }

    modifiedFiles.push({ path: storeDocPath, content: storeDocContent, label: 'CHROMEWEBSTORE.md' });
  }

  // 6. Apply or simulate file updates
  info(`Updating version strings across ${modifiedFiles.length} project files:`);
  for (const item of modifiedFiles) {
    if (dryRun) {
      console.log(`  [dry-run] Would update: ${item.label}`);
    } else {
      fs.writeFileSync(item.path, item.content, 'utf8');
      success(`Updated ${item.label}`);
    }
  }

  if (dryRun) {
    log(`\n${colors.bold}Dry-run complete.${colors.reset} No changes written to disk.`);
    return;
  }

  // 7. Re-generate icons, verify build, and package archives
  info('\nGenerating icons and verifying extension build...');
  try {
    execSync('node scripts/generate-icons.js', { cwd: rootDir, stdio: 'inherit' });
    execSync('node scripts/build.js', { cwd: rootDir, stdio: 'inherit' });
    success('Build verification succeeded.');
  } catch {
    error('Build verification failed! Reverting file updates...');
    execSync(`git checkout -- ${modifiedFiles.map(f => `"${f.path}"`).join(' ')}`, { cwd: rootDir });
    process.exit(1);
  }

  info('Packaging distribution archives (Chrome & Firefox)...');
  try {
    execSync('node scripts/package-extension.js', { cwd: rootDir, stdio: 'inherit' });
    success('Distribution packages created.');
  } catch {
    error('Packaging failed! Reverting file updates...');
    execSync(`git checkout -- ${modifiedFiles.map(f => `"${f.path}"`).join(' ')}`, { cwd: rootDir });
    process.exit(1);
  }

  // 8. Git Commit & Tag
  info('\nCommitting and tagging in git...');
  try {
    const filesToStage = modifiedFiles.map(f => `"${path.relative(rootDir, f.path)}"`).join(' ');
    execSync(`git add ${filesToStage}`, { cwd: rootDir, stdio: 'inherit' });

    const commitMessage = `chore(release): bump version to ${nextVersion}`;
    execSync(`git commit -m "${commitMessage}"`, { cwd: rootDir, stdio: 'inherit' });
    success(`Created git commit: "${commitMessage}"`);

    if (!noTag) {
      const tagMessage = `Release ${nextVersion}`;
      execSync(`git tag -a "${nextVersion}" -m "${tagMessage}"`, { cwd: rootDir, stdio: 'inherit' });
      success(`Created annotated git tag: "${nextVersion}"`);
    } else {
      info('Skipped git tagging (--no-tag passed).');
    }
  } catch (err) {
    error(`Git commit or tag failed: ${err.message}`);
    process.exit(1);
  }

  // 9. Completion summary
  let currentBranch = '1.x';
  try {
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    // fallback
  }

  log(`\n${colors.green}${colors.bold}🎉 Version ${nextVersion} release created successfully!${colors.reset}`);
  log(`
${colors.bold}Summary of Release Artifacts:${colors.reset}
  • Chrome Web Store Package:  ${colors.cyan}droptrends-chrome.zip${colors.reset}
  • Firefox AMO Package:       ${colors.cyan}droptrends-firefox.zip${colors.reset}
  • Git Commit:                ${colors.cyan}chore(release): bump version to ${nextVersion}${colors.reset}
  • Git Tag:                   ${colors.cyan}${nextVersion}${colors.reset}

${colors.bold}Recommended Next Steps:${colors.reset}
  1. Push the release commit and tag to remote:
     ${colors.yellow}git push origin ${currentBranch} && git push origin ${nextVersion}${colors.reset}
     (or: ${colors.yellow}git push origin ${currentBranch} --tags${colors.reset})

  2. Upload ${colors.cyan}droptrends-chrome.zip${colors.reset} to the Chrome Developer Dashboard:
     ${colors.blue}https://chrome.google.com/webstore/devconsole${colors.reset}

  3. (If publishing to AMO) Upload ${colors.cyan}droptrends-firefox.zip${colors.reset} to Mozilla Add-ons:
     ${colors.blue}https://addons.mozilla.org/developers/${colors.reset}
`);
}

main().catch(err => {
  error(`Unhandled error during release: ${err.stack || err.message}`);
  process.exit(1);
});
