# PDL — VS Code / Cursor extension

TextMate grammar + language configuration for **`.pdl`** files (syntax highlighting, comments, brackets). No language server yet.

**Prefer VS Code** for installing this locally — Cursor’s Agents UI often hides local-extension install paths.

## Install in VS Code (recommended)

A packaged file is in this folder: **`pdl-0.1.0.vsix`**.

1. Open **VS Code** (not Cursor Agents Window).
2. **Cmd+Shift+P** → run **`Extensions: Install from VSIX...`**
3. Select:
   ```
   /Users/andrewjclark/Developer/pdl/editors/vscode-pdl/pdl-0.1.0.vsix
   ```
4. Reload if prompted (**Developer: Reload Window**).
5. Open a `.pdl` file — bottom-right language mode should be **PDL**.

### Terminal (if `code` is on your PATH)

```bash
code --install-extension /Users/andrewjclark/Developer/pdl/editors/vscode-pdl/pdl-0.1.0.vsix
```

Install the `code` shell command from VS Code: Cmd+Shift+P → **Shell Command: Install 'code' command in PATH**.

## Install in Cursor (if you still want it)

Same VSIX, same command name when the classic IDE is open:

1. Cmd+Shift+P → **Open IDE** (leave Agents Window)
2. Cmd+Shift+P → **`Extensions: Install from VSIX...`**
3. Pick `editors/vscode-pdl/pdl-0.1.0.vsix`

Do **not** look for this on the Marketplace — it’s local/unpublished.

## What it highlights

- Line comments (`//`)
- Strings and escapes
- Hex colors (`#RGB` / `#RRGGBB` / `#RRGGBBAA`)
- Numbers, booleans, `.dotEnum` cases
- Declarations (`component`, `primitive`, `variant`, `protocol`, `let`, …)
- Frame kinds (`layout` / `text` / `icon` / `media`)
- Type names and constructors (`Color`, `EdgeInsets`, …)
- `self`, `ForEach`, comparison / `@` opacity

## Develop / rebuild VSIX

Edit `syntaxes/pdl.tmLanguage.json`, then reinstall the VSIX (or reload if using Extension Development Host with F5).

```bash
cd editors/vscode-pdl
# if vsce works in your environment:
npx @vscode/vsce package --allow-missing-repository --skip-license
```

Optional: **Developer: Inspect Editor Tokens and Scopes** on a fixture under `test-fixtures/pdl/`.
