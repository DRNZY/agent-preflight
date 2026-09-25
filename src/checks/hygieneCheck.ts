import fs from 'fs';
import path from 'path';
import { CheckResult, CheckFinding } from '../types';

const HYGIENE_PATTERNS = [
  { name: 'Focused Test (describe.only/it.only/fdescribe/fit)', regex: /\b(?:fdescribe|fit|it\.only|describe\.only|test\.only)\s*\(/g, level: 'error' as const },
  { name: 'Debugger Statement', regex: /\bdebugger\s*;/g, level: 'error' as const },
  { name: 'Unresolved Merge Conflict', regex: /^(?:<<<<<<<|=======|>>>>>>>)/gm, level: 'error' as const },
  { name: 'Temporary File / Leftover Scratch', regex: /\.(?:tmp|bak|orig|swp)$/i, level: 'warn' as const }
];

const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.vue', '.svelte']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-test', 'build', '.turbo', '.next', '.venv', 'coverage']);

export function runHygieneCheck(cwd: string, includeTests: boolean = false): CheckResult {
  const startTime = Date.now();
  const findings: CheckFinding[] = [];

  function scanDir(dir: string, depth = 0) {
    if (depth > 6) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const relPath = path.relative(cwd, fullPath);

        if (/\.(?:tmp|bak|orig|swp)$/i.test(entry.name)) {
          findings.push({
            level: 'warn',
            file: relPath,
            message: `Leftover temporary artifact: ${entry.name}`
          });
          continue;
        }

        if (!CODE_EXTS.has(ext)) continue;
        if (relPath.includes('hygieneCheck.')) continue;
        if (!includeTests && (relPath.startsWith('test/') || relPath.includes('.test.') || relPath.includes('.spec.'))) {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pat of HYGIENE_PATTERNS) {
              if (pat.regex.test(line)) {
                findings.push({
                  level: pat.level,
                  file: relPath,
                  line: i + 1,
                  message: `Hygiene issue: ${pat.name}`,
                  snippet: line.trim()
                });
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  try {
    scanDir(cwd);
  } catch (err: any) {
    findings.push({
      level: 'error',
      message: `Error during hygiene scan: ${err?.message || String(err)}`
    });
  }

  const hasErrors = findings.some(f => f.level === 'error');
  const hasWarns = findings.some(f => f.level === 'warn');

  return {
    id: 'code-hygiene',
    name: 'Code Hygiene & Leftover Scaffolding',
    status: hasErrors ? 'FAIL' : (hasWarns ? 'WARN' : 'PASS'),
    durationMs: Date.now() - startTime,
    summary: hasErrors
      ? `Found ${findings.filter(f => f.level === 'error').length} blocking hygiene issue(s).`
      : (hasWarns ? 'Passed with non-blocking hygiene warnings.' : 'Code hygiene clean. No debug/focused statements found.'),
    findings
  };
}
