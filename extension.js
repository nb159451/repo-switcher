const vscode = require('vscode');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

let cache; // { root, repos } of the last scan

function settings() {
  const cfg = vscode.workspace.getConfiguration('repoSwitcher');
  const raw = cfg.get('root') || '~/repos';
  const root = path.resolve(raw.replace(/^~(?=$|\/)/, os.homedir()));
  return {
    root,
    maxDepth: cfg.get('maxDepth') ?? 6,
    exclude: new Set(cfg.get('exclude') ?? []),
  };
}

// A folder is a standalone repo when it has a .git directory, or a .git file
// pointing to a worktree. A .git file pointing into .git/modules is a submodule.
async function isStandaloneRepo(dir) {
  const gitPath = path.join(dir, '.git');
  let stat;
  try {
    stat = await fs.lstat(gitPath);
  } catch {
    return false;
  }
  if (stat.isDirectory()) return true;
  if (!stat.isFile()) return false;
  const content = await fs.readFile(gitPath, 'utf8').catch(() => '');
  return /^gitdir:.*[\\/]worktrees[\\/]/m.test(content);
}

// Walks the tree below root. Stops descending at the first repo it finds, so
// repos nested inside other repos (submodules, vendored checkouts) never show up.
async function scan({ root, maxDepth, exclude }) {
  const repos = [];
  async function walk(dir, depth) {
    if (await isStandaloneRepo(dir)) {
      repos.push(dir);
      return;
    }
    if (depth >= maxDepth) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    // Symlinks are not followed (isDirectory() is false for them) to avoid cycles.
    const subdirs = entries.filter(
      (e) => e.isDirectory() && !e.name.startsWith('.') && !exclude.has(e.name),
    );
    await Promise.all(subdirs.map((e) => walk(path.join(dir, e.name), depth + 1)));
  }
  await walk(root, 0);
  return repos.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

async function getRepos(force) {
  const s = settings();
  if (force || !cache || cache.root !== s.root) {
    cache = { root: s.root, repos: await scan(s) };
  }
  return cache;
}

function currentFolder() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function openRepo(dir, newWindow) {
  return vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(dir), {
    forceNewWindow: newWindow,
  });
}

// Resolves to true (new window), false (this window) or undefined (cancelled).
// Without an open folder there is nothing to replace, so this window is used.
async function askNewWindow(dir) {
  const mode = vscode.workspace.getConfiguration('repoSwitcher').get('openIn');
  if (mode === 'newWindow') return true;
  if (mode === 'thisWindow' || !currentFolder()) return false;
  // A quick pick instead of a modal dialog: themed like VS Code and no system sound.
  const choice = await vscode.window.showQuickPick(
    [
      { label: '$(window) This Window', newWindow: false },
      { label: '$(empty-window) New Window', newWindow: true },
    ],
    { title: `Open "${path.basename(dir)}"`, placeHolder: dir },
  );
  return choice?.newWindow;
}

const newWindowButton = {
  iconPath: new vscode.ThemeIcon('empty-window'),
  tooltip: 'Open in new window',
};

async function showPicker() {
  const picker = vscode.window.createQuickPick();
  picker.placeholder = 'Open repository (Enter: this window, button: new window)';
  picker.matchOnDescription = true;
  picker.busy = true;
  picker.show();

  const current = currentFolder();
  const fill = ({ root, repos }) => {
    picker.title = `Repositories in ${root}`;
    picker.items = repos.map((dir) => ({
      label: `${dir === current ? '$(check) ' : '$(repo) '}${path.basename(dir)}`,
      description: path.relative(root, path.dirname(dir)) || undefined,
      dir,
      buttons: [newWindowButton],
    }));
    if (repos.length === 0) picker.placeholder = `No git repositories found in ${root}`;
  };

  // Show the cached list right away, then replace it with a fresh scan.
  if (cache && cache.root === settings().root) fill(cache);
  getRepos(true)
    .then(fill, (err) => vscode.window.showErrorMessage(`Repo Switcher: ${err.message}`))
    .finally(() => (picker.busy = false));

  picker.onDidAccept(async () => {
    const item = picker.selectedItems[0];
    picker.hide();
    if (!item || item.dir === current) return;
    const newWindow = await askNewWindow(item.dir);
    if (newWindow !== undefined) openRepo(item.dir, newWindow);
  });
  picker.onDidTriggerItemButton(({ item }) => {
    picker.hide();
    openRepo(item.dir, true);
  });
  picker.onDidHide(() => picker.dispose());
}

function activate(context) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000);
  status.command = 'repoSwitcher.switch';
  const updateStatus = () => {
    const folder = currentFolder();
    status.text = `$(repo) ${folder ? path.basename(folder) : 'Open repository'}`;
    status.tooltip = folder ? `${folder}\nClick to switch repository` : 'Click to open a repository';
  };
  updateStatus();
  status.show();

  context.subscriptions.push(
    status,
    vscode.commands.registerCommand('repoSwitcher.switch', showPicker),
    vscode.commands.registerCommand('repoSwitcher.refresh', async () => {
      const { repos } = await getRepos(true);
      vscode.window.showInformationMessage(`Repo Switcher: ${repos.length} repositories found.`);
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(updateStatus),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('repoSwitcher')) cache = undefined;
    }),
  );

  // Warm the cache so the first click is instant.
  getRepos(false).catch(() => {});
}

module.exports = { activate, deactivate() {} };
