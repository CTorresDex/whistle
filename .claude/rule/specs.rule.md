This project source code is written in **pug** language for providing structure. The entry point is the `project.pug` and it defines how should the app work.

## How to Read the Pug in This Project

Although pug is commonly known as an HTML pre-language, **this is not HTML**. Here pug is used as a structured way of writing specs — think of it as pre-compiled, syntactic markdown. Elements do not map 1-1 to HTML tags or any runtime construct; they are semantic building blocks, and the vocabulary is open: new elements, qualifiers and attributes may be introduced in the future. When you find an element not documented here, interpret it through the conventions below.

### Core Syntax Conventions

- **Indentation** expresses ownership/nesting: children belong to their parent element.
- **`element#name`** — the `#` assigns an identifier to the element (`entity#user`, `app#server`, `throws#VideoNotFound`).
- **`element.qualifier`** — dots attach qualifiers. The first qualifier usually states the *kind/type/variant* (`endpoint.get`, `returns.json`, `type#id.uint`, `title.text`), and subsequent ones are *modifiers/flags* (`id.id.pkey`, `username.username.unique.index`).
- **`element(attr=value, ...)`** — attributes configure the element (`url="..."`, `path="/health"`, `port=8080`, `min=1, max=50`, `auth="user"`).
- **`| piped text`** — human-readable spec prose describing the parent element. It is **markdown** (e.g. `**yt-dlp**`) and is first-class specification: behavior described in prose is as binding as behavior described structurally.
- **Trailing inline text** after an element is a short description of it (`password.password.private Stored as bcrypt, 12 rounds`).
- **`// comment`** — comments/annotations for the reader.
- **Composition** — specs are split across files and stitched together with `include other.pug` or a `src="path.pug"` attribute (`page#home(src="./pages/home.pug")`).
- **Control flow** (`if` / `else`, `each item in collection`, `- code(...)`) describes *behavior*, e.g. conditional UI or `- redirect("/login")`.
- **`{expression}`** interpolates data in scope (`{audio.title}`, `{audio.id}.opus`).
- **`target::method(...)`** references an action or capability of another named element (`click="download-modal::open"`, `click="action::play()"`). **`&`** refers to the enclosing named element itself (`&::close` closes the modal the button lives in).
- **Name-based type inference** — when a field/arg has no explicit type qualifier, its type is inferred from a declared `type` or entity field with a matching or equivalent name (`arg#username`, `arg#pagination`, `route-param#id`). An explicit qualifier overrides inference (`arg#url.youtube-url`).

## The Project Pug

The `project.pug` is the entry point and manifest file of this project, it defines dependencies and apps to build.

### Repositories

```pug
// Syntax:
repository#[name](url="[git-url]", commit="[optional-pinned-commit]")
```

Repositories are open source dependencies that are cloned and built locally for apps usages. They live under `repositories/{name}` and their build artifacts under `builds/{name}`. When `commit` is omitted the latest is used.

### Types

```pug
types(src="[path-to-types.pug]")
```

Imports the project-wide type definitions, available to every app, entity and endpoint.

### Apps

```pug
app#[name](src="[path-to-app.pug]")
```

Declares an application to build. Each app spec lives in its own folder under `apps/{name}/`.

Every app is built into `lib/{name}`, and the build stays fully scoped to that folder: it contains everything the app needs to build and run — source, config and its **own Docker setup** (Dockerfile, compose, etc.) — independent from the other apps. Nothing of an app's build may live outside its `lib/{name}` folder, and per the non functional requirements it must build and run via Docker only.

## Types (`types.pug`)

Types are the shared vocabulary for data shapes, referenced everywhere by name via dot qualifiers or name inference.

```pug
// Syntax:
type#[name].[base]
    | Markdown prose stating constraints and semantics
    [field][.type]([constraints])   // only for object-like types
```

- `[base]` is a primitive base: `string`, `uint`, `object`, etc. It may be omitted when the prose fully defines it (`type#text`).
- Constraints can be expressed in prose (`| Min Length: 1`) or as attributes on fields (`limit.uint(min=1, max=50)`) — both are valid; prose is used for constraints that don't fit an attribute.
- Object types list their fields as children, following the same field conventions as entities (name, type qualifier or inference, description).

## Entities (`src/entities.pug`)

Entities describe the persistent data models (database tables/collections) shared by the apps.

```pug
// Syntax:
entity#[name]
    | Markdown description of the entity
    [field].[type].[modifiers...] [optional inline description]
```

- Each child line is a field: first segment is the field name, first qualifier its type (a declared `type`), remaining qualifiers are modifiers.
- Known field modifiers (open set): `pkey` (primary key), `unique`, `index`, `private` (never exposed through APIs).
- Entities correlate with other resources when stated in prose (e.g. audio files on disk named `{audio.id}.opus` map 1-1 to rows of the `audio` entity).

## Apps

An app spec (e.g. `apps/server/server.pug`, `apps/webapp/webapp.pug`) declares its technology stack, its runtime resources, and includes or defines its functional spec.

### Stack

```pug
stack
    [aspect] [choice]
```

Free-form key/value pairs declaring the technology decisions (`lang`, `runtime`, `db`, `engine`, `framework`, ...). The build must honor these choices.

### Environment Variables

```pug
envvar#[name](default="[default-value-or-strategy]")
```

Declares configuration the app receives from the environment. Defaults may be a literal or a strategy (e.g. `default="randomUUID"` — a random default that must persist between sessions).

### Disks

```pug
disk: folder(path="[mount-path]")
    | Markdown description of what is stored and its layout/naming rules
```

Declares persistent storage the app uses beyond the database.

### Auth Schemes

```pug
auth#[name]
    | Markdown description of how authentication works for this scheme
```

Declares an authentication scheme. Endpoints and other elements opt in by referencing it: `(auth="[name]")`.

### Includes

Large app specs are split into files and composed with `include [file].pug`.

## HTTP Servers

```pug
http-server(port=[port])
    endpoint.[method](path="[path]", auth="[optional-auth-scheme]")
        | Markdown description of the endpoint behavior
        ...
```

Children of an `endpoint` (all optional, open set):

- **`arg#[name][.type]`** — an input argument. Type inferred from the name when omitted. Object-typed args (e.g. `arg#pagination`) expand to their type's fields.
- **`route-param#[name][.type]`** — a parameter interpolated in the `path` (`/audio/{id}.opus`).
- **`throws#[ErrorName] [description]`** — an error the endpoint can produce. Error names are PascalCase identifiers.
- **`guard`** — a protection policy applied before the endpoint runs, described with key/value children (e.g. `discriminator`, `max-retries`, `refresh-time`) plus the `throws#...` it raises when tripped.
- **`returns.[kind]`** — the response. Known kinds (open set):
    - `returns.status [code]` — bare status code response.
    - `returns.json` — JSON body; children are the response fields (`[name][.type] [description]`).
    - `returns.array [description]` — a list response; the item shape comes from the description/context (e.g. paginated entities).
    - `returns.file [description]` — serves a file.
    - `returns.long-polling` — a progressive/streaming response; children describe the streamed fields.

## Web Apps (Pages)

Webapp specs describe UI **structurally, not as HTML**. Elements are semantic components (`navbar`, `list`, `modal`, `play-bar`, `progress-bar`, `row`, `title`, ...) — the implementation decides the actual markup/components. Unknown elements are custom components defined by their prose, children and attributes.

### Pages

```pug
page#[name](route="[route]")        // inline definition
page#[name](src="[path-to.pug]")    // defined in its own file
```

When `route` is omitted it defaults to `/[name]`. A page's body describes its content and behavior:

- **Control flow** — `if`/`else` over UI state (`isUserLoggedIn`, `paused`) and inline code for behavior (`- redirect("/home")`).
- **`form(endpoint="[path]")`** — a form that submits to a server endpoint; `input#[name][.type]` children map to the endpoint's args, `button.submit [label]` submits it.
- **`list(endpoint="[path]")`** — a data-driven collection bound to an endpoint, iterated with `each item in items`.
- **Events** — `click="[target]::[method](...)"` wires interactions to named elements or actions; `&` targets the enclosing element (`&::close`).
- **`modal#[name]`** — an overlay opened/closed via `::open` / `::close`; its prose defines its interaction rules.
- **`action#[name](args=[...])`** — a named client-side behavior defined by prose, invocable from events as `action::[name](...)`.
- **Presentation/state qualifiers** — dots express layout or state, e.g. `.align-left`, `.align-right`, `.hidden` (open set).
- **Attributes** carry component config: `icon="play"`, `redirect-to="/signup"`, etc.
- **Literal label text** on buttons/spans is the user-facing copy, in the product's language.

## Non Functional Requirements

Build process and app running must all be done via docker, no local dependencies should need to be installed in order to run the apps or scripts.
