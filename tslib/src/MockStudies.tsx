import { loadStorageFromFile } from "./utils/loadStorageFromFile";

const filePath = "db.sqlite3";
const res = await fetch(filePath);
const blob = await res.blob();
const file = new File([blob], filePath);
const mockStudies: Study[] = [];
await loadStorageFromFile(file, (value) => {
  if (Array.isArray(value)) {
    mockStudies.push(...value);
  } else {
    mockStudies.push(...value([]));
  }
});

export { mockStudies };
