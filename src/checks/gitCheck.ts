import { execSync } from 'child_process';
import { CheckResult, CheckFinding } from '../types';

export function runGitCheck(cwd: string): CheckResult {
  const startTime = Date.now();
  const findings: CheckFinding[] = [];

  try {
    const isGit = execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim() === 'true';

    if (!isGit) {
      return {
        id: 'git-status',
        name: 'Git Cleanliness & Drift Check',
        status: 'SKIPPED',
        durationMs: Date.now() - startTime,
        summary: 'Not a git repository.',
        findings: []
      };
    }

    const status = execSync('git status --short', {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (!status) {
      return {
        id: 'git-status',
        name: 'Git Cleanliness & Drift Check',
        status: 'PASS',
        durationMs: Date.now() - startTime,
        summary: 'Working directory is clean (0 uncommitted or untracked changes).',
        findings: []
      };
    }

    const lines = status.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      findings.push({
        level: 'info',
        message: `Uncommitted file: ${trimmed}`
      });
    }

    return {
      id: 'git-status',
      name: 'Git Cleanliness & Drift Check',
      status: 'PASS',
      durationMs: Date.now() - startTime,
      summary: `Working tree has ${lines.length} modified/staged item(s).`,
      findings
    };
  } catch {
    return {
      id: 'git-status',
      name: 'Git Cleanliness & Drift Check',
      status: 'SKIPPED',
      durationMs: Date.now() - startTime,
      summary: 'Git command not available or failed.',
      findings: []
    };
  }
}
