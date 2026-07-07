---
name: build
description: Build a repository for the current machine inside a sandboxed Docker environment, then record the resulting build tree. Use when asked to build a repository (input is a repository name) and produce reproducible, sandboxed build artifacts.
---

# Build

Builds the repository named by the `repository-name` input for the current machine.

## Requirements

- The build MUST run via Docker so the build environment is sandboxed. If no Docker setup is provided, create one before building.
- Store build artifacts under `builds/{repository-name}/`.
- Each build output directory MUST contain at least a `build.pug` describing the build tree.

## `build.pug` format

```pug
instructions
    | Optional arbitrary instructions

file(src="string") // Describes an output file and its description; src is relative to build/ or to the parent folder
    | Optional file description
folder(src="string") // Describes an output folder and its description; src is relative to build/ or to the parent folder
    | Optional folder description
```
