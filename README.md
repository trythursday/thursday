# Thursday

Situational awareness for humans: aviation-inspired workflows that meet people
where they are.

Thursday is a set of ideas

- to help people
- build systems
- to achieve
- their own goals
- safely
- by making tiny changes
- one at a time.

## Experiments

### Next Steps

An experiment in using generative AI in a non-chat form. Takes any goal
and gives you some concrete steps towards getting there.

[Try it](https://trythursday.org/experiments/next-steps/)

### The Thursday skill file

Requirements: `git`, and a coding agent to run it in. The setup bootstraps a
self-contained bun install to run itself if `bun` is not already present.

#### Try it today

Paste in your coding agent:

> Help me set up the Thursday skill from <https://github.com/trythursday/thursday>.

### AI for All

A free OpenAI-compatible inference provider, backed by OpenRouter. No signup is
required - instead your computer solves a small cryptographic challenge to get
an API key valid for 24 hours, 25 requests/hr per IP and per key. Keys are
disposable: if one expires, get another in 10 minutes. Meant for people to build
small experiments that use generative intelligence in unconventional ways.

[Get your API key](https://ai-for-all.trythursday.org)

### Upcoming

- [Thing Refiner](./experiments/thing-refiner.jpg)

## In this repo

Optional experiment: [local machine-readable feedback](./docs/feedback-record.md)
provides a template/schema and validator. It collects no session data and uploads
nothing; measurement and any later sharing are explicit operator choices.

- `.agents/skills/` - the Thursday root skill, and one generated skill per verb
- `procedures/` - one concept per file; each carries its own description and undo
- `threads/` - experimental info organization system
  - `threads/personal/` - gitignored, personal info at the relevant scope
- `experiments/` - prototypes and ideas.
- `scripts/` - Thursday tools, for people and machines

## License

I want you to steal thursday. I ENCOURAGE you to steal thursday.
I want this skill file in as many agents as possible. If frontier labs think
this is useful and run it in their AI factories 24/7 - that's just increasing
the size of my database ;) My ultimate goal is world peace. Thursday is a system
to work towards any goal by breaking it down into small, actionable tasks.
If you steal it and help people remember about humans and fun, you are just
helping the cause of world peace! So do it :)

In exchange I ask that you [write my name down](./LICENSE.md) somewhere in a
little corner of your project.

---

Created: 2026-10-12
Revisit: 2026-11-12
