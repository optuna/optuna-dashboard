import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { describe, it } from "node:test"
import { Worker as NodeWorker } from "node:worker_threads"

import { StorageWorkerClient } from "../pkg/worker_client.js"

const workerModuleUrl = new URL("../pkg/storage_worker.js", import.meta.url)
const sqliteAssetUrl = new URL("./asset/db.sqlite3", import.meta.url)
const journalAssetUrl = new URL("./asset/journal.log", import.meta.url)
const sqliteWasmUrl = new URL(
  "../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3.wasm",
  import.meta.url
)

class WorkerAdapter extends EventTarget {
  constructor(worker) {
    super()
    this.worker = worker
    worker.on("message", (data) => {
      const event = new Event("message")
      Object.defineProperty(event, "data", { value: data })
      this.dispatchEvent(event)
    })
    worker.on("error", (error) => {
      const event = new Event("error")
      Object.defineProperty(event, "message", { value: error.message })
      this.dispatchEvent(event)
    })
    worker.on("messageerror", () => {
      this.dispatchEvent(new Event("messageerror"))
    })
  }

  postMessage(message, transfer) {
    this.worker.postMessage(message, transfer)
  }

  terminate() {
    void this.worker.terminate()
  }
}

const createWorkerFactory = () => async () => {
  const worker = new NodeWorker(
    `
      import { parentPort } from "node:worker_threads"
      globalThis.self = globalThis
      globalThis.postMessage = (message) => parentPort.postMessage(message)
      parentPort.on("message", (message) => globalThis.onmessage({ data: message }))
      await import(${JSON.stringify(workerModuleUrl.href)})
    `,
    { eval: true, type: "module" }
  )
  const adapter = new WorkerAdapter(worker)
  return { worker: adapter, dispose: () => {} }
}

const readAsset = async (url) => {
  const bytes = await readFile(url)
  return Uint8Array.from(bytes).buffer
}

// A SQLite database that Optuna never wrote, built with the same library the
// backend uses so that it is a real one, header and page layout included.
const createForeignSQLiteFile = async () => {
  const { default: sqlite3InitModule } = await import("../pkg/sqlite_init.js")
  const sqlite3 = await sqlite3InitModule({
    print: () => {},
    printErr: () => {},
    wasmBinary: await readAsset(sqliteWasmUrl),
    locateFile: (path) => path,
  })
  const db = new sqlite3.oo1.DB()
  try {
    db.exec("CREATE TABLE unrelated (a)")
    return sqlite3.capi.sqlite3_js_db_export(db.pointer).slice().buffer
  } finally {
    db.close()
  }
}

describe("storage worker", () => {
  it("opens Journal storage in the common worker", async () => {
    const storage = await StorageWorkerClient.open(
      await readAsset(journalAssetUrl),
      createWorkerFactory()
    )
    try {
      const studies = await storage.getStudies()
      assert.equal(studies.length, 6)
      assert.equal(
        (await storage.getStudy(studies[0].id))?.name,
        studies[0].name
      )
    } finally {
      await storage.close()
    }
  })

  it("opens SQLite storage with a transferred wasm binary", async () => {
    const storage = await StorageWorkerClient.open(
      await readAsset(sqliteAssetUrl),
      createWorkerFactory(),
      { buffer: await readAsset(sqliteWasmUrl) }
    )
    try {
      const studies = await storage.getStudies()
      assert.equal(studies.length, 6)
      const study = await storage.getStudy(studies[0].id)
      assert.ok(study)
      assert.equal(study.name, studies[0].name)
    } finally {
      await storage.close()
    }
  })

  it("rejects a file that is neither SQLite nor a Journal", async () => {
    for (const [label, content] of [
      [
        "pretty printed JSON",
        '{\n  "formatter": {\n    "indentWidth": 2\n  }\n}\n',
      ],
      ["JSON on one line", '{"formatter":{"indentWidth":2}}\n'],
      ["plain text", "hello\n"],
    ]) {
      await assert.rejects(
        StorageWorkerClient.open(
          new TextEncoder().encode(content).buffer,
          createWorkerFactory()
        ),
        { code: "unsupported_format" },
        label
      )
    }
  })

  it("rejects an empty file", async () => {
    await assert.rejects(
      StorageWorkerClient.open(new ArrayBuffer(0), createWorkerFactory()),
      { code: "empty_file" }
    )
  })

  it("rejects a SQLite database that Optuna never wrote", async () => {
    await assert.rejects(
      StorageWorkerClient.open(
        await createForeignSQLiteFile(),
        createWorkerFactory(),
        { buffer: await readAsset(sqliteWasmUrl) }
      ),
      { code: "unsupported_format" }
    )
  })

  it("opens a Journal storage that has no study left", async () => {
    // Creating and deleting a study leaves records but no study, which is a
    // storage with nothing in it rather than a file of the wrong format.
    const content = [
      '{"op_code": 0, "workder_id": "0", "study_name": "gone", "directions": [1]}',
      '{"op_code": 1, "workder_id": "0", "study_id": 0}',
      "",
    ].join("\n")
    const storage = await StorageWorkerClient.open(
      new TextEncoder().encode(content).buffer,
      createWorkerFactory()
    )
    try {
      assert.deepEqual(await storage.getStudies(), [])
    } finally {
      await storage.close()
    }
  })

  it("answers an unsupported request instead of leaving it pending", async () => {
    const { worker, dispose } = await createWorkerFactory()()
    try {
      const response = await new Promise((resolve) => {
        worker.addEventListener("message", (event) => resolve(event.data), {
          once: true,
        })
        worker.postMessage({ id: 7, type: "bogus" }, [])
      })
      assert.equal(response.id, 7)
      assert.equal(response.ok, false)
      assert.equal(response.error.code, "unsupported_request")
    } finally {
      worker.terminate()
      dispose()
    }
  })

  it("reports a missing SQLite wasm asset after transferring the database", async () => {
    await assert.rejects(
      StorageWorkerClient.open(
        await readAsset(sqliteAssetUrl),
        createWorkerFactory()
      ),
      { code: "missing_sqlite_wasm" }
    )
  })
})
