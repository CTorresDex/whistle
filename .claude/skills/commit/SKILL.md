---
name: commit
description: Read the changes described in the documentation, apply them to the code, then commit everything so the git working tree is left clean. Use when asked to sync documentation changes into the code and commit them.
---

# Commit

Applies documentation changes to the code and commits the result, leaving the git tree clean.

## Steps

- Read the changes described in the documentation.
- Apply those changes to the code.
- Test the changes (see Testing rules below).
- Commit all the changes.
- Verify the working tree is clean afterwards (`git status` reports nothing to commit).

## Testing rules

Every change MUST be tested before committing:

- **Backend changes** — covered by unit tests AND integration tests. Integration tests run in an isolated environment.
- **Frontend changes** — covered by UI tests, done similarly to integration tests (driving the real app).
- All integration/UI tests MUST run in a separate environment dedicated to testing — never against the development or production environment.

Not everything is re-tested on every commit:

- The existing unit test suite verifies established behaviour automatically.
- Only **new features or changed behaviour** must additionally be tested at the user level (integration/UI tests).