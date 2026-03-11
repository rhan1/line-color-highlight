import * as vscode from 'vscode';

interface ColorOption {
  label: string;
  backgroundColor: string;
  color: string;
}

function styleKey(bg: string, fg: string, bold: boolean): string {
  return `${bg}|${fg}|${bold}`;
}

// Per-file map: line number -> styleKey
const highlightsByFile = new Map<string, Map<number, string>>();

// styleKey -> decoration type
const decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

// styleKey -> color option
const styleOptions = new Map<string, ColorOption>();

function getBoldSetting(): boolean {
  return vscode.workspace.getConfiguration('lineColorHighlight').get<boolean>('boldText', true);
}

function getOrCreateDecorationType(opt: ColorOption): string {
  const bold = getBoldSetting();
  const key = styleKey(opt.backgroundColor, opt.color, bold);
  if (!decorationTypes.has(key)) {
    const dt = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: opt.backgroundColor,
      color: opt.color,
      fontWeight: bold ? 'bold' : 'normal',
      overviewRulerColor: opt.backgroundColor,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });
    decorationTypes.set(key, dt);
    styleOptions.set(key, opt);
  }
  return key;
}

function refreshDecorations(editor: vscode.TextEditor) {
  const uri = editor.document.uri.toString();
  const fileHighlights = highlightsByFile.get(uri);

  const linesByStyle = new Map<string, number[]>();

  if (fileHighlights) {
    for (const [line, key] of fileHighlights) {
      if (!linesByStyle.has(key)) {
        linesByStyle.set(key, []);
      }
      linesByStyle.get(key)!.push(line);
    }
  }

  for (const [key, dt] of decorationTypes) {
    const lines = linesByStyle.get(key) || [];
    const ranges = lines.map((line) => new vscode.Range(line, 0, line, 0));
    editor.setDecorations(dt, ranges);
  }
}

function refreshAllVisibleEditors() {
  for (const editor of vscode.window.visibleTextEditors) {
    refreshDecorations(editor);
  }
}

interface SavedEntry {
  line: number;
  backgroundColor: string;
  color: string;
}

export function activate(context: vscode.ExtensionContext) {
  // Restore saved highlights
  const saved = context.workspaceState.get<Record<string, SavedEntry[]>>('lineHighlights');
  if (saved) {
    for (const [uri, entries] of Object.entries(saved)) {
      const map = new Map<number, string>();
      for (const entry of entries) {
        const key = getOrCreateDecorationType({
          label: '',
          backgroundColor: entry.backgroundColor,
          color: entry.color,
        });
        map.set(entry.line, key);
      }
      highlightsByFile.set(uri, map);
    }
  }

  refreshAllVisibleEditors();

  // Highlight line command
  const highlightCmd = vscode.commands.registerCommand(
    'lineColorHighlight.highlightLine',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const config = vscode.workspace.getConfiguration('lineColorHighlight');
      const colors = config.get<ColorOption[]>('colors', []);

      // Determine current highlight on the primary selection line (to show check mark)
      const uri = editor.document.uri.toString();
      const fileHighlights = highlightsByFile.get(uri);
      const currentLine = editor.selection.active.line;
      const currentKey = fileHighlights?.get(currentLine);
      const currentOpt = currentKey ? styleOptions.get(currentKey) : undefined;

      const pick = await vscode.window.showQuickPick(
        colors.map((c) => {
          const isActive = currentOpt
            && currentOpt.backgroundColor === c.backgroundColor
            && currentOpt.color === c.color;
          return {
            label: `${isActive ? '$(check) ' : '$(circle-filled) '}${c.label}`,
            description: c.backgroundColor,
            _opt: c,
          };
        }),
        { placeHolder: 'Pick a highlight color' }
      );

      if (!pick) return;

      const opt = pick._opt;
      const key = getOrCreateDecorationType(opt);

      if (!highlightsByFile.has(uri)) {
        highlightsByFile.set(uri, new Map());
      }

      const fh = highlightsByFile.get(uri)!;
      for (const sel of editor.selections) {
        for (let line = sel.start.line; line <= sel.end.line; line++) {
          // Remove old highlight first (prevents overlap)
          fh.delete(line);
          // Apply new
          fh.set(line, key);
        }
      }

      refreshDecorations(editor);
      saveState(context);
    }
  );

  // Remove highlight on current line(s)
  const removeCmd = vscode.commands.registerCommand(
    'lineColorHighlight.removeHighlight',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const uri = editor.document.uri.toString();
      const fileHighlights = highlightsByFile.get(uri);
      if (!fileHighlights) return;

      for (const sel of editor.selections) {
        for (let line = sel.start.line; line <= sel.end.line; line++) {
          fileHighlights.delete(line);
        }
      }

      refreshDecorations(editor);
      saveState(context);
    }
  );

  // Remove all highlights in the current file
  const removeAllCmd = vscode.commands.registerCommand(
    'lineColorHighlight.removeAllHighlights',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const uri = editor.document.uri.toString();
      highlightsByFile.delete(uri);
      refreshDecorations(editor);
      saveState(context);
    }
  );

  // Re-apply when switching editors
  const editorChange = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      refreshDecorations(editor);
    }
  });

  // Adjust line numbers when text is edited
  const docChange = vscode.workspace.onDidChangeTextDocument((e) => {
    const uri = e.document.uri.toString();
    const fileHighlights = highlightsByFile.get(uri);
    if (!fileHighlights || e.contentChanges.length === 0) return;

    const updated = new Map<number, string>();
    const entries = [...fileHighlights.entries()].sort((a, b) => a[0] - b[0]);

    for (const change of e.contentChanges) {
      const startLine = change.range.start.line;
      const oldEndLine = change.range.end.line;
      const newLineCount = change.text.split('\n').length - 1;
      const oldLineCount = oldEndLine - startLine;
      const lineDelta = newLineCount - oldLineCount;

      for (const [line, key] of entries) {
        if (line < startLine) {
          updated.set(line, key);
        } else if (line > oldEndLine) {
          updated.set(line + lineDelta, key);
        }
      }
    }

    highlightsByFile.set(uri, updated);

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === uri) {
      refreshDecorations(editor);
    }
    saveState(context);
  });

  // Rebuild decoration types when config changes (e.g. bold toggled)
  const configChange = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('lineColorHighlight')) {
      // Dispose old decoration types
      for (const dt of decorationTypes.values()) {
        dt.dispose();
      }
      decorationTypes.clear();

      // Rebuild all highlights with new settings
      for (const [uri, map] of highlightsByFile) {
        const rebuilt = new Map<number, string>();
        for (const [line, oldKey] of map) {
          const opt = styleOptions.get(oldKey);
          if (opt) {
            const newKey = getOrCreateDecorationType(opt);
            rebuilt.set(line, newKey);
          }
        }
        highlightsByFile.set(uri, rebuilt);
      }
      refreshAllVisibleEditors();
    }
  });

  const visibleChange = vscode.window.onDidChangeVisibleTextEditors(() => {
    refreshAllVisibleEditors();
  });

  context.subscriptions.push(
    highlightCmd,
    removeCmd,
    removeAllCmd,
    editorChange,
    docChange,
    configChange,
    visibleChange
  );
}

function saveState(context: vscode.ExtensionContext) {
  const data: Record<string, SavedEntry[]> = {};
  for (const [uri, map] of highlightsByFile) {
    const entries: SavedEntry[] = [];
    for (const [line, key] of map) {
      const opt = styleOptions.get(key);
      if (opt) {
        entries.push({ line, backgroundColor: opt.backgroundColor, color: opt.color });
      }
    }
    data[uri] = entries;
  }
  context.workspaceState.update('lineHighlights', data);
}

export function deactivate() {
  for (const dt of decorationTypes.values()) {
    dt.dispose();
  }
}
