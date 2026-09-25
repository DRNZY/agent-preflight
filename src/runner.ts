import path from 'path';
import { CheckResult, PreflightOptions, PreflightReport, CheckStatus } from './types';
import { runTypesCheck } from './checks/typesCheck';
import { runSecretsCheck } from './checks/secretsCheck';
import { runHygieneCheck } from './checks/hygieneCheck';
import { runGitCheck } from './checks/gitCheck';
import { runTestCheck } from './checks/testCheck';

export function runPreflight(options: PreflightOptions = {}): PreflightReport {
  const cwd = path.resolve(options.cwd || process.cwd());
  const startTime = Date.now();
  const results: CheckResult[] = [];

  // 1. Secrets Scan
  if (!options.skipSecrets) {
    results.push(runSecretsCheck(cwd));
  }

  // 2. Code Hygiene
  if (!options.skipHygiene) {
    results.push(runHygieneCheck(cwd));
  }

  // 3. Static Types
  if (!options.skipTypes) {
    results.push(runTypesCheck(cwd));
  }

  // 4. Git Cleanliness
  if (!options.skipGit) {
    results.push(runGitCheck(cwd));
  }

  // 5. Automated Tests
  if (!options.skipTests) {
    results.push(runTestCheck(cwd));
  }

  const passedCount = results.filter(r => r.status === 'PASS').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  let overallStatus: CheckStatus = 'PASS';
  if (failCount > 0) {
    overallStatus = 'FAIL';
  } else if (warnCount > 0 && options.strict) {
    overallStatus = 'FAIL';
  } else if (warnCount > 0) {
    overallStatus = 'WARN';
  }

  return {
    targetDir: cwd,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    overallStatus,
    passedCount,
    warnCount,
    failCount,
    results
  };
}
