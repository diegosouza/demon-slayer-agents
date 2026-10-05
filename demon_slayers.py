"""The Rule — the Demon Slayers roster and what each seat is issued.

The one place that maps a Demon Slayer character to a DevOps role, a harness,
a model, skills and MCPs. `demon-slayers` imports it and raises
the panes in a tuios session. Nothing here runs until `demon-slayers up`.

Fields shared by every seat:

    character  the name shown to the person
    domain     the class of work this seat owns
    tags       the capability tags this seat claims; the router maps a message's
               words to tags (the top-level `lexicon`) and offers the owners
    harness    "pi" | "codex" | "claude-code"
    provider   the provider the seat is pinned to (with `model`, becomes the
               pi `--model provider/model` flag); "" = the harness default
    model      the model id within `provider`; "" = the provider default
    context_window
               when set, the model's context window is kept in step in pi's
               models.json (modelOverrides); omitted = whatever the model says
    skills     modules loaded into the agent. For a pi seat a
               name passed as `--skill`; for a codex seat the allowlist of skills
               the seat may see, vendored under skills/ and installed into
               CODEX_HOME (everything else codex would discover is switched off)
    mcps       integrations the seat may use (tuios is the bus)
    tools      when set, the pi `--tools` allowlist: the only tools the seat has
               (the scout is read-only); omitted = pi's defaults
    extensions seat-only pi extensions to load, paths relative to this repo
               (the scout's web tools and write guard)
    active     seat it on plain `demon-slayers up`; every seat is raised on
               demand now, so all are false by default
"""

RULE = {
    "session": {
        "master_name": "demon-slayers-master",  # created only if no session has the master workspace
        "master_workspace": "master",           # the master session is the one with this workspace
        "seat_workspace": "demon-slayers",      # the seats' workspace, in the master's own session
        "cwd": ".",                             # relative to this file
    },

    # MCP servers a seat may be issued. `command` is a stdio server, `url` an
    # HTTP one; `start` is opened in its own tuios pane when the server is not
    # already listening. `exposure` is how pi declares the tools: direct =
    # callable as tools, codemode = reachable only from scripts.
    "mcp": {
        "tuios": {
            "command": ["tuios", "mcp", "--write", "--scope", "all"],
            "exposure": "direct",
        },
        "knowledge-base": {
            "url": "http://127.0.0.1:9876/mcp",
            "exposure": "direct",
            "start": ["knowledge-base",
                      "/home/diego/knowledge-base-in-zig/knowledge-base.sqlite",
                      "--port", "9876"],
        },
    },

    # The Master. Sees, decides, dispatches. No tool that touches the world —
    # only the crows. Brief: agents/master.md.
    "master": {
        "name": "master",
        "harness": "pi",
        "provider": "llama-cpp", "model": "XHToken/Spark-X2.5-1.7B-GGUF",
        "context_window": 30000,
        "brief": "agents/master.md",
        "grants": ["read", "write", "fan", "admin"],   # admin: its bus reaches the seat session
        "tools": [                            # the ONLY pi tools the Master is issued
            "dispatch",                       # the crow: raises a seat, asks it, reports back
            "mcp__tuios__tuios_list_agents",
            "mcp__tuios__tuios_get_agent_state",
            "mcp__tuios__tuios_wait_for",
            "mcp__tuios__tuios_send_agent_message",
            "mcp__tuios__tuios_read_agent_messages",
            "mcp__tuios__tuios_capture_pane",
            "mcp__tuios__tuios_peek_prompt",
        ],
    },

    # Capability tags, and the words that name them. A seat owns a tag; the
    # router turns a message into tags and dispatches to their owners. A tag
    # with one owner is deterministic; two tags matched is the picker's job.
    # Keys are the vocabulary, values are regex sources (word-bounded at match).
    "lexicon": {
        "reliability": [r"restore", r"disaster recovery", r"failover",
                        r"redundan\w*", r"reliab\w*"],
        "backups": [r"backups?", r"restore"],
        "capacity": [r"capacity", r"scaling", r"headroom"],
        "performance": [r"performance", r"latenc\w*", r"benchmarks?", r"stress",
                        r"throughput", r"hotspots?"],
        "load-testing": [r"load ?test\w*", r"chaos"],
        "incident-response": [r"incidents?", r"outages?", r"sev[0-9]",
                              r"firefight\w*", r"postmortems?"],
        "on-call": [r"on ?call", r"pages?", r"alerts?"],
        "ci-cd": [r"ci\/?cd", r"pipelines?", r"builds?", r"deploy\w*",
                  r"github actions?"],
        "releases": [r"releases?", r"rollbacks?"],
        "observability": [r"observab\w*", r"telemetry", r"metrics?", r"logs?",
                          r"traces?", r"monitor\w*", r"dashboards?"],
        "slo": [r"slos?", r"slis?"],
        "security": [r"secur\w*", r"threats?", r"exploits?", r"pen ?test\w*"],
        "vulnerability": [r"vulnerab\w*", r"cve", r"unpatched"],
        "secrets": [r"secrets?", r"credentials?", r"auth\w*"],
        "iac": [r"iac", r"terraform", r"provision\w*", r"infra\w*", r"config\w*",
                r"cloud"],
        "kubernetes": [r"kubernetes", r"k8s"],
        "platform": [r"platform", r"developer experience", r"self.?service",
                     r"orchestrat\w*", r"templates?"],
        "devex": [r"devex"],
        "compliance": [r"complian\w*", r"audits?", r"soc ?2", r"gdpr"],
        "supply-chain": [r"supply ?chain", r"sbom", r"licen[sc]e"],
        "knowledge-base": [r"knowledge ?base", r"kb", r"faqs?", r"entries?",
                           r"documents?"],
        "runbooks": [r"runbooks?", r"notes?", r"journals?"],
        "recon": [r"recon\w*", r"research\w*", r"look ?up",
                  r"search the (?:web|internet)", r"web ?search", r"internet",
                  r"online", r"google", r"duckduckgo", r"locate",
                  r"where(?:'s| is)", r"find the file"],
        "search": [r"scout", r"filesystem", r"file ?system"],
    },

    # --- the nine Pillars ----------------------------------------------------
    "pillar": {
        "gyomei": {
            "name": "gyomei", "character": "Gyomei Himejima",
            "domain": "reliability, backups, disaster recovery, capacity",
            "tags": ["reliability", "backups", "capacity"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
        "sanemi": {
            "name": "sanemi", "character": "Sanemi Shinazugawa",
            "domain": "performance, load testing, chaos engineering",
            "tags": ["performance", "load-testing"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
        "kyojuro": {
            "name": "kyojuro", "character": "Kyojuro Rengoku",
            "domain": "incident response, on-call",
            "tags": ["incident-response", "on-call"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
        "giyu": {
            "name": "giyu", "character": "Giyu Tomioka",
            "domain": "CI/CD pipelines, flow",
            "tags": ["ci-cd", "releases"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
        "tengen": {
            "name": "tengen", "character": "Tengen Uzui",
            "domain": "observability, telemetry, SLOs",
            "tags": ["observability", "slo"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
        "shinobu": {
            "name": "shinobu", "character": "Shinobu Kocho",
            "domain": "security, vulnerability and threat research",
            "tags": ["security", "vulnerability", "secrets"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
        "muichiro": {
            "name": "muichiro", "character": "Muichiro Tokito",
            "domain": "infrastructure as code, cloud provisioning, config",
            "tags": ["iac", "kubernetes"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
        "mitsuri": {
            "name": "mitsuri", "character": "Mitsuri Kanroji",
            "domain": "platform engineering, DevEx, orchestration",
            "tags": ["platform", "devex"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
        "obanai": {
            "name": "obanai", "character": "Obanai Iguro",
            "domain": "compliance, policy-as-code, supply chain",
            "tags": ["compliance", "supply-chain"],
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [], "mcps": ["tuios"],
            "active": False,
        },
    },

    # --- the slayers -----------------------------------------------------------
    "slayers": {
        "zenitsu": {
            "name": "zenitsu", "character": "Zenitsu Agatsuma",
            "role": "keeper of the knowledge base — stores and retrieves what the Demon Slayers learn",
            "domain": "knowledge base: capture, search, retrieve",
            "tags": ["knowledge-base", "runbooks"],
            "brief": "agents/zenitsu.md",
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [],
            "mcps": ["tuios", "knowledge-base"],
            "active": False,
        },
        "tanjiro": {
            "name": "tanjiro", "character": "Tanjiro Kamado",
            "role": "generalist triage; the smallest correct fix, then the runbook",
            "domain": "triage, synthesis, knowledge capture",
            "tags": [],
            "brief": "agents/tanjiro.md",
            # codex, not pi: the seat is issued one skill (ponytail) and nothing
            # else. provider/model empty = codex's own config (see README).
            "harness": "codex", "provider": "", "model": "",
            "skills": ["ponytail"], "mcps": ["tuios"],
            "active": False,
        },
        "inosuke": {
            "name": "inosuke", "character": "Inosuke Hashibira",
            "role": "scout — read-only recon over the filesystem and the web",
            "domain": "recon: filesystem and web search, evidence gathering (read-only)",
            "tags": ["recon", "search"],
            "brief": "agents/inosuke.md",
            "harness": "pi", "provider": "opencode-go", "model": "deepseek-v4.1-flash",
            "skills": [],
            "mcps": [],
            "tools": ["read", "grep", "find", "ls", "bash", "web_search", "fetch_url"],
            "extensions": ["extensions/scout.ts"],
            "grants": ["read"],
            "active": False,
        },
    },
}
