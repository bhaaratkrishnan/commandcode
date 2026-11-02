# herdr-desktop

Shows Command Code as an agent in the [Herdr](https://herdr.dev) desktop app, with live
status. Mod name: `herdr-osc`.

## Why

The new Herdr stack (`herdr-app` + `herdr-core`) detects agents through the terminal-native
[OSC 7501 Program Status Protocol](https://mitchellh.com/writing/program-status-osc7501) —
the program prints an escape sequence and the terminal reads it from the PTY. Command Code's
built-in herdr reporter instead speaks the old herdr v0.9.x socket protocol
(`pane.report_agent` over `HERDR_SOCKET_PATH`, gated on `HERDR_ENV`/`HERDR_PANE_ID` env vars
that herdr-core never sets), so a stock Command Code session never shows up in Herdr's
Agents sidebar.

This mod closes that gap from the outside: no patched dist files, nothing to re-apply after
a Command Code update.

## What it reports

It observes the agent lifecycle and writes to the terminal:

```
ESC ] 7501 ; state=<state>[:kind=<kind>]:app=command-code ESC \
```

| State | When |
|---|---|
| `idle` | session open, nothing running |
| `working` | a run or compaction is in progress |
| `blocked` | waiting on you — `kind=permission` or `kind=question` |
| `clear` | session ended (removes the agent entry from the sidebar) |

Events observed: `run_start`/`run_end`, `compaction_start`/`compaction_done`,
`interaction_requested`/`interaction_resolved` (permission/question), plus a `session_start`
reset. `cmd.hooks({onSessionEnd})` emits the `clear`.

## Install

From this repo (project scope — loads after you trust the workspace):

```bash
cmd mods add bhaaratkrishnan/commandcode
```

Or for all projects (user scope):

```bash
cmd mods add -g bhaaratkrishnan/commandcode
```

Or as a single file, no package:

```bash
cp mods/herdr-desktop/herdr-osc.ts ~/.commandcode/mods/herdr-osc.ts
```

Pick **one** of the three — installing the package and the loose file together loads two
copies of the same mod (duplicate `/herdr-osc`, duplicate status reports).

## Usage

- `/herdr-osc` — show the state currently being reported.
- `CMD_HERDR=0` — disable the mod entirely.
- Nothing is emitted when stdout is not a TTY (headless runs, pipes).

## Verified

End to end against herdr-core: a fresh Command Code session registers as agent
`command-code` and cycles `idle → working → blocked(permission) → working → idle`, then
clears on exit.

Tested with Command Code 1.88.2 and herdr-core 0.1.16.
