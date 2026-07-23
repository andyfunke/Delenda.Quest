import type { AvaShellSession, AvaVirtualFile } from "./schema";

const DATABASE_NAME = "delenda-quest-ava";
const DATABASE_VERSION = 2;
const ARCHIVE_STORE = "archives";

type StoredVirtualFile = Omit<AvaVirtualFile, "workbookBytes"> & {
  workbookBytes?: Uint8Array;
};
type StoredArchive = {
  schemaVersion: 1;
  archiveKey: string;
  runToken: string;
  campaignId: string;
  cwd: string;
  files: StoredVirtualFile[];
  darkNetUnlocked?: boolean;
};
let archiveWriteQueue: Promise<void> = Promise.resolve();

const openArchiveDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ARCHIVE_STORE))
        database.createObjectStore(ARCHIVE_STORE, {
          keyPath: "archiveKey",
        });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const loadAvaShellArchive = async (
  runToken: string,
  campaignId: string,
): Promise<unknown> => {
  if (
    !runToken ||
    !campaignId ||
    typeof window === "undefined" ||
    !window.indexedDB
  )
    throw new Error("Persistent Ava archive is unavailable.");
  const database = await openArchiveDatabase();
  try {
    const result = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(ARCHIVE_STORE, "readonly");
      const request = transaction.objectStore(ARCHIVE_STORE).get(runToken);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    if (
      !result ||
      typeof result !== "object" ||
      (result as Partial<StoredArchive>).campaignId !== campaignId ||
      (result as Partial<StoredArchive>).runToken !== runToken
    )
      return null;
    return result;
  } finally {
    database.close();
  }
};

const writeAvaShellArchive = async (
  runToken: string,
  campaignId: string,
  shell: AvaShellSession,
) => {
  if (
    !runToken ||
    !campaignId ||
    typeof window === "undefined" ||
    !window.indexedDB
  )
    throw new Error("Persistent Ava archive is unavailable.");
  const archive: StoredArchive = {
    schemaVersion: 1,
    archiveKey: runToken,
    runToken,
    campaignId,
    cwd: shell.cwd,
    darkNetUnlocked: shell.darkNetUnlocked,
    files: shell.files.map((file) => ({
      ...file,
      workbookBytes: file.workbookBytes
        ? Uint8Array.from(file.workbookBytes)
        : undefined,
    })),
  };
  const database = await openArchiveDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ARCHIVE_STORE, "readwrite");
      transaction.objectStore(ARCHIVE_STORE).put(archive);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

const removeAvaShellArchive = async (runToken: string) => {
  if (
    !runToken ||
    typeof window === "undefined" ||
    !window.indexedDB
  )
    return;
  const database = await openArchiveDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ARCHIVE_STORE, "readwrite");
      transaction.objectStore(ARCHIVE_STORE).delete(runToken);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

export const saveAvaShellArchive = (
  runToken: string,
  campaignId: string,
  shell: AvaShellSession,
) => {
  archiveWriteQueue = archiveWriteQueue
    .catch(() => undefined)
    .then(() => writeAvaShellArchive(runToken, campaignId, shell));
  return archiveWriteQueue;
};

export const deleteAvaShellArchive = (runToken: string) => {
  archiveWriteQueue = archiveWriteQueue
    .catch(() => undefined)
    .then(() => removeAvaShellArchive(runToken));
  return archiveWriteQueue;
};
