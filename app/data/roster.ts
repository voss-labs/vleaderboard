import type { Person, TableId } from "./types.ts";

const names: [string, string, string, TableId | null][] = [
  ["Harshal More", "Maintainer", "maintainer", null],
  ["Kanchan Chavan", "Co-Maintainer", "co-maintainer", null],
  ["Devdatta Talele", "Core Developer", "core", "engineering"],
  ["Amey Pawar", "Core Developer", "core", "engineering"],
  ["Mandar Patil", "Engineering Lead", "core", "engineering"],
  ["Shubham Ralkar", "Engineering Lead", "core", "engineering"],
  ["Armash Ansari", "Community Lead", "core", "community"],
  ["Sujal Tiwari", "Community Lead", "core", "community"],
  ["Shubhan Telang", "Research Lead", "core", "research"],
  ["Manas Deshpande", "Research Lead", "core", "research"],
  ["Himanshu Choyal", "DevRel Lead", "devrel", null],
  ["Parth Indulkar", "DevRel Lead", "devrel", null],
];

const identities: Record<string, { id: number; login: string }> = {
  "Harshal More": { id: 86048671, login: "harshalmore31" },
  "Mandar Patil": { id: 205825698, login: "Mandar885" },
  "Armash Ansari": { id: 172116296, login: "armash66" },
  "Sujal Tiwari": { id: 225031209, login: "SujalTiwari1" },
};

export function createRoster(): Person[] {
  return names.map(([name, role, homeRoomId, table], palette) => {
    const identity = identities[name];
    return {
      id: `named:${name.toLowerCase().replaceAll(" ", "-")}`,
      name,
      role,
      kind: "named",
      github: identity
        ? { ...identity, url: `https://github.com/${identity.login}` }
        : null,
      homeRoomId,
      table,
      repositoryIds: [],
      assignment: "confirmed",
      palette,
    };
  });
}
