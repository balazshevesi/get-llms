# get-llms
📚 CLI tool to fetch [`llms.txt`](https://llmstxt.org/) files for your npm dependencies

## Install

Install it globally

```bash
npm install -g get-llms
```

or just run it with npx

```bash
npx get-llms
```

## Usage

### Basic Usage

Fetch `llms.txt` files for all dependencies in your `package.json`:

```bash
get-llms
```

### Fetch Specific Packages

You can fetch specific packages without needing a `package.json`:

```bash
get-llms zod react-native
```

## CLI Options

### Input Options

#### `--package, -p <path>`
Specify a custom path to `package.json` (default: `./package.json`)

```bash
get-llms --package ./packages/core/package.json
```

#### `--deps <types>`
Filter which dependency types to include. Comma-separated list of:
- `prod` - dependencies
- `dev` - devDependencies
- `peer` - peerDependencies
- `optional` - optionalDependencies
- `all` - all dependencies (default)

```bash
get-llms --deps prod,dev        # Only production and dev dependencies
get-llms --deps prod            # Only production dependencies
```

#### Positional Arguments
Specify packages directly to fetch:

```bash
get-llms react @types/react
```

### Output Options

#### `--output, -o <dir>`
Custom output directory (default: `docs/llms`)

```bash
get-llms --output ./context/dependencies
```

#### `--filename, -f <pattern>`
Filename pattern for output files. Use `{name}` as a placeholder for the package name (default: `{name}`)

```bash
get-llms --filename "llms-{name}"
```

#### `--extension, -e <ext>`
File extension for output files (default: `txt`)

```bash
get-llms --extension md
```

### Behavior Options

#### `--dry-run`
Preview what would be done without writing any files

```bash
get-llms --dry-run
```

#### `--fallback <strategy>`
Strategy when `llms.txt` is not found:
- `none` (default) - Skip packages without `llms.txt`
- `readme` - Fall back to README.md from GitHub
- `empty` - Create an empty file with a placeholder message
- `skip` - Same as `none`

```bash
get-llms --fallback readme     # Use README.md as fallback
get-llms --fallback empty      # Create empty files
```

##### Fallback Examples

**With readme fallback:**
```bash
get-llms --fallback readme
```

Results in:
```
✅ package-name: Using readme fallback -> package-name.txt
```

**With empty fallback:**
```bash
get-llms --fallback empty
```

Creates files containing:
```
# package-name

No llms.txt found for this package.
```

### Verbosity Options

#### `--quiet, -q`
Only show errors (minimal output)

```bash
get-llms --quiet
```

#### `--verbose, -v`
Show detailed output including:
- Network requests being made
- URLs being checked
- Debug information

```bash
get-llms --verbose
```

**Note:** If both `-q` and `-v` are specified, the last one wins.

### Filename Sanitization Options

Customize how special characters in package names are sanitized:

#### `--space-replace <char>`
Character to replace spaces in filenames (default: `_`)

```bash
get-llms --space-replace "_"
```

#### `--slash-replace <char>`
Character to replace slashes in filenames (default: `-`)

```bash
get-llms --slash-replace "-"
```

#### `--at-replace <char>`
Character to replace `@` in scoped package names (default: empty string)

```bash
get-llms --at-replace ""
```

**Example:** `@types/node` becomes `types-node.txt` with default settings

## Complete Examples

### Example 1: Fetch with readme fallback and save as markdown
```bash
get-llms \
  --fallback readme \
  --extension md \
  --output ./docs/handbook
```

### Example 2: Only production dependencies with custom naming
```bash
get-llms \
  --deps prod \
  --filename "{name}-reference" \
  --extension txt \
  --output ./context/prod
```

### Example 3: Fetch specific packages with custom sanitization
```bash
get-llms @types/node @types/react \
  --space-replace "_" \
  --slash-replace "_" \
  --at-replace "at_"
```

This might create:
- `at_types_node.txt`
- `at_types_react.txt`

### Example 4: Verbose dry run with all dependencies
```bash
get-llms \
  --deps all \
  --dry-run \
  --verbose
```

### Example 5: Complex workflow - production deps with empty fallback
```bash
get-llms \
  --deps prod \
  --fallback empty \
  --output ./docs/llms-production \
  --quiet
```

## Output Structure

By default, files are saved to:
```
docs/llms/
  ├── zod.txt
  ├── react-native.txt
  └── [package-name].txt
```

With `--fallback readme`, successful files may include fallback indicators in the summary.

## How It Works

The tool searches for `llms.txt` files in this order:

1. Check the package's `package.json` for an `llms` or `llmsFull` field
2. Try standard URLs: `{homepage}/llms.txt` and `{homepage}/docs/llms.txt`
3. If GitHub repository, search README for links containing "docs"
4. Apply fallback strategy if specified

```mermaid
flowchart TD
    A([package]) --> B{is there an 'llms' key in the 'package.json'?}

    B -- yes --> FOUND([we've found it])
    B -- no --> C{is the package homepage a github link?}

    C -- yes --> D{does the github 'readme.txt' mention the word 'docs' in a hyperlink?}
    C -- no --> E{does 'link/llms.txt' return a txt file?}

    D -- yes --> E
    D -- no --> NOFILE([there likely isn't a 'llms.txt' for that package Either use the 'README.txt', or use an external service like context7])

    E -- yes --> FOUND
    E -- no --> F{does 'link/docs/llms.txt' return a txt file?}

    F -- yes --> FOUND
    F -- no --> NOFILE
```

## Exit Codes

- `0` - Success
- `1` - Package.json not found or cannot be parsed

## Contributing

Issues and contributions welcome! Report bugs at: [https://github.com/balazshevesi/get-llms/issues](https://github.com/balazshevesi/get-llms/issues), or contact me on twitter [@balazs_hevesi](https://x.com/balazs_hevesi)

## Roadmap and vision

The [`llms.txt`](https://llmstxt.org/) spec is still young and un-opinionated. Some packages and some documentation-sites already ship an `llms.txt` file, others don’t, and the ones that do sometimes invent their own markdown dialect. 

As adoption grows we expect the format to stabilise, turning “antigenic-coding” into a first-class workflow.

### Specifying `llms.txt`

Today the cleanest way to publish documentation with an `llms.txt` is to add an `"llms"` key to `package.json`:

```json
"llms": "./README.txt"
```

When the registry starts indexing that field we’ll be able to fetch the *exact* documentation that and feed it into the coding-agent's context. (this will also require the URLs for fetching documentation versions to be standardized)

Example: [zod](https://github.com/colinhacks/zod/blob/main/packages/zod/package.json#L75)

### Practical integration

Because the format is still fluid, treat `llms.txt` as *best-effort* documentation:

- 90 % of the time an agent can slurp the file directly.  
- If it’s 25k tokens or more, you might want to fall back to a cache, a RAG layer, or a service such as [Context7](https://context7.com/). (AI-agents such have a limit on the file sizes they're willing to read, and will truncate the file to fit their context window)

### Why this will matter tomorrow

Vibe-coded apps are about to become legacy and enter a maintenance phase. When that happens, ai coding-agents will need the docs for **old** versions of the packages. `llms.txt` is the lowest-friction way to provide the ai with the correct documentation.

External services (like Context7) are great, but bundling the required context is simpler, cheaper.

## License

[MIT License](LICENSE)
