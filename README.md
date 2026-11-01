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

A skill for your coding agent, built around situational awareness and progressive
disclosure: start with one verb on one task, keep your existing skills and your
existing logging, and replace any procedure you don't like.

It is a *guide* coding skill, not a vibe coding one. The developer is back in the
hot seat — you are not handing the agent a prompt and walking away, you are using
it as a tool to work out what you actually want, and then applying the amount of
autonomy the task deserves.

Requirements: `git`, and a coding agent to run it in. It runs on node 24+ or on
bun. With neither, the setup bootstraps a self-contained bun install into its own
directory, so nothing has to be installed system-wide.

#### Try it today

It sets up under `/tmp` by default, so you can try it on one small task before you
decide to commit to an install. Paste in your coding agent:

> I want to try the Thursday skill from https://github.com/trythursday/thursday.

Then the only thing you have to remember:

> Type `/thursday` at any time to start a Thursday session. Then vibe code like normal.

Thursday does nothing until you invoke it. Until then, your workflow is exactly
what it was.

I would love to know what you think — type `/thfeedback` at any time.

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
