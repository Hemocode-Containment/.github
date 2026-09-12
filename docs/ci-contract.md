# Shared CI contract

Consumers pin reusable workflows to a full commit SHA. Update pins through reviewed
pull requests. Triggers, permissions, and concurrency belong to the caller. A called
workflow cannot increase the caller's permissions. No interface uses `secrets: inherit`.
The public contract version and workflow catalog live in `contracts/ci-contract.json`.
The public validator checks that document against `contracts/ci-contract.schema.json`
with a pinned JSON Schema validator before accepting changes.

## Billing boundary

The public repository's own validator is intentionally a short standard hosted
job. Public repositories receive unlimited free use of standard GitHub-hosted
runners, and self-hosted jobs are free as well. Every reusable workflow in this
contract is self-hosted-only: the workflow owns the approved `trusted-ci` group
and `tart-ubuntu24-arm64` routing label, while caller inputs are checked as
assertions. An unavailable group queues the job rather than selecting hosted
compute. Billing follows the caller workflow, so this boundary is what keeps
private callers at zero hosted Actions minutes.

Private Copilot code-review infrastructure is a separate GitHub-managed workflow.
It must use GitHub's supported self-hosted ARC setup or be disabled/manual when a
repository requires zero hosted minutes; it is not routed through these ARM64
reusable workflows.

## Application verification

`elixir-ci.yml` takes `runner-group`, a single `runner-label` used with that group,
the complete `runner-labels` JSON contract, `image-os`, `elixir-version`,
and `otp-version`. The application provides `scripts/ci.sh --check`, its root pnpm
lockfile, Mix lockfiles, and the Node engine requirement in
`priv/pi-sdk-bridge/package.json`.

The job preserves PostgreSQL service behavior and caches pnpm, Mix, and PLT data.
Keys and restore prefixes bind the operating system, image identity, architecture,
and relevant runtime versions. Lockfiles distinguish dependency revisions. Cache
storage and visibility follow GitHub's caller-repository cache rules.

Full checkout history supplies the pull request base for changed-code verification
without putting a token in a fetch URL. Application checks remain repository-owned.

## Linked issues

`linked-issue.yml` accepts `runner-group`, `runner-label`, and the complete
`runner-labels` contract and is called only from
`pull_request_target`. Its job-level event guard is evaluated before `runs-on`, so
an invalid caller is skipped without reserving a trusted runner. Callers that require
the linked-issue check must keep their trigger contract at `pull_request_target`; a
caller that needs misuse to fail rather than skip must add that validation in its own
workflow. The reusable job checks out the exact event base SHA and executes the
caller's trusted `scripts/require-linked-issue.sh`. It never checks out PR-head
code. Fork PRs are included because this base-only, read-only check does not execute
untrusted PR content; other fork-triggered workflows remain outside `trusted-ci`.
The step-level guard remains defense in depth for an unexpected event context.
The caller grants only contents, pull requests, and issues read access.

## Infrastructure verification

`infrastructure-ci.yml` accepts `runner-group`, `runner-label`, and the complete
`runner-labels` contract and executes the caller-owned
`scripts/ci.sh --check`. The selected runner provides Bash, Docker, `jq`, Python 3,
and ShellCheck. Docker is required because the Elixir workflow starts its pinned
PostgreSQL service container. The workflow records the tested commit and runner
identity and accepts no secrets.

## Runner access and rollout

Private callers pass the group, routing label, and complete label contract through
their caller configuration so the reusable workflow can verify the declared
contract. The called workflow still hard-codes the approved group and routing
label, preventing a pull request from redirecting trusted execution. Public
validation uses GitHub-hosted Ubuntu runners. Runner groups must independently
exclude public repositories; labels alone are not an authorization boundary. The
group-plus-label object is used because GitHub's object form takes one routing
label while the group policy provides the remaining trust boundary.

Observe actual emitted check names before updating required checks. Acceptance
requires distinct fresh runners for cold and warm cache runs, failure and recovery,
cancellation cleanup, and real post-merge push and pull request events. Verify the
linked-issue trigger after its caller reaches the default branch.

Rollback restores the last working workflow SHA and runner configuration. It does
not require reversing repository ownership changes.
