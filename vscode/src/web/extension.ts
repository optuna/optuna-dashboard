import * as vscode from "vscode"

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "optuna-dashboard" is now active in the web extension host!'
  )

  const disposable = vscode.commands.registerCommand(
    "optuna-dashboard.openOptunaDashboard",
    async (fileUri: vscode.Uri) => {
      // In VS Code, the path separator of fileUri is always '/'
      // even when using Windows.
      const title = fileUri.path.split("/").pop() || "Optuna Dashboard"
      const panel = vscode.window.createWebviewPanel(
        "optunaDashboard",
        title,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      )

      const asset = (name: string) =>
        panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", name)
        )

      const handleMessage = async (message: { type: string }) => {
        switch (message.type) {
          case "webviewDidLoad": {
            try {
              await panel.webview.postMessage({
                type: "optunaStorage",
                content: toArrayBuffer(await readFile(fileUri)),
                // The Webview starts the Worker and loads the wasm from these,
                // since it may not hand an extension path to a Worker.
                workerUri: asset("storage-worker.js").toString(),
                sqliteWasmUri: asset("sqlite3.wasm").toString(),
              })
            } catch (error: unknown) {
              console.error("Failed to load Optuna storage", error)
            }
            break
          }
        }
      }
      const messageDisposable = panel.webview.onDidReceiveMessage(handleMessage)
      panel.onDidDispose(() => messageDisposable.dispose())
      // Last: the Webview asks for the storage as soon as it has loaded, and the
      // listener above has to be in place by then.
      panel.webview.html = getWebviewContent(
        asset("bundle.js"),
        panel.webview.cspSource
      )
    }
  )

  context.subscriptions.push(disposable)
}

async function readFile(uri: vscode.Uri): Promise<Uint8Array> {
  return vscode.workspace.fs.readFile(uri)
}

// workspace.fs.readFile() hands back a Node Buffer in the desktop extension
// host. The Webview message serializer recognizes a typed array by its exact
// constructor name and passes those bytes out of band, but Buffer is not one of
// the names it knows: it falls through to JSON.stringify(), which turns the
// bytes into an object keyed by index. An ArrayBuffer is recognized whatever it
// came from, so send one.
function toArrayBuffer(content: Uint8Array): ArrayBuffer {
  const buffer = content.buffer as ArrayBuffer
  if (content.byteOffset === 0 && content.byteLength === buffer.byteLength) {
    return buffer
  }
  // A Buffer can be a window onto a larger pooled allocation, so copy out the
  // bytes that belong to this file. Note that Buffer.slice() would not: unlike
  // Uint8Array.slice() it returns a view.
  return buffer.slice(
    content.byteOffset,
    content.byteOffset + content.byteLength
  )
}

// 'webviewDidLoad' is posted by the bundle once it listens for messages, rather
// than from an inline script on DOMContentLoaded: React schedules the effect that
// installs that listener, so it can run after the event and miss the answer.
function getWebviewContent(indexJsUri: vscode.Uri, cspSource: string): string {
  // Starting from default-src 'none', every source the dashboard needs is listed:
  // the bundle and the assets it fetches, 'wasm-unsafe-eval' to compile
  // sqlite3.wasm, blob: for the storage Worker, inline styles for emotion, and
  // data: images, which the Webview host itself loads to probe webp support.
  const csp = [
    "default-src 'none'",
    `script-src ${cspSource} 'wasm-unsafe-eval'`,
    "worker-src blob:",
    `connect-src ${cspSource}`,
    `img-src ${cspSource} data: blob:`,
    `font-src ${cspSource}`,
    `style-src ${cspSource} 'unsafe-inline'`,
  ].join("; ")
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp};">
  <title>Optuna Dashboard (Wasm ver.)</title>
  <script type="module" crossorigin src="${indexJsUri}"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
`
}

export function deactivate() {}
