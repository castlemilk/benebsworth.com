# Durable cycle checkpoint

Keep one current repository review record under docs/development and reconcile the canonical Space backlog with guarded writes/readback when available. Do not copy private runtime inventory or secrets into either record.

Record:
- Scope, owner, current user decision and next decision.
- Repository branch, exact starting SHA, PR URL and base branch; explain any unpublished predecessor gap.
- Changed files and accepted behavior; preserve approved asset hashes when relevant.
- Test commands, pass/fail/skip counts, environment differences, build/postbuild outcomes.
- Actual screenshot/recording references, route, viewport/theme and state. Label mockups and sampled motion.
- Five critique findings and corrections; label each executed skill or manual lens.
- Current source, remote, CI, deployment and live-verification status separately.
- Blocker, exact next step, and whether it needs approval. Record unanswered message/decision once.

Recovery drill: another session should be able to identify the correct branch, reproduce the checks, locate the reviewed assets and resume the next step without rereading a long conversation. Validate links/references when used; an absent workspace path is not a durable artifact.
