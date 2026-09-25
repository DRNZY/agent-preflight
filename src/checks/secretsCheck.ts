import fs from 'fs';
import path from 'path';
import { CheckResult, CheckFinding } from '../types';

const SECRET_PATTERNS = [
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
  { name: 'Google GenAI Token', regex: /AQ\.[A-Za-z0-9-_]{30,}/g },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/g },
  { name: 'GitHub Personal Access Token', regex: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'Generic Secret Assignment', regex: /(?:api_key|apikey|secret|password|auth_token)\s*[:=]\s*["']([^"'\s]{16,})["']/gi },
  { name: 'Private Key Header', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g }
];

const IGNORE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz',
  '.lock', '.log', '.map', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4'
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'dist-test', 'build', '.turbo', '.next', '.venv', 'venv', '.cache', 'coverage'
]);

export function runSecretsCheck(cwd: string, includeTests: boolean = false): CheckResult {
  const startTime = Date.now();
  const findings: CheckFinding[] = [];

  function scanDir(dir: string, depth = 0) {
    if (depth > 6) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;

      if (entry.name === '.env' || entry.name === '.env.local') {
        findings.push({
          level: 'warn',
          file: path.relative(cwd, path.join(dir, entry.name)),
          message: 'Found local .env file. Ensure it is included in .gitignore before committing.'
        });
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IGNORE_EXTENSIONS.has(ext)) continue;

        const relPath = path.relative(cwd, fullPath);
        if (relPath.includes('secretsCheck.') || relPath.includes('.example')) continue;
        if (!includeTests && (relPath.startsWith('test/') || relPath.includes('.test.') || relPath.includes('.spec.'))) {
          continue;
        }

        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > 200 * 1024) continue;

          const content = fs.readFileSync(fullPath, 'utf8');

          for (const pattern of SECRET_PATTERNS) {
            const matches = content.match(pattern.regex);
            if (matches) {
              findings.push({
                level: 'error',
                file: relPath,
                message: `Potential hardcoded secret detected: ${pattern.name}`
              });
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
      message: `Error during secret scan: ${err?.message || String(err)}`
    });
  }

  const hasErrors = findings.some(f => f.level === 'error');
  const hasWarns = findings.some(f => f.level === 'warn');

  return {
    id: 'secrets-scan',
    name: 'Hardcoded Secrets Scanner',
    status: hasErrors ? 'FAIL' : (hasWarns ? 'WARN' : 'PASS'),
    durationMs: Date.now() - startTime,
    summary: hasErrors
      ? `Detected ${findings.filter(f => f.level === 'error').length} potential secret leak(s).`
      : 'No hardcoded secrets or API keys detected.',
    findings
  };
}
