# Repo Switcher

Switch between the git repositories on your machine from one list, like the project dropdown in JetBrains IDEs.

Repo Switcher searches a root folder (default `~/repos`) for git repositories and shows them in a quick pick. The current repository is shown at the far left of the status bar; click it, or press `Ctrl+Alt+R`, to switch.

## Features

- **One click to switch:** pick a repository and choose *This Window* or *New Window*, or use the window button next to an entry to open it in a new window right away.
- **Finds repositories in subfolders:** the root is searched recursively, so grouped layouts such as `~/repos/clients/acme/website` work.
- **No nested repositories:** the search stops at the first repository it finds on each path. Submodules, vendored checkouts and other repositories inside a repository are not listed.
- **Fast:** hidden folders, symlinks and common dependency folders (`node_modules`, `vendor`, …) are skipped.
- **Works in Remote WSL, SSH and containers:** the extension runs where your files are.
- **No dependencies:** a single JavaScript file, no telemetry, no network access.

## Commands

| Command | Default shortcut |
| --- | --- |
| `Repo Switcher: Switch Repository` | `Ctrl+Alt+R` |
| `Repo Switcher: Rescan Repositories` | – |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `repoSwitcher.root` | `~/repos` | Folder that is searched for repositories. `~` expands to your home directory. |
| `repoSwitcher.openIn` | `ask` | Where a picked repository opens: `ask`, `thisWindow` or `newWindow`. |
| `repoSwitcher.maxDepth` | `6` | How many folder levels below the root are searched. |
| `repoSwitcher.exclude` | `node_modules`, `vendor`, `dist`, `build`, `target`, `venv`, `.venv` | Folder names that are never searched. Hidden folders are always skipped. |

## What counts as a repository

A folder counts as a repository when it contains a `.git` directory, or a `.git` file that points to a git worktree. A `.git` file that points to a submodule does not count.

## License

[MIT](https://github.com/nb159451/repo-switcher/blob/main/LICENSE). Provided as is, without warranty or support.
