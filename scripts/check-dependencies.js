#!/usr/bin/env node

/**
 * Check for outdated and deprecated packages.
 *
 * Outdated packages are reported as warnings only — Dependabot opens PRs for
 * those, and failing here means every upstream release breaks CI on unrelated
 * branches. Deprecated packages fail the check, because they need a human
 * decision and will not resolve on their own.
 */

const { execSync } = require('child_process');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

// Deprecation lookups hit the network once per package. Cap the count and the
// concurrency so a full check stays under ~15s and does not trip npm rate limits.
const MAX_PACKAGES_TO_CHECK = 100;
const LOOKUP_CONCURRENCY = 10;

function reportOutdated(json) {
  const outdated = JSON.parse(json);
  const packages = Object.keys(outdated);

  if (packages.length === 0) {
    console.log(`${GREEN}✓ All packages are up to date${RESET}\n`);
    return;
  }

  console.log(`${YELLOW}⚠ ${packages.length} outdated package(s):${RESET}\n`);
  packages.forEach((pkg) => {
    const info = outdated[pkg];
    console.log(`  ${YELLOW}${pkg}${RESET}: ${info.current} → ${GREEN}${info.latest}${RESET}`);
  });
  console.log(`\n${YELLOW}Not blocking. Dependabot will open PRs for these.${RESET}\n`);
}

function checkOutdated() {
  console.log('🔍 Checking for outdated packages...\n');

  try {
    const output = execSync('pnpm outdated --format json 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (output && output.trim()) {
      reportOutdated(output);
    } else {
      console.log(`${GREEN}✓ All packages are up to date${RESET}\n`);
    }
  } catch (error) {
    // pnpm outdated exits 1 when anything is outdated; the JSON is still on stdout.
    if (error.stdout && error.stdout.trim()) {
      try {
        reportOutdated(error.stdout);
        return;
      } catch {
        // fall through to the generic warning
      }
    }
    console.log(`${YELLOW}⚠ Could not determine outdated packages${RESET}\n`);
  }
}

function collectDirectDependencies() {
  const lockfileContent = execSync('pnpm list --json --depth 0 2>/dev/null', {
    encoding: 'utf-8',
  });

  const workspaces = JSON.parse(lockfileContent);
  const allDeps = new Set();

  workspaces.forEach((workspace) => {
    Object.keys(workspace.dependencies || {}).forEach((dep) => allDeps.add(dep));
    Object.keys(workspace.devDependencies || {}).forEach((dep) => allDeps.add(dep));
  });

  // Names are interpolated into a shell command below, so only pass through
  // ones matching the npm package-name grammar.
  return Array.from(allDeps).filter((dep) =>
    /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(dep)
  );
}

async function findDeprecated(packages) {
  const found = [];
  const queue = [...packages];

  async function worker() {
    while (queue.length > 0) {
      const pkg = queue.shift();
      try {
        const { stdout } = await execAsync(`npm view ${pkg} deprecated 2>/dev/null`, {
          encoding: 'utf-8',
        });
        const message = stdout.trim();
        if (message) {
          found.push({ name: pkg, message });
        }
      } catch {
        // Not published, private, or a network hiccup — skip it.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(LOOKUP_CONCURRENCY, packages.length) }, () => worker())
  );

  return found;
}

async function checkDeprecated() {
  console.log('🔍 Checking for deprecated packages...\n');

  let packages;
  try {
    packages = collectDirectDependencies().slice(0, MAX_PACKAGES_TO_CHECK);
  } catch {
    console.log(`${YELLOW}⚠ Could not check for deprecated packages${RESET}\n`);
    return false;
  }

  const deprecated = await findDeprecated(packages);

  if (deprecated.length === 0) {
    console.log(`${GREEN}✓ No deprecated packages found${RESET}\n`);
    return false;
  }

  console.log(`${RED}❌ Found ${deprecated.length} deprecated package(s):${RESET}\n`);
  deprecated.forEach(({ name, message }) => {
    console.log(`  ${YELLOW}${name}${RESET}: ${message}`);
  });
  console.log(`\n${YELLOW}Replace these packages before merging.${RESET}\n`);
  return true;
}

async function main() {
  console.log('\n📦 Checking dependencies...\n');

  checkOutdated();
  const hasDeprecated = await checkDeprecated();

  if (hasDeprecated) {
    console.log(`${RED}✗ Dependency check failed${RESET}\n`);
    process.exit(1);
  }

  console.log(`${GREEN}✓ All dependency checks passed${RESET}\n`);
}

main().catch((error) => {
  console.error(`${RED}✗ Dependency check errored: ${error.message}${RESET}\n`);
  process.exit(1);
});
