import { SetterOrUpdater } from "recoil";
import { loadJournalStorage } from "./journalStorage";
import { loadSQLite3Storage } from "./sqlite3";

export const loadStorageFromFile = (
  file: File,
  setStudies: SetterOrUpdater<Study[]>,
): void => {
  const r = new FileReader();
  r.addEventListener("load", () => {
    const arrayBuffer = r.result as ArrayBuffer | null;
    if (arrayBuffer !== null) {
      const header = new Uint8Array(arrayBuffer, 0, 16);
      const headerString = new TextDecoder().decode(header);
      if (headerString === "SQLite format 3\u0000") {
        loadSQLite3Storage(arrayBuffer, setStudies);
      } else {
        loadJournalStorage(arrayBuffer, setStudies);
      }
    }
  });
  r.readAsArrayBuffer(file);
};
