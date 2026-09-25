# agent-preflight

Automated pre-flight verification, type checking, secret scanning, and quality gates for autonomous coding agents.

## Overview

A strict pre-flight gate designed to run before an agent commits code, creates pull requests, or completes tasks. It verifies that generated changes compile, pass tests, contain no hardcoded secrets, and adhere to workspace rules.

## Features

- **Secret Detection**: Scans modified files for API keys, bearer tokens, and credentials.
- **Build & Type Verification**: Validates TypeScript, Rust, Go, or Python workspaces automatically.
- **Zero-False-Positive Policy**: Designed for reliable headless execution in agent loops.

## Installation

```bash
npm install
npm run build
```

## License

MIT
