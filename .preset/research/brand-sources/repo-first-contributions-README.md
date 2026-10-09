# First Contribution

Your way into [VOSS Labs](https://github.com/voss-labs). One small pull request, merged automatically, in about fifteen minutes.

No forms. No interviews. Just commits.

---

## What you are going to do

Add one file with your name on it, open a pull request, and watch it merge. That is the whole task.

It is deliberately small, because the point is not the file. The point is that by the end you will have done a fork, a branch, a commit and a pull request for real, on a real repository. That is the same loop every single change to every VOSS project goes through, including ours.

Nothing here is graded and nothing here is a test. A bot checks your file and merges it. If something is wrong it tells you exactly what to fix and merges you the moment you push the fix.

**You do not need to know git to start.** Path A below happens entirely in the browser.

---

## Path A — in the browser

Use this if you have never used git, or you are on a phone, or you just want to be done.

**1. Fork this repository.** Click **Fork** at the top right of this page, then **Create fork**. You now have your own copy.

**2. In your fork, open the `contributors` folder first.** This matters — open the folder, then click **Add file**, then **Create new file**. GitHub will already show `contributors/` in front of the name box.

**3. Type only your GitHub username** and `.md` — nothing else. If your username is `priya-k`, type:

```
priya-k.md
```

The whole line should end up reading `contributors/priya-k.md`. If it says `contributors/contributors/priya-k.md`, you typed the folder twice — delete the extra one.

The name has to match your username exactly. That is what keeps everyone's file separate so nobody ever hits a merge conflict here.

**4. Paste this in and edit it:**

```markdown
---
github: your-github-username
name: Your Full Name
year: FE
branch: EXCS
knows: [none-yet]
wants: web development
---

Two or three lines about yourself.
```

- `year` is one of `FE`, `SE`, `TE`, `BE`.
- `knows` is what you already know, picked from this list and nothing else: `none-yet`, `git`, `dsa`, `c-cpp`, `java`, `python`, `javascript`, `typescript`, `react`, `go`, `html-css`, `sql`.
- **`none-yet` is a real answer.** Nobody is checking up on you. This field only decides which issues get suggested to you at the end.

**5. Commit it.** Scroll down, click **Commit changes**, choose **Create a new branch for this commit and start a pull request**, then **Propose changes**.

**6. Open the pull request.** Check that it is going into `voss-labs/first-contributions`, branch `main`, then click **Create pull request**.

Now wait about thirty seconds. Either it merges, or a comment appears telling you the one thing to change.

---

## Path B — on your machine

Use this if you want the real loop. If git is not installed yet, [git-and-github.md](docs/git-and-github.md) covers that first.

With the [GitHub CLI](https://cli.github.com):

```bash
gh repo fork voss-labs/first-contributions --clone
cd first-contributions
git checkout -b add-YOUR-USERNAME
cp contributors/TEMPLATE.md contributors/YOUR-USERNAME.md
```

Open that file in an editor and fill it in. Then check it before you push:

```bash
node scripts/validate.mjs --file contributors/YOUR-USERNAME.md --author YOUR-USERNAME
```

This is the exact same check the bot runs, so if it passes here it will pass there. It needs Node 20 or newer, and nothing else. No `npm install`.

```bash
git add contributors/YOUR-USERNAME.md
git commit -m "feat: add YOUR-USERNAME to contributors"
git push -u origin add-YOUR-USERNAME
gh pr create --fill
```

Without the GitHub CLI: click **Fork** on this page, `git clone` your fork, and after pushing, open the pull request from the banner GitHub shows on your fork.

---

## What happens next

When it merges, the bot posts a comment with two or three VOSS repositories worth looking at, chosen from what you put in `knows`. Your name also lands on [CONTRIBUTORS.md](CONTRIBUTORS.md).

[![Contributors](https://contrib.rocks/image?repo=voss-labs/first-contributions)](https://github.com/voss-labs/first-contributions/graphs/contributors)

Then pick something real:

1. **[pick-an-issue.md](docs/pick-an-issue.md)** — find an issue that fits, and claim it by commenting `I'd like to work on this`. Do that before you start writing code, so two people never burn a week on the same thing.
2. **[setup-a-voss-project.md](docs/setup-a-voss-project.md)** — get that project running on your machine.
3. **[your-first-pr.md](docs/your-first-pr.md)** — how we write branches, commits and pull requests here.

---

## The docs

Reference, not homework. Read them when you need them.

| Doc | Read it when |
| --- | --- |
| [git-and-github.md](docs/git-and-github.md) | You have never used git, or authentication is failing |
| [setup-a-voss-project.md](docs/setup-a-voss-project.md) | You are getting a VOSS project running for the first time |
| [pick-an-issue.md](docs/pick-an-issue.md) | You are choosing what to work on |
| [your-first-pr.md](docs/your-first-pr.md) | You are about to open a pull request |
| [when-youre-stuck.md](docs/when-youre-stuck.md) | Something is broken and you want the fix |
| [glossary.md](docs/glossary.md) | A word came up and you would rather not ask |

---

## Stuck

Being stuck for an hour is normal and worth mentioning. Being stuck for three days in silence is not, and it is not something anyone here will be annoyed about.

Ask in the pull request or issue thread first, so the next person finds the answer. If you are properly blocked, DM Harshal on WhatsApp.

No question here is too basic. Everyone in this lab had a first pull request.

---

MIT licensed. Part of [VOSS Labs](https://vosslabs.org) at Vidyalankar Institute of Technology, Mumbai.
