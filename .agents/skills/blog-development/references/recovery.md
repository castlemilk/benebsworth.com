# Recovery and build compatibility

## Working source exists on a branch

Use the verified repository remote and branch, not an assumed branch name. For this blog the repository is castlemilk/benebsworth.com. Query current branches and PR metadata. A prior receipt may identify a useful branch, but verify its current SHA. A successful ls-remote is evidence to attempt a fresh clone; connector single-file limitations do not establish that ordinary Git is unavailable.

Compare recovered subset files with the complete checkout before applying changes. Connector responses may add a trailing newline; inspect the exact diff rather than overwriting or dismissing all mismatches. A historical unpublished patch is not automatically present on the branch. Preserve that distinction in the recovery ledger.

If Git actually fails, record the command class, target, error and what is still accessible. Do not invent proxy URLs, credentials or alternate security paths. Ask for the smallest missing access/input only after trying the supported authorized route.

## Dependency installation

Inspect package scripts and the committed lockfile. Use the matching lockfile installation and avoid unknown lifecycle hooks. Do not replace the lockfile or upgrade dependencies simply to get a build.

If many tarballs fail integrity checks, stop the noisy attempt and inspect a bounded log. One fresh, isolated cache retry is reasonable if access is authorized. Never disable integrity checks. Distinguish package corruption from a denied network response; respect explicit access denials.

## Restricted build helpers

An IPC failure in a launcher need not mean the application's source is broken. An approved sandbox escalation may be requested when needed. If unavailable, a documented runtime path that does not require that IPC feature may execute the same source without weakening security. For Node versions supporting native TypeScript, a generator importing supported .ts syntax may run directly with node. Verify that it executed successfully and disclose the deviation from the standard lifecycle command. Do not bypass an access denial.

Keep worker-limit overrides local to the validation session, restore configuration afterwards, and verify no accidental config diff remains. Record generator, Next export, OG and Pagefind results separately. Missing old Gatsby/archive toolchains are separate from the Next app's acceptance.
