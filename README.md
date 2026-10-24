# Shared issue relationship check

The reusable `.github/workflows/require-linked-issue.yml` checks fresh GitHub
`closingIssuesReferences(includeUserLinkedIssues: true)` data. At least one
visible real issue relationship is required, including a manual Development link.
A plain text mention is insufficient. There is no extra body keyword requirement,
no author/bot exemption and no same-repository restriction. Cross-repository links
are accepted only when visible to the caller's repository token; API/access errors
fail closed without printing private issue data or requesting additional access.

## Calling and checking

Pin the reusable workflow to a reviewed full commit SHA. Use a caller job named
`Require linked issue`; the reusable job is named `linked-issue`, yielding the
shared job/check display `Require linked issue / linked-issue`. Verify the actual
provider-reported context before configuring any required-check rule.

Callers should cover every PR target branch. A public caller can use
`pull_request` with read-only permissions because no PR checkout or execution is
performed. A private caller can use the existing trusted `pull_request_target`
policy, passing only the numeric PR identity. The reusable validator executes its
pinned code, never PR-head code. Do not inherit secrets. Repository-token rights
are limited to read-only contents, pull requests and issues.

Manual `workflow_dispatch` accepts a PR number and checks current relationships.
The Actions **Re-run jobs** control also queries current relationships afresh.
Sidebar link/unlink has no documented pull-request Actions event: adding a link
requires an explicit rerun to recover a failed result; removing a link can leave a
stale success until an explicit rerun or covered PR event. This check does not
promise atomic merge-time freshness or enforce an organization rule by itself.
Do not enable required checks until callers, token visibility and exact context
names are validated. Stacked/non-default-target PRs are covered by callers with
no branch filter; issue visibility still follows GitHub's API and token boundary.

Run synthetic tests with `node --test tests/require-linked-issue.test.cjs`.
The tests exercise the exact script embedded in the reusable workflow without
GitHub access, issue creation or any change to repository settings.
