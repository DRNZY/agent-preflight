export type CheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'SKIPPED';

export interface CheckFinding {
  level: 'info' | 'warn' | 'error';
  message: string;
  file?: string;
  line?: number;
  snippet?: string;
}

export interface CheckResult {
  id: string;
  name: string;
  status: CheckStatus;
  durationMs: number;
  summary: string;
  findings: CheckFinding[];
}

export interface PreflightOptions {
  cwd?: string;
  strict?: boolean;
  skipTests?: boolean;
  skipTypes?: boolean;
  skipSecrets?: boolean;
  skipHygiene?: boolean;
  skipGit?: boolean;
  verbose?: boolean;
}

export interface PreflightReport {
  targetDir: string;
  timestamp: string;
  durationMs: number;
  overallStatus: CheckStatus;
  passedCount: number;
  warnCount: number;
  failCount: number;
  results: CheckResult[];
}
