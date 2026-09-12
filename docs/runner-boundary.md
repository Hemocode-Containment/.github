# Trusted CI runner boundary

The `trusted-ci` group is reserved for private repositories whose workflows have
been reviewed against this public contract. In this pilot it is a disposable,
no-secrets CI pool; the name does not grant deployment or credential access. Its
initial routing label is `tart-ubuntu24-arm64`, backed by a disposable Ubuntu 24.04
ARM64 guest. Public repositories and untrusted PR-head workflows do not use this group. The linked-issue
`pull_request_target` check is an explicit exception: it checks out only the trusted
base SHA, uses read-only metadata, and therefore still runs for fork PRs so the issue
requirement cannot be bypassed by opening a fork.

The group is an access boundary, not a substitute for workflow review. Callers
must select both the group and the routing label, while the complete label list
(`self-hosted`, `Linux`, `ARM64`, and `tart-ubuntu24-arm64`) remains part of the
declared contract. GitHub's group-plus-label form accepts one routing label; the
group policy and runner registration provide the remaining boundary.

Fresh guests receive no host directory, SSH-agent, or host Docker-socket access.
Operational provisioning and credentials are documented in the private
`infrastructure` repository.

Reusable workflows never contain a GitHub-hosted label. Private callers therefore
remain queued when the Mac is offline instead of silently using billable hosted
minutes. The public `.github` validator is intentionally outside this group because
standard hosted execution is free for a public repository.
