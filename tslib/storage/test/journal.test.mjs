import assert from "node:assert"
import { openAsBlob } from "node:fs"
import path from "node:path"
import test from "node:test"

import * as mut from "../pkg/journal.js"

const n_studies = 2

test("Test Journal File Storage", async () => {
  const blob = await openAsBlob(
    path.resolve(".", "test", "asset", "journal.log")
  )
  const buf = await blob.arrayBuffer()
  const storage = new mut.JournalFileStorage(buf)
  const studies = await storage.getStudies()

  assert.strictEqual(studies.length, n_studies)
})
