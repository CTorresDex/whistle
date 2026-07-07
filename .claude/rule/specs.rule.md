This project source code is written in **pug** language for providing structure. The entry point is the `project.pug` and it defines how should the app work.

## The Project Pug
The `project.pug` is the entry point and manifest file of this project, it defines dependencies and apps to build.

### Repositories
```pug
// Syntax:
repository#[name](url="[git-url]")
```

Repositories are open source dependencies that are cloned and built locally for apps usages


## Non Functional Requirements
Build process and app running must all be done via docker, no local dependencies should need to be installed in order to run the apps or scripts.