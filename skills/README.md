# Matt Pocock's skills for Hearth

Vendored from [mattpocock/skills](https://github.com/mattpocock/skills) at
commit [5beb35b040e3de97e54fa9e386d7e42d15c295c2](https://github.com/mattpocock/skills/commit/5beb35b040e3de97e54fa9e386d7e42d15c295c2)
on 2026-10-22. Copyright © 2026 Matt Pocock; [MIT license](LICENSE).

This snapshot includes all 38 skills and all 108 files under upstream
`skills/`, preserving their categories and support files. Skill files are
unmodified; the [upstream README](UPSTREAM-README.md) has its skill links adjusted
for this folder. It describes upstream installation options, not actions already
performed for Hearth.

## Finding and using a skill

Read its `SKILL.md` when the task calls for it, then load any referenced support
files and companion skills. If the harness has no native Skill tool, read and
follow the local files directly; do not claim a native tool invocation occurred.
These checked-in files do not automatically install a plugin or register slash
commands in every agent.

Hearth's root [AGENTS.md](../AGENTS.md) remains the project workflow. In
particular, use [CONTEXT.md](../CONTEXT.md) as the existing domain glossary
where upstream says `GLOSSARY.md`, and keep ADRs in `docs/adr/`. Do not create
a duplicate glossary or replace the agreed `dev` release workflow.

The upstream setup skill is included but has not been run. Importing these
files does not configure an issue tracker, create triage labels, install hooks,
execute scripts, or invoke every skill. Read and satisfy a skill's prerequisites
when using it. The `in-progress/` skills retain upstream's experimental status.

## Release design entry point

Start with [grill-with-docs](engineering/grill-with-docs/SKILL.md), which combines
[grilling](productivity/grilling/SKILL.md) and
[domain-modeling](engineering/domain-modeling/SKILL.md).
Record confirmed product decisions in `docs/design/` while preserving existing
decisions and vocabulary.

## Catalog

- [ask-matt](engineering/ask-matt/SKILL.md) (engineering)
- [code-review](engineering/code-review/SKILL.md) (engineering)
- [codebase-design](engineering/codebase-design/SKILL.md) (engineering)
- [diagnosing-bugs](engineering/diagnosing-bugs/SKILL.md) (engineering)
- [domain-modeling](engineering/domain-modeling/SKILL.md) (engineering)
- [grill-with-docs](engineering/grill-with-docs/SKILL.md) (engineering)
- [implement-spec](engineering/implement-spec/SKILL.md) (engineering)
- [implement](engineering/implement/SKILL.md) (engineering)
- [improve-codebase-architecture](engineering/improve-codebase-architecture/SKILL.md) (engineering)
- [pr](engineering/pr/SKILL.md) (engineering)
- [prototype](engineering/prototype/SKILL.md) (engineering)
- [research](engineering/research/SKILL.md) (engineering)
- [retro](engineering/retro/SKILL.md) (engineering)
- [setup-matt-pocock-skills](engineering/setup-matt-pocock-skills/SKILL.md) (engineering)
- [tdd](engineering/tdd/SKILL.md) (engineering)
- [to-spec](engineering/to-spec/SKILL.md) (engineering)
- [to-tickets](engineering/to-tickets/SKILL.md) (engineering)
- [triage](engineering/triage/SKILL.md) (engineering)
- [wayfinder](engineering/wayfinder/SKILL.md) (engineering)
- [wizard](engineering/wizard/SKILL.md) (engineering)
- [chief-of-staff](in-progress/chief-of-staff/SKILL.md) (in-progress)
- [claude-handoff](in-progress/claude-handoff/SKILL.md) (in-progress)
- [loop-me](in-progress/loop-me/SKILL.md) (in-progress)
- [setup-ts-deep-modules](in-progress/setup-ts-deep-modules/SKILL.md) (in-progress)
- [writing-beats](in-progress/writing-beats/SKILL.md) (in-progress)
- [writing-fragments](in-progress/writing-fragments/SKILL.md) (in-progress)
- [writing-shape](in-progress/writing-shape/SKILL.md) (in-progress)
- [git-guardrails-claude-code](misc/git-guardrails-claude-code/SKILL.md) (misc)
- [migrate-to-shoehorn](misc/migrate-to-shoehorn/SKILL.md) (misc)
- [scaffold-exercises](misc/scaffold-exercises/SKILL.md) (misc)
- [setup-pre-commit](misc/setup-pre-commit/SKILL.md) (misc)
- [grill-me](productivity/grill-me/SKILL.md) (productivity)
- [grilling](productivity/grilling/SKILL.md) (productivity)
- [handoff](productivity/handoff/SKILL.md) (productivity)
- [teach](productivity/teach/SKILL.md) (productivity)
- [to-questionnaire](productivity/to-questionnaire/SKILL.md) (productivity)
- [wait-what](productivity/wait-what/SKILL.md) (productivity)
- [writing-for-agents](productivity/writing-for-agents/SKILL.md) (productivity)

## Updating

This is a pinned copy, not an automatically updated dependency. Review a new
upstream revision, replace the entire imported skill tree including support
files, retain its license, and update this source commit and catalog. Preserve
Hearth integration notes and review workflow changes before adopting them.
