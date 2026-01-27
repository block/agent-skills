# Agent Skills

A collection of reusable **Agent Skills** maintained by Block to help AI agents perform real-world tasks more effectively.

These skills are designed to be:
- ✅ Portable across agents (Goose, Claude Desktop, and others that support agent skills)
- ✅ Easy to install
- ✅ Easy to understand before installing
- ✅ Community-extensible

---

## What are Agent Skills?

Agent Skills are reusable sets of instructions and supporting resources that teach an AI agent how to perform a specific workflow or task.

A skill might include:
- A structured checklist (e.g. code review)
- A workflow (e.g. deploying a service)
- Domain knowledge (e.g. using a specific API)
- Supporting files like scripts, templates, or examples

Each skill lives in its own folder and includes a `SKILL.md` file.

---

## Installing a Skill

You can install skills using the `skills` CLI:

```bash
npx skills add https://github.com/block/Agent-Skills --skill api-setup
```
Make sure you have the built in skills extension enabled

This will install the skill locally so compatible agents (like Goose or Claude Desktop) can automatically load and use it.

## Browse Skills

You can browse all available skills via the Goose Skills Marketplace:
👉 https://block.github.io/goose/skills

There you can:

- Read the full skill before installing

- Copy the install command

- View source on GitHub

## Contributing a Skill

We welcome community contributions!

You can contribute in two ways:

- External skills: Keep your own repo and submit it to be listed in the marketplace

- Block hosted skills: Contribute directly to this repo via pull request
