import type { Person } from "./types.ts";

export type GithubUser = { id: number; login: string; type?: string };

export function validUser(user: GithubUser | null | undefined): user is GithubUser {
  return !!user && Number.isSafeInteger(user.id) && user.id > 0 &&
    typeof user.login === "string" && /^[A-Za-z0-9-]+(?:\[bot\])?$/.test(user.login);
}

export function createPeopleRegistry(roster: Person[]) {
  const people = new Map<number, Person>();
  const known = new Map(roster.filter((person) => person.github).map((person) => [person.github!.id, person]));
  function personId(user: GithubUser): string {
    const confirmed = known.get(user.id);
    if (confirmed) return confirmed.id;
    if (!people.has(user.id)) people.set(user.id, {
      id: `github:${user.id}`, name: user.login, role: "Public contributor", kind: "github",
      github: { id: user.id, login: user.login, url: `https://github.com/${user.login}` },
      homeRoomId: "commons", table: null, repositoryIds: [], assignment: "unknown", palette: user.id % 24,
    });
    return `github:${user.id}`;
  }
  return { people, personId };
}
