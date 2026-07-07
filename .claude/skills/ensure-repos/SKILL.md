---
name: ensure-repos
description: Clone or check out every repository declared in project.pug at its pinned commit. Use when asked to ensure repositories are present, sync the workspace's repositories, or prepare repositories before building.
---

# Ensure Repos

Reads `project.pug` and ensures every declared repository is available locally.

## Steps

- Ensure every repository is cloned at `repositories/{repository.name}` from `repository.url`.
- Check out the commit stated at `repository.commit`. If no commit is provided, keep it at the latest.
