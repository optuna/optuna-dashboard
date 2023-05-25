import * as vscode from "vscode"

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "optuna-dashboard" is now active in the web extension host!'
  )

  let disposable = vscode.commands.registerCommand(
    "optuna-dashboard.openOptunaDashboard",
    async (fileUri: vscode.Uri) => {
      // In VSCode, the path separator of fileUri is always '/'
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

      const storageContentBase64 = await readFileAsBase64(fileUri)
      panel.webview.postMessage({
        type: "optunaStorage",
        content: storageContentBase64,
      })
    }
  )

  context.subscriptions.push(disposable)
}

async function readFileAsBase64(uri: vscode.Uri): Promise<string> {
  const uint8Array = await vscode.workspace.fs.readFile(uri)
  const base64 = uint8ArrayToBase64(uint8Array)
  return base64
}

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  const binString = Array.prototype.map
    .call(uint8Array, function (ch) {
      return String.fromCharCode(ch)
    })
    .join("")
  return btoa(binString)
}

function getWebviewContent(indexJsUri: vscode.Uri): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
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
