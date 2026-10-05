# demon-slayer — Agent Guide

A DevOps agent crew modeled on **Demon Slayer (Kimetsu no Yaiba)**. One
interface talks to the user and dispatches specialists; the specialists do the
work. This file is the source of truth for the motif, the cast, and the roles.

## Goal

A crew of agents, each a named specialist, working DevOps themes (CI/CD, SRE,
observability, security, IaC, platform, reliability, performance, compliance).
The user talks to **one** agent — the Master — which never acts, only perceives
and dispatches. Everything else is a demon slayer.

## The motif is a UX contract

The choice of metaphor is not decoration. It decides:

- **The vocabulary in logs and status lines.** Demon Slayer contributes:
  `hunting`, `at rest`, `briefed`, `dispatched`, `wounded`.
- **Who owns a failure.** One specialist owns one domain. A broken pipeline is
  the CI/CD slayer's problem, not the crowd's.
- **What config even is.** Here it is the **Rule** of the Demon Slayers, issued
  to each agent.

The three things worth keeping from "first mate" and re-skinning:
**chain of command + a vessel + a log.**

### What Demon Slayer gives that others don't

- **The Master cannot act.** Kagaya Ubuyashiki is blind, dying, physically
  incapable of fighting. He only *sees*, *decides*, and *dispatches*. This is a
  real architectural boundary: **the front agent holds only the crows — the
  read bus and one `dispatch` that raises a seat. It cannot touch a repo, a
  cluster, or a DB.** It plays the board and issues orders. Enforceable as a
  design rule, not just flavor.
- **The Crows are a distinct role.** Dispatch and retrieval are a
  *separate layer* from the decider, so "the Master said X" is never confused
  with "X was delivered."
- **Slayers are peers with autonomy.** Each takes an assignment and chooses
  its own method; it reports back, it is not micro-managed.

## Naming sketch

| Thing | Name |
|---|---|
| Project | `demon-slayers` |
| Master workspace | `master` — the workspace the Master works in, inside tuios |
| Seat workspace | `demon-slayers` — the slayers' workspace, in the same session |
| Orchestrator / user interface | `master` (the Master) |
| Dispatch + retrieval bus | `crows` (Crows) |
| Specialist | `slayer/<name>` |
| Constrained powerful agent | `muzzle` flag |
| Config | the **Rule** |
| Tools / credentials issued to an agent | the seat's `tools` and `grants` |

## Chain of command

```
user
  └── master        perceives + decides + dispatches. NO TOOLS.
        ├── crows  message bus: orders out, reports back
        └── slayers  specialists, autonomous, report upward
```

## The slayers

The agents, each a named specialist and a capability family. Domain is proposed;
**role is deliberately left TBD**.

| Slayer | Proposed DevOps domain | Role |
|---|---|---|
| Gyomei Himejima | Reliability, backups, DR, capacity | _TBD_ |
| Sanemi Shinazugawa | Performance, load testing, chaos engineering | _TBD_ |
| Kyojuro Rengoku | Incident response, on-call | _TBD_ |
| Giyu Tomioka | CI/CD pipelines, flow | _TBD_ |
| Tengen Uzui | Observability, telemetry, SLOs | _TBD_ |
| Shinobu Kocho | Security, vulnerability & threat research | _TBD_ |
| Muichiro Tokito | Infrastructure as code, cloud provisioning, config | _TBD_ |
| Mitsuri Kanroji | Platform engineering, DevEx, orchestration | _TBD_ |
| Obanai Iguro | Compliance, policy-as-code, supply chain | _TBD_ |
| Zenitsu Agatsuma | Knowledge base, runbook retrieval | _TBD_ |
| Tanjiro Kamado | Generalist triage + knowledge capture | the lazy generalist |
| Inosuke Hashibira | Recon: filesystem & web search, evidence gathering | the scout (read-only) |

> Domain assignments are a starting proposal, not locked. Reassign if a better
> fit emerges.

## Role definitions

Fill each section in. Template:

- **Domain:** — the class of work this seat owns.
- **Owns:** — what it is accountable for, and the failure that is its fault.
- **Tools:** — what it is issued.
- **Escalates to the Master when:** — the boundary of its authority.
- **Role:** _TBD_

### Gyomei Himejima
- **Domain:** reliability, backups, disaster recovery, capacity
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Sanemi Shinazugawa
- **Domain:** performance, load testing, chaos engineering
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Kyojuro Rengoku
- **Domain:** incident response, on-call
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Giyu Tomioka
- **Domain:** CI/CD pipelines, flow
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Tengen Uzui
- **Domain:** observability, telemetry, SLOs
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Shinobu Kocho
- **Domain:** security, vulnerability & threat research
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Muichiro Tokito
- **Domain:** infrastructure as code, cloud provisioning, config
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Mitsuri Kanroji
- **Domain:** platform engineering, DevEx, orchestration
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Obanai Iguro
- **Domain:** compliance, policy-as-code, supply chain
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Zenitsu Agatsuma
- **Domain:** knowledge base, runbook retrieval
- **Owns:** _TBD_
- **Tools:** _TBD_
- **Escalates to the Master when:** _TBD_
- **Role:** _TBD_

### Tanjiro Kamado
- **Domain:** generalist triage + knowledge capture (the runbook-keeping one)
- **Owns:** orders no specialty clearly owns — naming what the demon actually
  is, shipping the smallest correct fix, and writing down what was skipped. The
  runbook-keeping failure is his: a fix nobody can repeat.
- **Tools:** `codex` (his harness), its shell and patch tools, and the `tuios`
  bus. Exactly one skill: **ponytail** (`skills/ponytail/`, from
  <https://github.com/dietrichgebert/ponytail>). No specialty tools.
- **Escalates to the Master when:** the order lands in a Pillar's domain (he
  names it and goes `at rest`), or the smallest correct fix is still outside
  his authority.
- **Role:** the lazy generalist — triage, the smallest correct fix, the runbook.
  The first **codex** seat, and the one that proves a skill allowlist on a
  harness with no `--no-skills` flag.

### Inosuke Hashibira
- **Domain:** reconnaissance — read-only filesystem and web search, evidence gathering
- **Owns:** finding things and reporting them with evidence (paths, line numbers,
  URLs). Not fixing, not storing.
- **Tools:** `read`, `grep`, `find`, `ls`, `bash` (read-only, guarded),
  `web_search`, `fetch_url`; tuios grants `read` only. Nothing that writes exists
  in his session by construction.
- **Escalates to the Master when:** the task needs a change — he reports the
  finding and goes `at rest`; the seat that owns the domain makes the change.
- **Role:** the scout — the crew's eyes. The first real `muzzle`: a powerful
  agent under a hard read-only constraint.

## Supporting cast

| Character | Device | Use in the system |
|---|---|---|
| Kagaya Ubuyashiki | the Master, blind and dying, never fights | the orchestrator; sees, decides, dispatches |
| Crows | messenger birds | dispatch + retrieval bus; carries orders out, reports back |
| Wisteria house | safehouse with the wisteria crest | sandbox / safe environment |
| Final Selection | entry trial | onboarding gate for new agents |
| Nezuko Kamado | demon, bamboo muzzle | powerful agent under hard constraint (`muzzle` flag) |
| Genya Shinazugawa | eats demons, uses a gun | non-standard tool that breaks the system's rules to get results |
| Kanao Tsuyuri | follows orders perfectly | deterministic automation / scheduled job |

## The demons

The Demon Slayers hunt demons. In DevOps, **demons = incidents, vulnerabilities,
drift, unpatched things, outages, bad deploys.** Each slayer hunts a class.

## Log format

Field-style, one line per event:

```
time=<ts> level=INFO seat=<name> op=<verb> target=<x> dur_ms=<n>
```

## The stack (decided)

- **Where the crew lives:** the master works in a workspace called `master`;
  the slayers work in the same session, in a different workspace called
  `demon-slayers`. The master's bus runs with `--scope all` and the master pane
  holds `admin`, so it reaches the slayers' workspace; a seat holds only
  `read,write,fan`. `down` closes the master pane and the `demon-slayers`
  workspace; it never kills your session. `up` raises the Master in a new pane —
  unless it runs from a shell already inside the `master` workspace, in which
  case **that window becomes the Master**: it takes the Master's grants, is named
  `master`, any previous `master` pane is closed, and the launcher `exec`s pi in
  place.
- **Runtime:** `tuios` owns sessions, panes, agent state, workspaces, worktrees
  and hosts. Panes are the crew; we build none of that.
- **A task is a window.** One order, one task, one context. The launcher raises
  a window per task, named by its **8-hex task id**; the role and a one-line
  description live in the pane's tuios agent meta (`tuios set-agent-meta`), so
  tuios owns the state and nothing is kept in a file. `demon-slayers status`
  lists tasks (id, role, state, description); `info` lists seats (the specs, no
  state). `demon-slayers end <task>` closes one; `end-idle` closes every idle or
  done task. A message that names a live task id goes back to that task's own
  context — that is how a follow-up finds its seat. `working` is `hunting`,
  `idle`/`done` is `at rest`, `needs_input` stays `needs you`.
- **Harness:** `pi` by default, `codex` (and any other harness tuios integrates)
  per seat. Installed with `tuios integration install <harness>`; `up` runs it
  (`codex` with `--mcp`), which writes codex's `hooks.json` and registers a
  **read-only** `tuios` MCP — a seat reports by printing in its pane and the
  Master reads that, so the seat bus needs no writes. Check it with
  `tuios integration status codex`. A raised codex seat also skips codex's
  hook-trust review (`--dangerously-bypass-hook-trust`): the hooks are tuios's
  own, and the seat is raised by automation with nobody to answer the prompt.
  `tanjiro` is the codex seat. A codex seat's
  `skills` are an allowlist: the launcher installs the vendored skill into
  `CODEX_HOME/skills` and switches every other skill codex would discover off
  (`skills.config`), since codex has no `--no-skills` flag to do it for us. Each
  codex seat runs under its **own codex profile** — `codex -p <seat>`, layering
  `$CODEX_HOME/<seat>.config.toml` over the base user config. The launcher writes
  that file from the Rule: the seat's brief as `developer_instructions`, its
  skill allowlist, `project_doc_max_bytes = 0` (no `AGENTS.md`), no model unless
  the Rule names one. It shares auth, state and the base `tuios` MCP. `info`
  reads the profile to show the effective model.
- **Providers:** every agent is pinned to a provider in the Rule, passed to pi
  as `--model <provider>/<model>`. The **master** runs on **`llama-cpp`** (the
  local router), on `XHToken/Spark-X2.5-1.7B-GGUF` with a **30k** context
  window (and a matching output cap); **every slayer** runs on **`opencode-go`**,
  except a **codex** seat, which has no opencode-go provider and so inherits
  codex's base `config.toml` (the local `llama-cpp` router) through its own
  profile until one is added. A
  seat changes provider by editing its `provider` and `model` fields; for a
  codex seat the launcher writes them into its profile. A seat's
  `context_window` is kept in step in pi's `models.json` (`modelOverrides`) by
  the launcher.
- **Bus (crows):** the `tuios` MCP server with `--write --scope all`. The crows
  are tuios verbs: `tuios_ask_agent` (order out, report back, across sessions),
  `tuios_send_agent_message` + `tuios_read_agent_messages` (mail),
  `tuios_wait_for` + `tuios_capture_pane` (wait for a pane to rest, read what it
  printed).
- **Routing is also programmatic.** `extensions/slayer.ts` hooks pi's `input`
  event. The Rule's `tags` (per seat) and `lexicon` (word → tag) are written by
  the launcher to `routing.json` and handed to the Master as
  `DEMON_SLAYERS_ROUTING` — one source, no copy in the extension. A message
  becomes tags; the seats owning them are the candidates, ranked by matched tags,
  then specificity (longest matched word), then roster order. A seat named
  outright — or a close typo (`tanjio` → `tanjiro`), by bounded
  Damerau-Levenshtein with a first-letter guard — is the only candidate. One
  candidate is dispatched before the model is asked anything; several raise a
  `ctx.ui.select` picker showing each candidate's matched words, plus `tanjiro`
  and "let the Master decide"; none falls through to the model. The address is
  stripped first (`tanjiro, what time is it?` → `what time is it?`): the name is
  how the order was routed, not part of it. The order is echoed as a `you → seat`
  message, so the typed request stays on screen while the seat works. The report
  is read from the seat's own **session file** — pi's under `~/.pi/agent/sessions`,
  a codex seat's rollout under `~/.codex/sessions` — not
  its pane, which holds only the last screenful of a full-screen TUI. The `dispatch` tool stays for a Master whose model can
  tool-call; the input path is what works when it will not. A message in no
  seat's domain falls through to the model.
- **The Master's constraint:** enforced with pi's `--tools` allowlist — the
  `mcp__tuios__*` bus tools for reading, plus `dispatch`, the one crow that can
  raise a seat. No `read`, `bash`, `edit` or `write` exists in its session.
  `demon_slayers.py` records the list; `extensions/slayer.ts` implements
  `dispatch` (it calls the `demon-slayers` launcher, which owns the recipe) and
  the programmatic routing above.
- **The Rule:** `demon_slayers.py`. The launcher: `demon-slayers`.
- **A seat's constraint:** a pane with `--grants`, `--tools`, `--skill` and
  `--model` (built from the seat's `provider` + `model`). This is what `muzzle`
  becomes once it is real.

## Decisions on the open questions

- **Which slayers are used:** every seat is defined and **on demand**. `up`
  raises only the Master; the Master's `dispatch` raises a seat the first time
  an order names it and reuses it after. `demon-slayers task --to <name> --desc
  <text>` raises one from the shell.
- **Knowledge base:** the `knowledge-base` binary (Zig, source at
  `~/knowledge-base-in-zig`), SQLite + web UI + MCP at `http://127.0.0.1:9876`.
  A user systemd unit exists but is not enabled. Seat `zenitsu` keeps it and
  does nothing else. `tanjiro` is the `slayers` entry that proves the codex
  harness: one skill (ponytail), no specialty, on demand like the rest.
- **`muzzle`:** first made real on the scout (`inosuke`): a seat-scoped `tools`
  allowlist plus a seat-only extension that blocks shell writes. `--grants` +
  `--tools` is still the general intent.
