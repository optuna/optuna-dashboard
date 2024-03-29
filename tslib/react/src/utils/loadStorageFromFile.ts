import { JournalFileStorage, SQLite3Storage } from "@optuna/storage";
import * as Optuna from "@optuna/types";
import { SetterOrUpdater } from "recoil";

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

const loadStudiesFromStorage = async (
  storage: SQLite3Storage | JournalFileStorage,
  setter: SetterOrUpdater<Optuna.Study[]>,
) => {
  const studySummaries = await storage.getStudies();
  const studies = (
    await Promise.all(
      studySummaries.map((_summary, index) => storage.getStudy(index)),
    )
  ).filter((s) => s !== null) as Optuna.Study[];
  setter((prev) => [...prev, ...studies]);
};

export const loadStorageFromFile = async (
  file: File,
  setStudies: SetterOrUpdater<Optuna.Study[]>,
) => {
  const arrayBuf = await readFile(file);
  const header = new Uint8Array(arrayBuf, 0, 16);
  const headerString = new TextDecoder().decode(header);
  if (headerString === "SQLite format 3\u0000") {
    await loadStudiesFromStorage(new SQLite3Storage(arrayBuf), setStudies);
  } else {
    await loadStudiesFromStorage(new JournalFileStorage(arrayBuf), setStudies);
  }
};
