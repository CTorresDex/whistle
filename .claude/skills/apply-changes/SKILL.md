---
name: apply-changes
description: Read the changes described in the documentation and apply them to the code, without committing. Use when asked to sync documentation changes into the code but leave the commit to the user.
---

# Apply Changes

Applies documentation changes to the code, leaving them uncommitted for review.

## Steps

- Read the changes described in the documentation.
- Apply those changes to the code.
- Test the changes (see Testing rules below).
- Leave the changes uncommitted so the user can review them (`git status` reports the modified files).

## Testing rules

Every change MUST be tested before being handed off:

- **Backend changes** — covered by unit tests AND integration tests. Integration tests run in an isolated environment.
- **Frontend changes** — covered by UI tests, done similarly to integration tests (driving the real app).
- All integration/UI tests MUST run in a separate environment dedicated to testing — never against the development or production environment.

Not everything is re-tested on every change:

- The existing unit test suite verifies established behaviour automatically.
- Only **new features or changed behaviour** must additionally be tested at the user level (integration/UI tests).
