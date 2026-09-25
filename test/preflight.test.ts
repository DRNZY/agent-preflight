import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runPreflight, runSecretsCheck, runHygieneCheck, runTypesCheck } from '../src/index';

describe('Agent Preflight Engine', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-preflight-test-'));

    // Create a clean ts project
    fs.writeFileSync(
      path.join(tmpDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { target: 'ES2022', module: 'commonjs', strict: true, noEmit: true }
      }),
      'utf8'
    );

    fs.writeFileSync(
      path.join(tmpDir, 'clean.ts'),
      'export function sum(a: number, b: number): number { return a + b; }\n',
      'utf8'
    );
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('passes all checks on a clean TypeScript project', () => {
    const report = runPreflight({ cwd: tmpDir, skipTests: true });
    assert.strictEqual(report.overallStatus, 'PASS');
    assert.ok(report.passedCount >= 3);
    assert.strictEqual(report.failCount, 0);
  });

  it('detects dangerous hardcoded API keys', () => {
    const dirtyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-secret-test-'));
    fs.writeFileSync(
      path.join(dirtyDir, 'config.ts'),
      'const apiKey = "AIzaSyD-1234567890abcdefghijklmnopqrstuv";\n',
      'utf8'
    );

    const result = runSecretsCheck(dirtyDir);
    assert.strictEqual(result.status, 'FAIL');
    assert.ok(result.findings.some(f => f.message.includes('Google API Key')));

    fs.rmSync(dirtyDir, { recursive: true, force: true });
  });

  it('detects leftover debugger and focused test statements', () => {
    const dirtyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-hygiene-test-'));
    fs.writeFileSync(
      path.join(dirtyDir, 'sample.ts'),
      'function test() { debugger; }\n',
      'utf8'
    );

    const result = runHygieneCheck(dirtyDir);
    assert.strictEqual(result.status, 'FAIL');
    assert.ok(result.findings.some(f => f.message.includes('Debugger Statement')));

    fs.rmSync(dirtyDir, { recursive: true, force: true });
  });

  it('flags TypeScript compilation errors correctly', () => {
    const brokenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-type-test-'));
    fs.writeFileSync(
      path.join(brokenDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'commonjs', strict: true, noEmit: true } }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(brokenDir, 'broken.ts'),
      'const a: number = "this is a string";\n',
      'utf8'
    );

    const result = runTypesCheck(brokenDir);
    assert.strictEqual(result.status, 'FAIL');
    assert.ok(result.findings.length > 0);

    fs.rmSync(brokenDir, { recursive: true, force: true });
  });
});
