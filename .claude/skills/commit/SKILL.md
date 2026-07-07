---
name: commit
description: Read the changes described in the documentation, apply them to the code, then commit everything so the git working tree is left clean. Use when asked to sync documentation changes into the code and commit them.
---

# Commit

Applies documentation changes to the code and commits the result, leaving the git tree clean.

## Steps

- Read the changes described in the documentation.
- Apply those changes to the code.
- Commit all the changes.
- Verify the working tree is clean afterwards (`git status` reports nothing to commit).
