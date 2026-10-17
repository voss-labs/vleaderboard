import { selectMainRepositories } from "./derive.ts";
import { createRoster } from "./roster.ts";
import type { ActivityEvent, CodeCommit, OfficeSnapshot, Person, Repository, WorkItem } from "./types.ts";

const catalog: [number, string, string | null, string | null][] = [
  [1178834519, "verp", "Academic ERP for students, courses and departments.", "TypeScript"],
  [1202930379, ".github", "Organization profile and shared material.", null],
  [1207607031, "vosslabs.org", "The public home of VOSS Labs.", "Astro"],
  [1225029115, "vask", "Anonymous campus questions through SSH.", "Go"],
  [1234547360, "vboard", "Campus events and community registration.", "TypeScript"],
  [1300559153, "vauth", "Shared identity for VOSS products.", "TypeScript"],
  [1319131874, "first-contributions", "A first pull request into VOSS Labs.", "JavaScript"],
  [1323750919, "vprep", "Papers, notes, syllabus and study resources.", "TypeScript"],
  [1332389317, "vroom", "Pseudonymous conversation for verified VIT students.", "TypeScript"],
  [1399780818, "vcanteen", null, "TypeScript"],
  [1402050360, "vmaps", "Interactive 3D campus map and walkthrough.", "TypeScript"],
  [1409153476, "vshow", null, "TypeScript"],
];
const featured = ["vroom", "vprep", "verp", "vauth"];
const previewNames = [
  "Avery", "Morgan", "Casey", "Robin", "Jamie", "Quinn",
  "Rowan", "Riley", "Alex", "Taylor", "Sam", "Jordan",
  "Emery", "Harper", "Blake", "Cameron", "Reese", "Sage",
  "Drew", "Finley", "Parker", "Skyler", "Ellis", "Remy",
];
const fixtureTime = Date.parse("2026-10-09T08:00:00Z");
const ago = (days: number) => new Date(fixtureTime - days * 86400000).toISOString();

function previewPerson(index: number, repository: Repository): Person {
  return {
    id: `preview:${repository.name}:${index % 6}`,
    name: `Preview ${previewNames[index]}`,
    role: index % 6 === 0 ? "Preview project lead" : "Preview contributor",
    kind: "preview",
    github: null,
    homeRoomId: `repo:${repository.id}`,
    table: null,
    repositoryIds: [repository.id],
    assignment: "preview",
    palette: index + 12,
  };
}

function fixturePull(repository: Repository, author: Person, number: number, age: number): WorkItem {
  const state = number % 7 === 0 ? "closed" : number % 4 === 0 ? "open" : "merged";
  const titles = ["Refine the interface", "Improve loading states", "Simplify the query flow", "Add keyboard navigation"];
  return {
    id: `${repository.id}:pr:${number}`,
    repositoryId: repository.id,
    number,
    title: `Preview: ${titles[number % titles.length]}`,
    url: "",
    kind: "pull-request",
    state,
    authorPersonId: author.id,
    assigneePersonIds: [],
    requestedReviewerPersonIds: [],
    createdAt: ago(age + 2),
    updatedAt: ago(age),
    mergedAt: state === "merged" ? ago(age) : null,
    isBot: false,
  };
}

export function createPreviewSnapshot(now: Date): OfficeSnapshot {
  const people = createRoster();
  const repositories: Repository[] = catalog.map(([githubId, name, description, language], index) => ({
    id: `github:${githubId}`,
    githubId,
    name,
    fullName: `voss-labs/${name}`,
    description,
    url: `https://github.com/voss-labs/${name}`,
    language,
    archived: false,
    fork: false,
    pushedAt: ago(featured.includes(name) ? featured.indexOf(name) / 8 : 10 + index),
    leadPersonId: null,
    memberPersonIds: [],
    assignment: "unknown",
  }));
  featured.forEach((name, roomIndex) => {
    const repository = repositories.find((item) => item.name === name)!;
    const team = Array.from({ length: 6 }, (_, seat) => previewPerson(roomIndex * 6 + seat, repository));
    people.push(...team);
    repository.leadPersonId = team[0].id;
    repository.memberPersonIds = team.slice(1).map((person) => person.id);
    repository.assignment = "preview";
  });
  const work = repositories.map((repository, roomIndex) => {
    const team = people.filter((person) => person.repositoryIds.includes(repository.id));
    const authors = team.length ? team : [people[roomIndex % 12]];
    const pulls = authors.flatMap((author, index) => {
      const ages = index === 0 ? [1, 3, 6, 14, 36, 58] : [2 + index, 11 + index * 3, 42 + index];
      return ages.map((age, entry) => fixturePull(repository, author, index * 10 + entry + 1, age));
    });
    pulls.filter((pull) => pull.state === "open").forEach((pull) => {
      const reviewer = authors.find((person) => person.id !== pull.authorPersonId);
      pull.requestedReviewerPersonIds = reviewer ? [reviewer.id] : [];
    });
    const author = authors[0];
    const issues: WorkItem[] = [{
      id: `${repository.id}:issue:101`, repositoryId: repository.id, number: 101,
      title: "Preview: Plan the next interface milestone", url: "", kind: "issue", state: "open",
      authorPersonId: author.id, assigneePersonIds: [author.id], requestedReviewerPersonIds: [],
      createdAt: ago(4), updatedAt: ago(1), mergedAt: null, isBot: false,
    }];
    return { repositoryId: repository.id, status: "ready" as const,
      fetchedAt: now.toISOString(), pulls, issues, message: "Simulated work for the office preview." };
  });
  const activity: ActivityEvent[] = work.flatMap((repository) => ["merged", "open", "closed"].flatMap((state) => {
    const pull = repository.pulls.find((item) => item.state === state);
    return pull ? [{
    id: `preview:${pull.id}:${pull.state}`, personId: pull.authorPersonId,
    repositoryId: repository.repositoryId,
    kind: pull.state === "merged" ? "merged" as const : pull.state === "closed" ? "closed" as const : "opened" as const,
    text: `Simulated ${pull.state === "merged" ? "merge" : pull.state === "closed" ? "close" : "pull request"}: ${pull.title.replace("Preview: ", "")}`,
    occurredAt: pull.updatedAt, source: "preview" as const, url: null, fresh: false,
    }] : [];
  })).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const code = repositories.map((repository, repositoryIndex) => {
    const authors = people.filter((person) => person.repositoryIds.includes(repository.id));
    const contributors = authors.length ? authors : [people[repositoryIndex % 12]];
    const commits: CodeCommit[] = contributors.flatMap((person, authorIndex) => [1, 5, 17, 38, 62].map((age, index) => {
      const sha = (repositoryIndex * 1000 + authorIndex * 10 + index + 1).toString(16).padStart(40, "0");
      return {
        id: `${repository.id}:commit:${sha}`, repositoryId: repository.id, sha, url: "",
        authorPersonId: person.id, committedAt: ago(age + authorIndex),
        additions: index === 0 && authorIndex === 0 ? 0 : (authorIndex + 1) * 23 + index * 11,
        deletions: index === 0 && authorIndex === 0 ? 0 : (authorIndex + 1) * 7 + index * 3,
        isBot: false,
      };
    }));
    return { repositoryId: repository.id, status: "ready" as const, fetchedAt: now.toISOString(),
      commits, captureComplete: true, message: "Simulated default-branch non-merge commits and changed lines.", retryAt: null, detailReadLimit: 20 };
  });
  return {
    version: 1,
    source: { mode: "preview", status: "ready", fetchedAt: now.toISOString(),
      message: "Preview data · simulated teams, activity and counts. Scenario dated 9 October 2026.", retryAt: null },
    people, repositories, mainRepositoryIds: selectMainRepositories(repositories),
    roomSelectionBasis: "Preview selection · simulated activity", catalogComplete: true, work, code, activity,
  };
}
