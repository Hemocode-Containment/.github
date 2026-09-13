# Shared organization configuration

This public repository publishes the shared CI contract, reusable GitHub Actions
workflows, and default community files for Hemocode-Containment. Every other
repository in the organization is private. Application repositories own their
verification commands, dependencies, lockfiles, triggers, permissions, and
concurrency. The private `infrastructure` repository owns host provisioning,
runner lifecycle, credentials, and operational state.

## CI boundary

Private callers use the reusable workflows at a full commit SHA. The called
workflow owns the execution boundary:

- `trusted-ci` is the organization runner group, restricted to private repositories.
- The current capability is `hemocode-linux-arm64`, backed by a disposable Ubuntu
  ARM64 guest on the local Apple Silicon Mac.
- The workflow selects `trusted-ci` and `hemocode-linux-arm64` itself. Callers do
  not pass arbitrary group or label strings.
- If no matching runner is available, a private job queues. It never falls back
  to a GitHub-hosted runner.
- The public validator in this repository runs on a standard hosted runner. It
  does not use `trusted-ci`.

The current public contract preserves the required check context `CI / CI`. Keep
that workflow and job identity stable when changing implementation details.
Read [the machine-readable contract](contracts/ci-contract.json) and [the CI
contract](docs/ci-contract.md) before changing a shared workflow.

## Capability profiles

Routing labels describe guest capabilities, not the physical host or the VM
provider. The catalog reserves these stable profile identities:

| Profile | Routing label | Status |
| --- | --- | --- |
| Linux ARM64 | `hemocode-linux-arm64` | Active for the MVP |
| Linux x64 | `hemocode-linux-x64` | Planned |
| Windows x64 | `hemocode-windows-x64` | Planned |
| Windows ARM64 | `hemocode-windows-arm64` | Planned |

A machine advertises the guest profiles it can actually run. One physical host
may advertise more than one profile, so a Windows host can later expose Windows
and Linux guests through separate adapter-backed profiles. The MVP allows one
disposable guest at a time, which means different profiles can run sequentially
on the same host without coupling the public contract to a host operating system.

## Caller rules

Callers must pin reusable workflows to full SHAs and preserve their own triggers,
permissions, and concurrency. Do not use `secrets: inherit`. Do not place runner
credentials, MDM attestations, host paths, image credentials, or provider-specific
configuration in this public repository. Fork PRs do not execute untrusted code on
`trusted-ci`; the linked-issue exception checks only the trusted base SHA from
`pull_request_target`.

The public validator checks workflow syntax, the contract schema, exact runner
routing, and the absence of caller-selected routing inputs. It remains hosted so
the public repository can validate changes before any private runner is involved.

## Private host requirements

The private infrastructure repository contains the machine spec and host adapter.
The Mac bootstrap is intentionally fail-closed. Before it can install or enable
the runner, MDM must provide:

- supervised enrollment and a machine attestation,
- a signed privileged helper for the protected VM networking boundary,
- a headless login session with the required keychain available after reboot, and
- a credential broker for short-lived GitHub runner-management and update access.

The bootstrap performs these actions without an interactive administrator prompt.
If the Mac is not enrolled, the service stays disabled and private jobs remain
queued. See the private repository's [MDM contract](https://github.com/Hemocode-Containment/infrastructure/blob/main/docs/mdm-contract.md)
for the required integration boundary.

## Updating the contract

Change shared workflows and contract documents in a reviewed pull request. Merge
the public workflow change first, update private caller pins to the exact merged
SHA, and update the runner group's workflow allowlist atomically. Verify a real
private pull request, a public validator run, queue behavior with the host offline,
and the fork safety checks before changing required checks.
