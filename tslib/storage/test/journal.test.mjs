import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { openAsBlob } from "node:fs";

import * as mut from "../pkg/journal.js";

test("Test Journal File Storage", async () => {
    const blob = await openAsBlob(path.resolve(".", "test", "asset", "journal.log"));
    const buf = await blob.arrayBuffer();
    const storage = new mut.JournalFileStorage(buf);
    const studies = await storage.getStudies();

    assert.strictEqual(studies.length, 1);
});
