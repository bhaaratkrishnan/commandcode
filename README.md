# commandcode

Command Code mods by [bhaaratkrishnan](https://github.com/bhaaratkrishnan).

## Install

```bash
cmd mods add bhaaratkrishnan/commandcode
```

## Mods

### herdr-desktop

Shows Command Code as an agent in the [Herdr](https://herdr.dev) desktop app, with live status.

The new Herdr stack (herdr-app + herdr-core) detects agents through the terminal-native
[OSC 7501 Program Status Protocol](https://mitchellh.com/writing/program-status-osc7501)
instead of the old herdr v0.9.x socket API that Command Code's built-in herdr reporter
speaks, so a stock Command Code session never shows up in the Agents sidebar. This mod
closes that gap from the outside — no patched dist files, survives Command Code updates.

It observes the agent lifecycle and writes `ESC]7501;state=<state>[:kind=<kind>]:app=command-code ESC\`
to the terminal:

| State | When |
|---|---|
| `idle` | session open, nothing running |
| `working` | a run or compaction is in progress |
| `blocked` | waiting on you, `kind=permission` or `kind=question` |
| `clear` | session ended (removes the agent entry) |

- `/herdr-osc` shows the state currently being reported.
- Set `CMD_HERDR=0` to disable it.
- Nothing is emitted when stdout is not a TTY (headless runs, pipes).

Verified end to end against herdr-core: the pane registers as `command-code` and cycles
`idle → working → blocked(permission) → working → idle`.
