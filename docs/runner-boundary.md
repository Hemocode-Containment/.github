# Trusted CI runner boundary

The `trusted-ci` group is reserved for private repositories whose workflows have
been reviewed against the public contract. Configure it as a private-only group,
disable public repository access, and restrict it to the exact reusable workflow
paths and reviewed SHAs. The group provides the authorization boundary; labels
only select a capability within that boundary.

The active MVP capability is `hemocode-linux-arm64`, backed by a disposable Ubuntu
24.04 ARM64 guest. The host is an implementation detail. Future capabilities use
the same provider-neutral catalog for Linux x64, Windows x64, and Windows ARM64.
A physical host may advertise several profiles, including Windows and Linux
guests, when its adapter can prove those capabilities.

Fresh guests receive no host directory, SSH-agent, clipboard, or host Docker
socket access. The runner is ephemeral, accepts one job, and is deleted after the
job. The base image is never rebuilt from a guest that executed repository code.

The linked-issue `pull_request_target` check is the only fork exception. It checks
out only the trusted base SHA, uses read-only metadata, and does not execute
untrusted PR-head code. Other fork-triggered workflows are skipped before trusted
runner allocation.

Private workflows contain no GitHub-hosted fallback. When the Mac is offline,
asleep, logged out, or at capacity, private jobs remain queued. The public
`.github` validator runs on a standard hosted runner because it is a public
repository and does not need trusted infrastructure.

Operational provisioning, MDM integration, credentials, and recovery stay in the
private `infrastructure` repository. Do not copy those details into this public
repository.
