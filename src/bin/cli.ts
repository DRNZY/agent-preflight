#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { runPreflight } from '../runner';
import { CheckStatus } from '../types';

const program = new Command();

program
  .name('agent-preflight')
  .description('🛡️ Automated Pre-Flight Verification & Quality Gate for Coding Agents')
  .version('1.0.0')
  .argument('[targetDir]', 'Target repository directory (defaults to current directory)', process.cwd())
  .option('-s, --strict', 'Strict mode: fail on warnings as well as errors', false)
  .option('--skip-tests', 'Skip running unit/integration test suites', false)
  .option('--skip-types', 'Skip TypeScript static type check', false)
  .option('--skip-secrets', 'Skip hardcoded secret scanner', false)
  .option('--skip-hygiene', 'Skip code hygiene checks', false)
  .option('-v, --verbose', 'Show full diagnostic findings', false)
  .action((targetDir, options) => {
    console.log(chalk.bold.cyan(`\n🛫 Running Agent Pre-Flight Verification on:`));
    console.log(chalk.dim(`   ${targetDir}\n`));

    const report = runPreflight({
      cwd: targetDir,
      strict: options.strict,
      skipTests: options.skipTests,
      skipTypes: options.skipTypes,
      skipSecrets: options.skipSecrets,
      skipHygiene: options.skipHygiene,
      verbose: options.verbose
    });

    for (const res of report.results) {
      let badge = '';
      if (res.status === 'PASS') {
        badge = chalk.bgGreen.black.bold(' PASS ');
      } else if (res.status === 'WARN') {
        badge = chalk.bgYellow.black.bold(' WARN ');
      } else if (res.status === 'FAIL') {
        badge = chalk.bgRed.white.bold(' FAIL ');
      } else {
        badge = chalk.bgGray.white(' SKIP ');
      }

      console.log(`${badge} ${chalk.bold.white(res.name)} ${chalk.dim(`(${res.durationMs}ms)`)}`);
      console.log(`       ${chalk.dim(res.summary)}`);

      if (res.findings.length > 0 && (res.status === 'FAIL' || res.status === 'WARN' || options.verbose)) {
        for (const finding of res.findings) {
          const prefix = finding.level === 'error' ? chalk.red('✖') : (finding.level === 'warn' ? chalk.yellow('⚠') : chalk.blue('ℹ'));
          const loc = finding.file ? ` [${finding.file}${finding.line ? `:${finding.line}` : ''}]` : '';
          console.log(`         ${prefix}${chalk.gray(loc)} ${finding.message}`);
          if (finding.snippet && options.verbose) {
            console.log(`           ${chalk.dim(finding.snippet)}`);
          }
        }
      }
      console.log('');
    }

    console.log(chalk.bold('═════════════════════════════════════════════════════════════════'));
    if (report.overallStatus === 'PASS') {
      console.log(chalk.bold.green(`✔ PRE-FLIGHT PASSED (${report.durationMs}ms) — Clean to commit and complete.`));
      process.exit(0);
    } else if (report.overallStatus === 'WARN') {
      console.log(chalk.bold.yellow(`⚠ PRE-FLIGHT PASSED WITH WARNINGS (${report.durationMs}ms) — Review warnings above.`));
      process.exit(0);
    } else {
      console.log(chalk.bold.red(`✖ PRE-FLIGHT FAILED (${report.durationMs}ms) — Address blocking errors before completion.`));
      process.exit(1);
    }
  });

program.parse(process.argv);
