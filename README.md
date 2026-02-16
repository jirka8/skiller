# Skiller

Terminal skills manager for the [skills.sh](https://skills.sh) ecosystem.

Manage AI agent skills across Claude Code, Cursor, Windsurf, GitHub Copilot, and 30+ other agents — all from one interactive CLI.

## Features

- **Search & Install** — find skills on skills.sh and install them for selected agents
- **List** — see all installed skills across agents with source and scope info
- **Remove** — uninstall skills with multiselect
- **Check & Update** — detect and apply available updates
- **Move** — change skill scope (global/project) or reassign to different agents
- **Deactivate / Reactivate** — temporarily disable skills without uninstalling (custom feature)
- **Dashboard** — overview of all detected agents, skill counts, and recent activity
- **Settings & Info** — system diagnostics, paths, detected agents

## Requirements

- Node.js >= 18
- npm (for `npx skills` commands)

## Install

```bash
# Clone and install
git clone https://github.com/jirka8/skiller.git
cd skiller
npm install

# Run in development
npm run dev

# Build and use globally
npm run build
npm link
skiller
```

## Usage

Launch the interactive menu:

```bash
npm run dev
```

The main menu provides 9 actions:

```
┌─────────────────────────────────────┐
│  Skiller - Skills Manager           │
├─────────────────────────────────────┤
│  1. Search & Install Skills         │
│  2. List Installed Skills           │
│  3. Remove Skills                   │
│  4. Check for Updates               │
│  5. Update Skills                   │
│  6. Move Skills                     │
│  7. Deactivate / Reactivate         │
│  8. Dashboard                       │
│  9. Settings & Info                 │
│  0. Exit                            │
└─────────────────────────────────────┘
```

### Search & Install

Search the skills.sh registry, pick a skill, choose scope (global or project), select target agents, and install.

```
? Search for skills: typescript
? Select a skill to install: ts-best-practices
? Install scope: Global (available everywhere)
? Install for which agents: Claude Code, Cursor
✔ Installed successfully!
```

### Deactivate / Reactivate

Unique to Skiller — temporarily disable skills by moving them to `.disabled/` directories. The original agent symlinks and paths are tracked in a manifest (`~/.agents/.disabled-skills.json`), so reactivation restores everything exactly as it was.

### Dashboard

Quick overview of your entire skills setup:

```
Detected Agents (4)
  Claude Code    3 global, 1 project
  Cursor         3 global
  Windsurf       2 global
  GitHub Copilot 1 global

Skills Summary
  Total unique skills: 4
  Global: 3  Project: 1
  Lock file entries: 4
```

## Architecture

```
src/
├── index.ts              # Entry point, main menu loop
├── menu.ts               # Menu definition and routing
├── types.ts              # All TypeScript types
├── constants.ts          # Agent registry (38 agents), paths, API URL
├── utils/
│   ├── paths.ts          # Home dir, config paths
│   ├── format.ts         # Output formatting
│   └── process.ts        # Subprocess wrapper
├── core/
│   ├── lock-file.ts      # Read ~/.agents/.skill-lock.json
│   ├── filesystem.ts     # Scan skill dirs, parse SKILL.md
│   ├── agents.ts         # Agent detection, dir mapping
│   └── skills-cli.ts     # npx skills wrapper + HTTP search
├── features/
│   ├── search.ts         # Search & install
│   ├── list.ts           # List installed
│   ├── remove.ts         # Remove skills
│   ├── check.ts          # Check for updates
│   ├── update.ts         # Apply updates
│   ├── move.ts           # Move between scopes/agents
│   ├── deactivate.ts     # Deactivate / reactivate
│   ├── dashboard.ts      # Overview dashboard
│   └── settings.ts       # System info
└── __tests__/            # Unit tests
```

### Design principles

- **READ path** (fast, direct filesystem): lock file, skill directories, agent detection
- **WRITE path** (npx skills subprocess): install, remove, update — preserves lock file and symlink compatibility
- **Search**: direct HTTP `GET https://skills.sh/api/search`
- **Deactivation**: custom feature using `.disabled/` directories with a restore manifest

## Supported Agents

Skiller detects and manages skills for 38 agents including:

| Agent | Project skills dir | Global skills dir |
|---|---|---|
| Claude Code | `.claude/skills` | `~/.claude/skills` |
| Cursor | `.cursor/skills` | `~/.cursor/skills` |
| Windsurf | `.windsurf/skills` | `~/.codeium/windsurf/skills` |
| GitHub Copilot | `.agents/skills` | `~/.copilot/skills` |
| Amp | `.agents/skills` | `~/.amp/skills` |
| Codex | `.agents/skills` | `~/.codex/skills` |
| Gemini CLI | `.agents/skills` | `~/.gemini/skills` |
| Aider | `.aider/skills` | `~/.aider/skills` |
| Cline | `.cline/skills` | `~/.cline/skills` |
| Roo Code | `.roo/skills` | `~/.roo/skills` |
| Continue | `.continue/skills` | `~/.continue/skills` |
| _...and 27 more_ | | |

Run `Settings & Info` in Skiller to see all detected agents on your system.

## Development

```bash
npm run dev        # Run with tsx
npm test           # Run tests (vitest)
npm run typecheck  # TypeScript check
npm run build      # Build with tsup
```

## Tech Stack

- **TypeScript** + **Node.js >= 18** (ESM)
- **@clack/prompts** — interactive terminal UI
- **gray-matter** — SKILL.md frontmatter parsing
- **picocolors** — terminal colors
- **tsup** — bundler
- **vitest** — testing

## License

MIT
