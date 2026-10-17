import type { Person } from "./types.ts";

/**
 * GitHub accounts operated by AI coding agents or automation that sign their work as ordinary users.
 * Matched by numeric ID so renamed or look-alike human accounts are never excluded. Accounts whose
 * login ends in `[bot]` are excluded separately.
 */
export const excludedAgentAccounts: { id: number; login: string; operator: string }[] = [
  { id: 199161495, login: "cursoragent", operator: "Cursor" },
  { id: 81847, login: "claude", operator: "Anthropic Claude Code" },
  { id: 267193182, login: "codex", operator: "OpenAI Codex" },
  { id: 198982749, login: "Copilot", operator: "GitHub Copilot" },
  { id: 203248971, login: "copilot-swe-agent", operator: "GitHub Copilot" },
  { id: 108291165, login: "astrobot-houston", operator: "Astro automation" },
  { id: 19864447, login: "web-flow", operator: "GitHub web interface" },
];

const excludedIds = new Set(excludedAgentAccounts.map((account) => account.id));

export function isAgentAccount(person: Pick<Person, "github"> | undefined): boolean {
  return !!person?.github && (excludedIds.has(person.github.id) || person.github.login.toLowerCase().endsWith("[bot]"));
}
