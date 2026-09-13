# Shared CI contract

Consumers pin reusable workflows to a full commit SHA. Update pins through
reviewed pull requests. Triggers, permissions, and concurrency belong to the
caller. A called workflow cannot increase the caller's permissions. No interface
uses `secrets: inherit`.

The public contract version and profile catalog live in
`contracts/ci-contract.json`. The public validator checks that document against
`contracts/ci-contract.schema.json` with a pinned JSON Schema validator before
accepting changes.

## Runner selection

The reusable workflow owns the exact runner selection:

```yaml
runs-on:
  group: trusted-ci
  labels: hemocode-linux-arm64
```

Callers do not supply runner group, routing label, complete label arrays, or host
image identifiers. This prevents a caller change from redirecting trusted work
to an unreviewed pool. Future OS and architecture profiles will use stable
capability labels from the catalog, with separate workflow entrypoints or
statically mapped jobs when a workflow needs more than the current Linux ARM64
profile.

The current profile supplies Linux, ARM64, and the `hemocode-linux-arm64`
capability. The private infrastructure host may also register the legacy
`tart-ubuntu24-arm64` label during migration, but new callers must use the
provider-neutral label.

## Billing boundary

The public repository's own validator is intentionally a short standard hosted
job. Reusable workflows used by private callers are self-hosted-only. An
unavailable `trusted-ci` group queues the job, which means private callers do not
silently consume GitHub-hosted minutes.

The group must be configured independently as private-only and restricted to the
reviewed reusable workflow paths. Labels are routing hints, not an authorization
boundary. Private fork PRs do not run untrusted code on this group.

## Application verification

`elixir-ci.yml` takes only `elixir-version` and `otp-version`. The application
provides `scripts/ci.sh --check`, its root pnpm lockfile, Mix lockfiles, and the
Node engine requirement in `priv/pi-sdk-bridge/package.json`.

The job preserves PostgreSQL service behavior and caches pnpm, Mix, and PLT data.
Cache keys bind the operating system, capability profile, architecture, and
relevant runtime versions. Lockfiles distinguish dependency revisions. Cache
storage and visibility follow GitHub's caller-repository cache rules.

Full checkout history supplies the pull request base for changed-code
verification without putting a token in a fetch URL. Application checks remain
repository-owned.

## Linked issues

`linked-issue.yml` is called only from `pull_request_target`. Its job-level event
guard is evaluated before `runs-on`, so an invalid caller is skipped without
reserving a trusted runner. The reusable job checks out the exact event base SHA
and executes the caller's trusted `scripts/require-linked-issue.sh`. It never
checks out PR-head code.

Fork PRs are included because this base-only, read-only check does not execute
untrusted PR content. Other fork-triggered workflows remain outside `trusted-ci`.
The step-level guard remains defense in depth for an unexpected event context.
The caller grants only contents, pull requests, and issues read access.

## Infrastructure verification

`infrastructure-ci.yml` executes the caller-owned `scripts/ci.sh --check` on the
same approved capability. The selected guest provides Bash, Docker, `jq`, Python
3, and ShellCheck. The workflow records the tested commit and runner identity and
accepts no secrets.

## Rollout and rollback

The private `infrastructure` repository owns machine specs, host adapters, MDM
attestation, guest images, runner registration, cleanup, and update rollback.
The public repository owns only the shared interface. Merge a public workflow
change, update private caller pins to the exact merged SHA, and update the
organization workflow allowlist as one reviewed change.

Acceptance requires cold and warm cache passes, PostgreSQL, deliberate failure,
cancellation, guest and controller restart recovery, queue behavior while the
host is unavailable, public validator execution, and fork safety. Rollback
restores the last working workflow SHA and runner configuration.
