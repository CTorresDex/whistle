Input: repository-name

Builds the repository for the current machine.  The build must be done via docker, if no docker is provided, you need to create one in order to ensure the build environment is sandboxed.

The build artifacts must be stored at builds/{repository-name} that must contains at least a `build.pug` describing the build tree with the following format.

```pug
    instructions
        | Optional arbitrary instructions
        
    file(src="string") // Describes an output file and its description, src is relative to the build/ or to the parent folder
        | Optional file description
    folder(src="string") // Describes an output folder and its description, src is relative to the build/ or to the parent folder
        | Optional file description
```