import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CheckResult, CheckFinding } from '../types';

export function runTypesCheck(cwd: string): CheckResult {
  const startTime = Date.now();
  const findings: CheckFinding[] = [];

  const tsconfigPath = path.join(cwd, 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    return {
      id: 'type-safety',
      name: 'Static Type Check',
      status: 'SKIPPED',
      durationMs: Date.now() - startTime,
      summary: 'No tsconfig.json found; skipping TypeScript type check.',
      findings: []
    };
  }

  // 1. Check local node_modules/.bin/tsc
  // 2. Check globally or via typescript bundle
  // 3. Fallback to npx -p typescript tsc
  let tscCmd = 'npx -p typescript tsc';
  const localTsc = path.join(cwd, 'node_modules', '.bin', 'tsc');
  if (fs.existsSync(localTsc)) {
    tscCmd = `"${localTsc}"`;
  } else {
    try {
      const tsPath = require.resolve('typescript/bin/tsc');
      if (fs.existsSync(tsPath)) {
        tscCmd = `node "${tsPath}"`;
      }
    } catch {
      // fallback
    }
  }

  try {
    execSync(`${tscCmd} --noEmit --pretty false`, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    return {
      id: 'type-safety',
      name: 'Static Type Check',
      status: 'PASS',
      durationMs: Date.now() - startTime,
      summary: 'TypeScript compilation and type checking passed with 0 errors.',
      findings: []
    };
  } catch (err: any) {
    const rawOutput = (err.stdout || '') + '\n' + (err.stderr || '');
    const lines = rawOutput.split('\n');

    for (const line of lines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
      if (match) {
        findings.push({
          level: 'error',
          file: match[1],
          line: parseInt(match[2], 10),
          message: `[${match[4]}] ${match[5]}`
        });
      } else if (line.includes('error TS') || line.includes('TS2322')) {
        findings.push({
          level: 'error',
          message: line.trim()
        });
      }
    }

    if (findings.length === 0 && rawOutput.trim().length > 0) {
      findings.push({
        level: 'error',
        message: rawOutput.trim().slice(0, 300)
      });
    }

    return {
      id: 'type-safety',
      name: 'Static Type Check',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      summary: `Found ${findings.length} TypeScript compilation / type error(s).`,
      findings
    };
  }
}
