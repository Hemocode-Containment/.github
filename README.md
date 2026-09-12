# Shared organization configuration

This public repository publishes the shared CI contract, reusable GitHub Actions
workflows, and default community files for Hemocode-Containment. Application
repositories own their verification commands,
dependencies, and lockfiles. Operational configuration stays private.

Reusable workflows are selected explicitly by thin caller workflows and pinned to
full commit SHAs. Callers retain their triggers, permissions, concurrency, and
check names; called workflows receive only the declared inputs and secrets. The
`trusted-ci` group and its routing label are selected together, and the group
policy excludes public repositories. Private callers use that self-hosted contract
explicitly; if the group is unavailable, the job queues instead of falling back to
a GitHub-hosted runner.

The small `CI` validator in this public repository runs on a standard GitHub-hosted
runner by design. GitHub does not charge standard hosted minutes for public
repositories, while self-hosted usage is free. The reusable workflows contain no
hosted runner label, so calling them from a private repository does not consume its
hosted-minute allowance.

The initial interfaces support the containment-loop Elixir application and Python
and Bash infrastructure validation. See [the CI contract](docs/ci-contract.md),
the [machine-readable contract](contracts/ci-contract.json), and the
[runner boundary](docs/runner-boundary.md).
