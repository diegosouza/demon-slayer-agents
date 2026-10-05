/**
 * The Scout's eyes — web search, page reading, and the write guard.
 *
 * Loaded only into the scout seat (inosuke). It adds two read-only web tools
 * and refuses the shell writes a scout must never make.
 *
 * Both web tools are Tavily (the `TAVILY_API_KEY` already in the environment):
 * `web_search` for a query and `fetch_url` for one page. Tavily does the
 * fetching, so there is no local URL fetch to point at loopback or link-local
 * addresses.
 *
 * The guard is a blocklist, not a sandbox. It stops the obvious destructive
 * shell words and file redirection, but a determined python one-liner can still
 * write. The hard ceiling is a read-only sandbox (the Wisteria house); until
 * then the brief and this guard are the muzzle. ponytail: a blocklist, not a
 * sandbox — upgrade to a read-only mount if the scout earns it.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const TAVILY_SEARCH = "https://api.tavily.com/search";
const TAVILY_EXTRACT = "https://api.tavily.com/extract";
const TIMEOUT_MS = 30000;
const CONTENT_CHARS = 20000;

async function tavily(url: string, body: Record<string, unknown>): Promise<any> {
	const key = process.env.TAVILY_API_KEY;
	if (!key) throw new Error("TAVILY_API_KEY is not set in this pane's environment");
	const res = await fetch(url, {
		method: "POST",
		headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!res.ok) {
		throw new Error(`tavily ${res.status}: ${(await res.text()).slice(0, 300)}`);
	}
	return await res.json();
}

// --- the write guard -------------------------------------------------------

// High-blast-radius shell words. Not exhaustive: `python -c "open('x','w')"` is
// not caught. That is the documented ceiling.
const DESTRUCTIVE =
	/\b(rm|rmdir|mv|cp|mkdir|touch|truncate|dd|tee|chmod|chown|chgrp|ln|install|patch|shred|mkfs|mount|umount|sudo|su|shutdown|reboot|systemctl|service|wget)\b/;
const INSTALL =
	/\b(npm|pnpm|yarn|pip|pip3|apt|apt-get|dnf|yum|apk|cargo|gem|brew|nix)\s+(install|i|add|remove|uninstall|update|upgrade|publish)\b/;
const IN_PLACE = /\b(sed|perl|ruby|gawk)\b[^\n|;]*\s-i\b/;
const GIT_WRITE =
	/\bgit\s+(-C\s+\S+\s+)?(add|commit|push|pull|checkout|switch|restore|reset|clean|stash|merge|rebase|cherry-pick|apply|am|rm|mv|init|clone|gc|update-index|update-ref)\b/;
const CURL_WRITE = /\bcurl\b[^\n|;]*\s(-o|-O|--output)\b/;

/** A redirection to a real file; ignores `2>&1`, `>&2`, and `>/dev/null`. */
function redirectsToFile(command: string): boolean {
	const re = /(^|[^0-9&])>>?\s*([^\s;|&]+)/g;
	for (let m = re.exec(command); m; m = re.exec(command)) {
		const target = m[2];
		if (target === "/dev/null" || /^&\d+$/.test(target)) continue;
		return true;
	}
	return false;
}

/** Why the command looks like it writes, or null when it looks read-only. */
function writeRisk(command: string): string | null {
	if (redirectsToFile(command)) return "output redirection writes a file";
	if (DESTRUCTIVE.test(command)) return `\`${command.match(DESTRUCTIVE)?.[1]}\` can write`;
	if (INSTALL.test(command)) return "package install or removal";
	if (IN_PLACE.test(command)) return "in-place edit";
	if (GIT_WRITE.test(command)) return "git command that mutates";
	if (CURL_WRITE.test(command)) return "curl writing to a file";
	return null;
}

// --- extension -------------------------------------------------------------

export default function scout(pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Search the web",
		description:
			"Search the web and return the top results: title, URL, and a snippet for each, " +
			"plus a short synthesized answer. Read-only.",
		parameters: Type.Object({
			query: Type.String({ description: "The search query." }),
			max_results: Type.Optional(
				Type.Number({ description: "How many results to return. Default 5, max 20." }),
			),
		}),
		async execute(_id, params) {
			const data = await tavily(TAVILY_SEARCH, {
				query: params.query,
				max_results: Math.min(Math.max(params.max_results ?? 5, 1), 20),
				include_answer: true,
			});
			const lines = (data.results ?? []).map(
				(r: any, i: number) =>
					`${i + 1}. ${r.title}\n   ${r.url}\n   ${String(r.content ?? "").replace(/\s+/g, " ").slice(0, 500)}`,
			);
			const text = [data.answer ? `answer: ${data.answer}` : "", lines.join("\n\n")]
				.filter(Boolean)
				.join("\n\n");
			return {
				content: [{ type: "text" as const, text: text || "no results" }],
				details: undefined,
			};
		},
	});

	pi.registerTool({
		name: "fetch_url",
		label: "Read a web page",
		description:
			"Fetch one URL and return its main text content. Read-only. " +
			"Use it after web_search to read a specific result.",
		parameters: Type.Object({
			url: Type.String({ description: "The http(s) URL to read." }),
			depth: Type.Optional(
				Type.String({ description: "Extraction depth: basic (default) or advanced." }),
			),
		}),
		async execute(_id, params) {
			const data = await tavily(TAVILY_EXTRACT, {
				urls: [params.url],
				extract_depth: params.depth === "advanced" ? "advanced" : "basic",
			});
			const first = (data.results ?? [])[0];
			if (!first) {
				const why = (data.failed_results ?? [])[0]?.error ?? "no content";
				throw new Error(`could not read ${params.url}: ${why}`);
			}
			const text = String(first.raw_content ?? "").slice(0, CONTENT_CHARS);
			return {
				content: [{ type: "text" as const, text: `# ${first.title ?? ""}\n${first.url}\n\n${text}` }],
				details: undefined,
			};
		},
	});

	pi.on("tool_call", async (event) => {
		if (event.toolName !== "bash") return;
		const command = typeof event.input?.command === "string" ? event.input.command : "";
		const risk = writeRisk(command);
		if (risk) {
			return { block: true, reason: `the scout is read-only: ${risk}. Report the finding instead.` };
		}
	});
}
