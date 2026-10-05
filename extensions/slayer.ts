/**
 * The Crows — dispatch from the Master to a seat.
 *
 * The tuios bus cannot start a pane, so the Master cannot raise a seat with
 * `tuios_ask_agent` alone: that verb needs a pane that already exists. This
 * extension fills the gap. It starts the seat with the `demon-slayers` launcher
 * (which owns the Rule: harness, provider, model, brief, grants), then asks it,
 * and returns what the seat printed. The seat stays up for the next order.
 *
 * Two paths reach the same dispatch:
 *
 *   1. The `dispatch` tool, for a Master whose model can tool-call.
 *   2. The `input` handler: on a user message that names a seat's domain, route
 *      to that seat and dispatch it, showing the report directly. This is the
 *      path that works on a weak local model, which will not pick a tool. The
 *      routing is deterministic on purpose: tags from the Rule, a picker only
 *      when two seats match; see `candidates`.
 *
 * Loaded only into the Master: `pi ... --extension extensions/slayer.ts`. The
 * launcher passes the paths and session in the environment.
 */
import { execFile } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const run = promisify(execFile);

/** What the launcher tells this extension: where the seats live and who raises them. */
type Crows = { launcher: string; session: string };

function crows(): Crows {
	return {
		launcher: process.env.DEMON_SLAYERS_LAUNCHER || "demon-slayers",
		session: process.env.DEMON_SLAYERS_SEAT_SESSION || "demon-slayers",
	};
}

const DispatchParams = Type.Object({
	seat: Type.String({
		description:
			"The seat to order, by the name the roster lists: gyomei, giyu, zenitsu, ... " +
			"A close typo (tanjio, inoske) is accepted.",
	}),
	order: Type.String({
		description: "The order: the goal and the evidence you want, not the method. One seat, one order.",
	}),
	timeout_ms: Type.Optional(
		Type.Number({ description: "How long to wait for the report, in ms. Default 300000." }),
	),
});

async function exec(cmd: string, args: string[], timeout: number): Promise<string> {
	try {
		const { stdout, stderr } = await run(cmd, args, { timeout, maxBuffer: 32 * 1024 * 1024 });
		return [stdout, stderr].filter(Boolean).join("\n").trim();
	} catch (error) {
		const e = error as { stdout?: string; stderr?: string; message?: string };
		const detail = [e.stdout, e.stderr, e.message].filter(Boolean).join("\n").trim();
		throw new Error(detail || `${cmd} ${args.join(" ")} failed`);
	}
}

// A seat runs pi's full-screen TUI, so ask-agent's stdout is empty and the pane
// holds only the last screenful. Read the seat's own session file instead: it
// has the whole assistant message, with no TUI chrome. The pane is the fallback.
async function readPane(session: string, seat: string): Promise<string> {
	try {
		const pane = await exec(
			"tuios",
			["capture-pane", "-s", session, "-w", seat, "--lines", "400"],
			30000,
		);
		return pane.split("\n").filter((line) => line.trim().length > 0).slice(-200).join("\n").trim();
	} catch {
		return "";
	}
}

/** The session file for a seat's agent_session_id, or null. A pi seat rolls
 * under PI_CODING_AGENT_DIR; a codex seat rolls under CODEX_HOME. */
function findSessionFile(id: string): string | null {
	if (!id) return null;
	const roots = [
		process.env.PI_CODING_AGENT_DIR
			? join(process.env.PI_CODING_AGENT_DIR, "sessions")
			: join(homedir(), ".pi", "agent", "sessions"),
		process.env.CODEX_HOME
			? join(process.env.CODEX_HOME, "sessions")
			: join(homedir(), ".codex", "sessions"),
	];
	for (const root of roots) {
		const stack = [root];
		while (stack.length > 0) {
			const dir = stack.pop() as string;
			let entries;
			try {
				entries = readdirSync(dir, { withFileTypes: true });
			} catch {
				continue;
			}
			for (const entry of entries) {
				const path = join(dir, entry.name);
				if (entry.isDirectory()) stack.push(path);
				else if (entry.isFile() && entry.name.includes(id)) return path;
			}
		}
	}
	return null;
}

/** The last assistant text in a session file: the seat's finished report.
 * Handles pi (`type: "message"`) and codex (`type: "response_item"`) rolls, so
 * a codex seat returns its answer without the TUI chrome a pane capture holds. */
function lastAssistantText(path: string): string {
	let report = "";
	for (const line of readFileSync(path, "utf8").split("\n")) {
		if (!line.trim()) continue;
		let entry: {
			type?: string;
			message?: { role?: string; content?: unknown };
			payload?: { role?: string; content?: unknown };
		};
		try {
			entry = JSON.parse(line);
		} catch {
			continue;
		}
		if (entry.type !== "message" && entry.type !== "response_item") continue;
		const message = entry.message ?? entry.payload;
		const content = message?.content;
		if (message?.role !== "assistant" || !Array.isArray(content)) continue;
		const text = content
			.filter((block): block is { type: string; text: string } =>
				typeof block?.text === "string" && (block.type === "text" || block.type === "output_text"))
			.map((block) => block.text)
			.join("\n")
			.trim();
		if (text) report = text;
	}
	return report;
}

/** A live task window: its 8-hex id, role, state and harness session. */
type Task = { task: string; role: string; state: string; sessionId: string };

/** Every live task, from the role/desc the launcher put in agent meta. */
async function liveTasks(cfg: Crows): Promise<Task[]> {
	try {
		const listed = JSON.parse(
			await exec("tuios", ["list-agents", "-s", cfg.session, "--json"], 30000),
		) as { agents?: { name?: string; state?: string; agent_session_id?: string;
			meta?: Record<string, string> }[] };
		return (listed.agents ?? [])
			.filter((a) => a.meta?.task)
			.map((a) => ({
				task: a.meta?.task ?? a.name ?? "",
				role: a.meta?.role ?? "",
				state: a.state ?? "",
				sessionId: a.agent_session_id ?? "",
			}));
	} catch {
		return [];
	}
}

/** Raise a new task window for a role; the launcher prints its 8-hex id. */
async function raiseTask(cfg: Crows, role: string, order: string, timeout: number): Promise<string> {
	const out = await exec(cfg.launcher, ["task", "--to", role, "--desc", order], timeout);
	const found = out.match(/task=([0-9a-f]{8})/i);
	if (!found) throw new Error(`could not raise ${role}: ${out.slice(-300)}`);
	return found[1].toLowerCase();
}

/** Order a task window and read its report from the seat's own session file. */
async function askTask(cfg: Crows, task: string, order: string, timeout: number): Promise<string> {
	// No --from: the Master's pane id lives in another session and the daemon
	// cannot resolve it against the seat session, so the ask is refused. The
	// seat session's windows are the only available targets. The task id heads
	// the order so the seat can name it back in its report.
	const args = [
		"ask-agent",
		"-s", cfg.session,
		"-w", task,
		"--timeout", String(timeout),
		// A task raised moments ago is still starting; wait longer than the 30s default.
		"--ready-timeout", "180000",
		"--lines", "200",
		`Task ${task}: ${order}`,
	];
	await exec("tuios", args, timeout + 30000);
	const live = (await liveTasks(cfg)).find((t) => t.task === task);
	const file = findSessionFile(live?.sessionId ?? "");
	const report = file ? lastAssistantText(file) : "";
	return report || (await readPane(cfg.session, task));
}

/** Raise a task for an order and return its id and report. */
async function dispatchTo(cfg: Crows, role: string, order: string, timeout: number): Promise<{ task: string; report: string }> {
	const core = stripAddress(order, role);
	const task = await raiseTask(cfg, role, core, timeout);
	const report = await askTask(cfg, task, core, timeout);
	return { task, report };
}

// The router. The Rule (demon_slayers.py) is the source of truth: the launcher
// writes its seat tags and lexicon to DEMON_SLAYERS_ROUTING, and this reads it.
// A message becomes tags; the seats owning those tags become candidates. A seat
// named outright (or a close typo of one) is the only candidate. One candidate
// dispatches, several go to a picker, none falls through to the Master.
type Seat = { name: string; character: string; domain: string; tags: string[] };
type Routing = { seats: Seat[]; lexicon: Record<string, string[]> };
type Candidate = { seat: string; why: string[] };

// Only when the routing file is absent (the extension run outside the crew).
const FALLBACK_SEATS: Seat[] = [
	"gyomei", "sanemi", "kyojuro", "giyu", "tengen",
	"shinobu", "muichiro", "mitsuri", "obanai", "zenitsu", "tanjiro", "inosuke",
].map((name) => ({ name, character: "", domain: "", tags: [] }));

let loaded: Routing | null = null;

function routing(): Routing {
	if (loaded) return loaded;
	const path = process.env.DEMON_SLAYERS_ROUTING;
	if (path) {
		try {
			loaded = JSON.parse(readFileSync(path, "utf8")) as Routing;
			return loaded;
		} catch {
			// fall through to names only
		}
	}
	loaded = { seats: FALLBACK_SEATS, lexicon: {} };
	return loaded;
}

function seatNames(): string[] {
	return routing().seats.map((s) => s.name);
}

function seatInfo(name: string): Seat | undefined {
	return routing().seats.find((s) => s.name === name);
}

/** Bounded-cost Damerau-Levenshtein: adjacent swaps count as one edit, so a
 * transposed name (`tanjrio`) is one away. Strings here are name-length. */
function editDistance(a: string, b: string): number {
	const d = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
	for (let i = 0; i <= a.length; i++) d[i][0] = i;
	for (let j = 0; j <= b.length; j++) d[0][j] = j;
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
			}
		}
	}
	return d[a.length][b.length];
}

/** The one seat a typo'd word names, or null when none or several do. A word
 * must be 4+ letters and share the first letter; longer names allow 2 edits. */
function nearestSeat(word: string): string | null {
	const w = word.toLowerCase().replace(/[^a-z]/g, "");
	if (w.length < 4) return null;
	const hits = seatNames().filter((n) =>
		n[0] === w[0] && editDistance(w, n) <= (n.length > 6 ? 2 : 1));
	return hits.length === 1 ? hits[0] : null;
}

/** True when a word is the seat's name or a typo of it. */
function isSeatWord(word: string, seat: string): boolean {
	const w = word.toLowerCase().replace(/[^a-z]/g, "");
	return w === seat || (w.length >= 4 && nearestSeat(w) === seat);
}

/** The canonical seat a name (or a typo of one) refers to, else the name given. */
function resolveSeat(name: string): string {
	const n = name.trim().toLowerCase();
	if (seatNames().includes(n)) return n;
	return nearestSeat(n) ?? n;
}

/** The seats that could own an order, ranked, each with the words it matched.
 * A named seat wins outright. Otherwise the lexicon maps words to tags, and a
 * seat scores on how many of its tags were hit, then on specificity (longest
 * matched word), then on roster order. Deterministic: same text, same list. */
function candidates(text: string): Candidate[] {
	const r = routing();
	const named = r.seats.find((s) => new RegExp(`\\b${s.name}\\b`, "i").test(text));
	if (named) return [{ seat: named.name, why: ["named"] }];
	// A typo'd address is a name the exact test above cannot see.
	const fuzzy = nearestSeat(text.trim().split(/\s+/)[0] ?? "");
	if (fuzzy) return [{ seat: fuzzy, why: ["typo of the name"] }];
	const scores = new Map<string, { tags: number; weight: number; why: string[] }>();
	for (const [tag, patterns] of Object.entries(r.lexicon)) {
		const owners = r.seats.filter((s) => s.tags.includes(tag));
		if (owners.length === 0) continue;
		let best = "";
		for (const p of patterns) {
			const m = text.match(new RegExp(`\\b(?:${p})\\b`, "i"));
			if (m && m[0].length > best.length) best = m[0];
		}
		if (!best) continue;
		for (const owner of owners) {
			const cur = scores.get(owner.name) ?? { tags: 0, weight: 0, why: [] };
			cur.tags += 1;
			cur.weight += best.length;
			cur.why.push(best);
			scores.set(owner.name, cur);
		}
	}
	const order = seatNames();
	return [...scores.entries()]
		.map(([seat, v]) => ({ seat, ...v, why: [...new Set(v.why)] }))
		.sort((a, b) => b.tags - a.tags || b.weight - a.weight ||
			order.indexOf(a.seat) - order.indexOf(b.seat))
		.map(({ seat, why }) => ({ seat, why }));
}

/** Drop the address from an order: "tanjiro, what time is it?" → "what time is
 * it?". The name is how the order was routed; the seat need not be told it. */
function stripAddress(text: string, seat: string): string {
	const name = seat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const polite = "(?:hey|hi|ok|okay|please|can you|could you|would you)";
	const asked = new RegExp(
		`^\\s*(?:${polite}\\s+)*(?:ask|tell|have|get)\\s+@?${name}\\s+(?:to\\s+)?`,
		"i",
	);
	const bare = new RegExp(`^\\s*@?${name}\\b[\\s,:;.!\\-–—]*`, "i");
	let core = text.trim().replace(asked, "").replace(bare, "").trim();
	// The address may itself be a typo of the name, which the regexes cannot see.
	const first = core.split(/\s+/)[0] ?? "";
	if (core.includes(" ") && isSeatWord(first, seat)) {
		core = core.replace(/^\S+\s*/, "").replace(/^[\s,:;.!\-–—]+/, "").trim();
	}
	return core || text.trim();
}

export default function crowsExtension(pi: ExtensionAPI) {
	const cfg = crows();

	// The person's order, kept in the transcript. The input handler answers with
	// `handled`, which drops the typed message, so echo it here — shaped like the
	// person's message, naming the seat it goes to — and it stays on screen while
	// the seat works.
	pi.registerMessageRenderer("order", (message, { outputPad }, theme) => {
		const details = message.details as { seat?: string; task?: string } | undefined;
		const who = theme.fg("accent", theme.bold("you")) +
			(details?.seat ? theme.fg("muted", ` → ${details.seat}`) : "") +
			(details?.task ? theme.fg("muted", ` · ${details.task}`) : "");
		const box = new Box(outputPad, 1, (t) => theme.bg("customMessageBg", t));
		box.addChild(new Text(`${who}\n${String(message.content)}`, 0, 0));
		return box;
	});

	pi.registerTool({
		name: "dispatch",
		label: "Dispatch a crow",
		description:
			"Carry an order to one Demon Slayer seat. Raises a task window for it, " +
			"asks it, and returns what the seat printed. Use this for every order.",
		parameters: DispatchParams,
		async execute(_id, params) {
			const seat = resolveSeat(params.seat);
			const { task, report } = await dispatchTo(cfg, seat, params.order,
				params.timeout_ms ?? 300000);
			return {
				content: [{ type: "text" as const,
					text: report || `${seat} (${task}) gave no report.` }],
				details: { seat, task },
			};
		},
	});

	// The programmatic path: an order in a seat's domain is dispatched before the
	// model is asked anything. A weak Master cannot pick the tool, so do not let
	// it try. One candidate dispatches, several ask the person, none falls through.
	// A message that names a live task id goes back to that task's own context.
	async function runTask(
		ctx: { ui: { notify: (text: string, kind?: string) => void } },
		seat: string, task: string, order: string,
	) {
		ctx.ui.notify(`🦅 ${seat} · ${task}…`, "info");
		let report = "";
		try {
			report = await askTask(cfg, task, order, 300000);
		} catch (error) {
			report = `dispatch failed: ${error instanceof Error ? error.message : String(error)}`;
		}
		pi.sendMessage({
			customType: "crow",
			content: `🦅 ${seat} · ${task} reports:\n\n${report || `${seat} gave no report.`}`,
			display: true,
			details: { seat, task, order },
		});
		return { action: "handled" as const };
	}

	pi.on("input", async (event, ctx) => {
		if (event.source === "extension") return { action: "continue" };
		const order = event.text.trim();
		if (!order || order.startsWith("/")) return { action: "continue" };

		// A live task id in the message goes back to that task's own context.
		const ref = order.match(/\b([0-9a-f]{8})\b/i)?.[1]?.toLowerCase();
		if (ref) {
			const live = (await liveTasks(cfg)).find((t) => t.task === ref);
			if (live) {
				pi.sendMessage({ customType: "order", content: order, display: true,
					details: { seat: live.role, task: live.task } });
				return runTask(ctx, live.role, live.task, order);
			}
		}

		const ranked = candidates(order);
		if (ranked.length === 0) return { action: "continue" };
		let seat = ranked[0].seat;
		if (ranked.length > 1) {
			// The tags each seat matched are shown, so the tie is visible.
			const labels = ranked.map((c) => {
				const s = seatInfo(c.seat);
				return `${c.seat}  ${s?.domain ?? ""}  (matched: ${c.why.join(", ")})`;
			});
			labels.push("tanjiro  generalist triage  (fallback)");
			labels.push("let the Master decide");
			if (ctx.hasUI) {
				const pick = await ctx.ui.select(
					"More than one slayer could take this — who owns it?", labels);
				if (!pick || pick === "let the Master decide") return { action: "continue" };
				seat = pick.startsWith("tanjiro ")
					? "tanjiro"
					: ranked[labels.indexOf(pick)]?.seat ?? ranked[0].seat;
			} // no dialog available: take the top-ranked candidate
		}
		const core = stripAddress(order, seat);
		let task = "";
		try {
			task = await raiseTask(cfg, seat, core, 300000);
		} catch (error) {
			ctx.ui.notify(`🦅 ${seat}: ${error instanceof Error ? error.message : String(error)}`, "error");
			return { action: "handled" };
		}
		// Keep what was typed: `handled` would otherwise leave no trace of it.
		pi.sendMessage({ customType: "order", content: order, display: true,
			details: { seat, task } });
		return runTask(ctx, seat, task, core);
	});
}
