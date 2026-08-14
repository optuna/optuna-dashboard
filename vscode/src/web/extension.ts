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

      const indexJsUri = vscode.Uri.joinPath(
        context.extensionUri,
        "assets",
        "bundle.js"
      )

      const appPath = panel.webview.asWebviewUri(indexJsUri)

      panel.webview.html = getWebviewContent(appPath)
      const handleMessage = async (message: { type: string }) => {
        switch (message.type) {
          case "webviewDidLoad": {
            await panel.webview.postMessage({
              type: "optunaStorage",
              content: toArrayBuffer(await readFile(fileUri)),
            })
            break
          }
        }
      }
      const messageDisposable = panel.webview.onDidReceiveMessage(handleMessage)
      panel.onDidDispose(() => messageDisposable.dispose())
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

function getWebviewContent(indexJsUri: vscode.Uri): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Optuna Dashboard (Wasm ver.)</title>
  <script type="module" crossorigin src="${indexJsUri}"></script>
  <script>
    (function() {
      const vscodeApi = acquireVsCodeApi();
      window.addEventListener('DOMContentLoaded', (event) => {
        vscodeApi.postMessage({ type: 'webviewDidLoad' })
      })
    }())
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
`
}

export function deactivate() {}
