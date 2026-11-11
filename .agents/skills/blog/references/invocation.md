# Blog invocation

Run in the benebsworth.com repository. This is a prompt-based orchestration skill, not a deterministic article generator. It uses current host tools and permissions; installing it grants no extra access.

| Host | Invocation | Discovery |
|---|---|---|
| Local Claude Code | `/blog "some seed prompt"` | `.claude/skills/blog/SKILL.md` forwards `$ARGUMENTS` to the shared workflow. |
| Codex CLI / IDE | `$blog "some seed prompt"` or select `blog` in `/skills` | `.agents/skills/blog/SKILL.md` is the repo skill. |
| Desktop skill picker | Select `blog` when the repo skill is listed, then give the seed | Picker syntax depends on the host. A literal `/blog` is not registered universally. |
| A host with repo reads but no skill discovery | Ask it to read `.agents/skills/blog/SKILL.md` and use the supplied seed | Explicit file invocation; no slash-menu claim. |

Codex's older `/prompts:...` custom prompts are deprecated and user-scoped. This setup does not create them. Existing clients may need a fresh session/reload to show a new repo skill. In Claude Code, check the `/` menu; in Codex, check `/skills`. A client with skills disabled or no repository access cannot use the local entry point.

## Examples

```text
/blog "Why backpressure matters when a consumer slows down"
/blog --dry-run --kind personal "What I have learned reviewing agent-written code"
/blog --kind science --images reuse "Why a wave packet has two speeds"
$blog --dry-run --kind technical --slug bounded-work-queues "Bounded queues in a Go worker pool"
$blog --images none "A short note on testing assumptions"
```

In a terminal, start Codex in the repository and then type `$blog` in its prompt. If passing an initial prompt through a shell, quote the dollar sign literally:

```bash
codex -C /path/to/benebsworth.com '$blog --dry-run "Bounded work queues"'
```

Options precede the seed. `--kind` selects article form, not site taxonomy or authorship. `--images reuse` uses only existing assets/derivatives; `none` skips new artwork. `--dry-run` emits a brief, proposed sources, outline, paths and image prompt without writing an article or creating assets. It does not prove research, build or pixel checks passed.

The parser accepts a JSON `arguments` string on stdin. This example is literal test data; never insert arbitrary seed text into shell syntax:

```bash
python3 .agents/skills/blog/scripts/parse_seed.py <<'BLOG_INPUT'
{"arguments":"--dry-run --kind technical --slug bounded-work-queues \"Bounded queues in a Go worker pool\""}
BLOG_INPUT
```

No shell evaluation is performed by the parser. Flags appearing after the first seed word are seed text. Use `--` for a seed starting with dashes. Empty input, unsafe slugs, malformed quotes and unsupported leading options return a useful error. Quote only the seed, not the leading options. The parser resolves syntax; the agent resolves meaning, audience, research and routing.

For maintenance, the [three example seeds](../evals/seed-cases.json) exercise technical, personal and science briefs. The offline parser checks include those seeds, draft defaults, output paths, literal shell metacharacters, quotes and rejected inputs:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/blog/scripts/test_parse_seed.py
```

Run the examples through the skill's `--dry-run` mode to review semantic routing and image prompts. Passing the parser tests alone does not validate the agent's research decisions or future artwork.

## Verified host basis

Checked against installed Codex CLI 0.154.0 and Claude Code 2.1.305 on 24 October 2026, plus official documentation:

- [OpenAI: Build skills](https://developers.openai.com/codex/build-skills): repo `.agents/skills` discovery and explicit skill invocation.
- [OpenAI: Custom prompts](https://learn.chatgpt.com/docs/custom-prompts): legacy prompt deprecation and user scope.
- [Claude Code: Skills](https://code.claude.com/docs/en/skills): project skills, `/name` invocation and argument substitution.

Local discovery is verifiable without generating an article. Codex's app-server `skills/list` can inspect repo skills without a thread or model turn. The installed Claude client exposes no standalone listing command in `--help`; filesystem validation and the documented command convention do not prove an interactive slash expansion occurred. No security settings, permission policies or hooks are changed by this setup.
