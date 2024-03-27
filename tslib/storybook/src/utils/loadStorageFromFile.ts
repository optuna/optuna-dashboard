import { SetterOrUpdater } from "recoil";
import { loadJournalStorage } from "./journalStorage";
import { loadSQLite3Storage } from "./sqlite3";

const readFile = async (file: File) => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const arrayBuffer = reader.result as ArrayBuffer | null;
      if (arrayBuffer !== null) {
        resolve(arrayBuffer);
      } else {
        reject(new Error("Failed to load file"));
      }
    });
    reader.readAsArrayBuffer(file);
  });
};

export const loadStorageFromFile = async (
  file: File,
  setStudies: SetterOrUpdater<Study[]>,
) => {
  const arrayBuffer = await readFile(file);
  const header = new Uint8Array(arrayBuffer, 0, 16);
  const headerString = new TextDecoder().decode(header);
  if (headerString === "SQLite format 3\u0000") {
    await loadSQLite3Storage(arrayBuffer, setStudies);
  } else {
    loadJournalStorage(arrayBuffer, setStudies);
  }
};
