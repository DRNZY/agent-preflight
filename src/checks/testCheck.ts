import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CheckResult, CheckFinding } from '../types';

export function runTestCheck(cwd: string): CheckResult {
  const startTime = Date.now();
  const findings: CheckFinding[] = [];

  const pkgJsonPath = path.join(cwd, 'package.json');
  const cargoPath = path.join(cwd, 'Cargo.toml');
  const pytestPath = path.join(cwd, 'pytest.ini');

  let testCmd: string | null = null;

  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (pkg.scripts && pkg.scripts.test && !pkg.scripts.test.includes('no test specified')) {
        testCmd = 'npm test';
      }
    } catch {
      // ignore
    }
  } else if (fs.existsSync(cargoPath)) {
    testCmd = 'cargo test';
  } else if (fs.existsSync(pytestPath) || fs.existsSync(path.join(cwd, 'tests'))) {
    testCmd = 'pytest';
  }

  if (!testCmd) {
    return {
      id: 'test-runner',
      name: 'Automated Test Verification',
      status: 'SKIPPED',
      durationMs: Date.now() - startTime,
      summary: 'No test runner or test script configured.',
      findings: []
    };
  }

  try {
    execSync(testCmd, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000
    });

    return {
      id: 'test-runner',
      name: 'Automated Test Verification',
      status: 'PASS',
      durationMs: Date.now() - startTime,
      summary: `Executed '${testCmd}' successfully. All tests passed.`,
      findings: []
    };
  } catch (err: any) {
    const rawOutput = (err.stdout || '') + '\n' + (err.stderr || '');
    findings.push({
      level: 'error',
      message: `Test command '${testCmd}' failed with exit code ${err.status || 1}`,
      snippet: rawOutput.slice(0, 400)
    });

    return {
      id: 'test-runner',
      name: 'Automated Test Verification',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      summary: `Test suite failed when running '${testCmd}'.`,
      findings
    };
  }
}
