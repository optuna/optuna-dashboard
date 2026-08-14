import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { StorageWorkerClient } from "../pkg/worker_client.js"

class FakeWorker extends EventTarget {
  heldRequests = []
  lastTransfer = []
  terminated = false

  postMessage(message, transfer) {
    this.lastTransfer = transfer
    if (message.type === "open") {
      this.emitMessage({
        id: message.id,
        type: message.type,
        ok: true,
        result: { format: "journal", warnings: [] },
      })
      return
    }
    if (message.type === "getStudies") {
      this.heldRequests.push(message)
      return
    }
    if (message.type === "getStudy") {
      this.emitMessage({
        id: message.id,
        type: message.type,
        ok: true,
        result: {
          id: message.studyId,
          name: "study",
          directions: ["minimize"],
        },
      })
      return
    }
    this.emitMessage({
      id: message.id,
      type: message.type,
      ok: true,
      result: null,
    })
  }

  terminate() {
    this.terminated = true
  }

  emitMessage(data) {
    queueMicrotask(() => {
      const event = new Event("message")
      Object.defineProperty(event, "data", { value: data })
      this.dispatchEvent(event)
    })
  }
}

describe("StorageWorkerClient", () => {
  it("matches responses by request ID and transfers the input buffer", async () => {
    const worker = new FakeWorker()
    const buffer = new ArrayBuffer(4)
    let disposed = false
    const storage = await StorageWorkerClient.open(buffer, async () => ({
      worker,
      dispose: () => {
        disposed = true
      },
    }))

    assert.strictEqual(worker.lastTransfer[0], buffer)
    assert.deepStrictEqual(await storage.getStudy(42), {
      id: 42,
      name: "study",
      directions: ["minimize"],
    })

    await storage.close()
    await storage.close()
    assert.strictEqual(worker.terminated, true)
    assert.strictEqual(disposed, true)
    await assert.rejects(storage.getStudies(), { code: "invalid_state" })
  })

  it("rejects pending requests when the worker fails", async () => {
    const worker = new FakeWorker()
    const storage = await StorageWorkerClient.open(
      new ArrayBuffer(1),
      async () => ({
        worker,
        dispose: () => {},
      })
    )
    const studiesPromise = storage.getStudies()
    await new Promise((resolve) => queueMicrotask(resolve))

    worker.dispatchEvent(new Event("error"))

    await assert.rejects(studiesPromise, { code: "worker_failed" })
    await assert.rejects(storage.getStudies(), { code: "invalid_state" })
  })

  it("rejects a response that answers another request type", async () => {
    const worker = new FakeWorker()
    const storage = await StorageWorkerClient.open(
      new ArrayBuffer(1),
      async () => ({
        worker,
        dispose: () => {},
      })
    )
    const studiesPromise = storage.getStudies()
    await new Promise((resolve) => queueMicrotask(resolve))

    const held = worker.heldRequests.pop()
    worker.emitMessage({
      id: held.id,
      type: "getStudy",
      ok: true,
      result: null,
    })

    await assert.rejects(studiesPromise, { code: "protocol_mismatch" })
  })
})
