# demon-slayers — a DevOps agent crew

A crew of DevOps agents on [tuios]. One Master (`master`) perceives, decides
and dispatches; nine Pillars do the work. `AGENTS.md` holds the motif and the
cast; `demon_slayers.py` is the Rule.

## Layout

    demon_slayers.py   the Rule: roster, MCPs, harness, provider, model, skills
    demon-slayers      the launcher (raises the panes in a tuios session)
    agents/master.md   Master brief — no tools but the crows
    agents/seat.md     seat brief — autonomy, domain, the crows, how to report
    agents/zenitsu.md  Zenitsu's one job — the knowledge base
    agents/tanjiro.md  Tanjiro's one job — triage with ponytail (codex seat)
    skills/ponytail/   the ponytail skill, vendored for the codex seat

## Raise it

    ./demon-slayers up              # master only; seats are raised on demand
    ./demon-slayers up              # raise the Master only
    ./demon-slayers task --to shinobu --desc "why"   # raise one task by hand
    ./demon-slayers status          # every task: id, role, state, description
    ./demon-slayers info            # every seat's specs: harness, model, tags, skills
    ./demon-slayers info tanjiro     # one seat in full (--json to script it)
    ./demon-slayers end <task>      # close one task's window
    ./demon-slayers end-idle        # close every idle/done task window
    ./demon-slayers attach          # talk to the Master
    ./demon-slayers down

`up` installs the tuios integrations (pi, plus codex when present), registers
every seat's MCP servers with pi, and opens any that are not already running.
The **master** joins the session you run it from, on a `master` workspace; the
**seats** live in the same session, in the `demon-slayers` workspace, and are
raised by the Master when an order first needs them. From a plain terminal it
finds or creates the master session. Run `up` from a shell already in the
`master` workspace and that window *becomes* the Master, named `master`, with no
second pane. `DEMON_SLAYERS_DRY=1 ./demon-slayers up` prints the commands instead.

## Talk to it

Go to the `master` workspace of your session and type in the `master` pane. State
the task; the Master raises a **task window** for the one seat whose domain owns
it, dispatches, and returns the report. (`./demon-slayers attach` attaches to the
master session when you are outside tuios.)

The router is tag-based: each seat claims `tags` in the Rule, and a `lexicon`
maps the words in your message to those tags. The launcher writes both to
`routing.json` and hands it to the Master. One seat matching dispatches directly;
if two could own it, a picker lists them with the words each matched, plus
`tanjiro` and "let the Master decide". Name a seat (or typo it, `tanjio`) and it
goes straight there. `./demon-slayers info` shows every seat's tags.

A **task is a window**: one order, one context, named by its 8-hex task id. The
Master's echo shows it (`you → giyu · 46179a76`). `./demon-slayers status` lists
every task — id, role, `hunting` or `at rest`, and its one-line description.
Mention a live task id in a new message and it goes back to that same context.
`./demon-slayers end <task>` closes one; `./demon-slayers end-idle` closes every
idle or done task, so the next order starts from an empty context.

`down` closes the master pane and every task — it never kills your session.

## The seats

`zenitsu` keeps the knowledge base and nothing else. The server is the
`knowledge-base` binary on `$PATH`
(`~/.local/bin/knowledge-base` → `~/knowledge-base-in-zig/zig-out/bin/knowledge-base`),
serving the web UI and MCP at `http://127.0.0.1:9876`. `demon-slayers up` registers the
MCP with pi and starts the server in a pane if it is not already listening; the
seat itself is raised on demand like the rest.

A user systemd unit is installed at
`~/.config/systemd/user/knowledge-base.service` and left **disabled**:
`systemctl --user start knowledge-base` runs it; `systemctl --user enable
knowledge-base` would start it at login.

`tanjiro` is the **codex** seat: generalist triage with exactly one skill,
`ponytail` (vendored at `skills/ponytail/`, from
<https://github.com/dietrichgebert/ponytail>). Codex has no `--no-skills` flag,
so the launcher installs the vendored skill into `CODEX_HOME/skills` and
switches every other skill codex would discover off with `skills.config`.

Each codex seat also runs under its own **codex profile**: `codex -p <seat>`
layers `$CODEX_HOME/<seat>.config.toml` over the base user config. The launcher
writes that file from the Rule — the seat's brief, its skill allowlist, no
`AGENTS.md` — and the seat shares auth, state and the base `tuios` MCP.
`./demon-slayers info` shows the effective model it resolves to.

Everyone is pinned to a provider. The **master** runs on `llama-cpp` (the local
router; start it before `up`) with `XHToken/Spark-X2.5-1.7B-GGUF` at a 30k
context window and matching output cap; the **slayers** run on `opencode-go`. The Rule names each seat's
`provider`, `model` and optional `context_window`; `up` passes the first two as
`--model <provider>/<model>` and writes the context window into pi's
`models.json` (`modelOverrides`). A codex seat (`tanjiro`) has no opencode-go
provider, so with `provider` and `model` empty it inherits codex's base
`config.toml` through its profile.

## Not built yet

Most seats' `skills` are empty on purpose (`demon_slayers.py`); map them as the
work becomes real. `tanjiro` is the first with one.
