const ENTRY_OBJECT_STORE = "entries";
const VERSION = 1;
const DB_NAME = "budget-tracker";

let db;

const openRequest = indexedDB.open(DB_NAME, VERSION);

openRequest.onupgradeneeded = (event) => {
  event.target.result.createObjectStore(ENTRY_OBJECT_STORE, {
    autoIncrement: true,
  });
};

openRequest.onsuccess = (event) => {
  // Make db available on global scope
  db = event.target.result;

  if (navigator.onLine) {
    // If internet is available upload stored entries to API
    uploadOfflineData();
  }

  // Also upload if app goes between offline and online
  window.addEventListener("online", uploadOfflineData);
};

openRequest.onerror = (event) => {
  console.log("DB failed to open", event.target.errorCode);
};

function uploadOfflineData() {
  const getAllRequest = db
    .transaction([ENTRY_OBJECT_STORE], "readwrite")
    .objectStore(ENTRY_OBJECT_STORE)
    .getAll();

  getAllRequest.onsuccess = (event) => {
    const entries = event.target.result;

    if (entries.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(entries),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => {
        if (res.ok) {
          // upload successful so clear entries from db
          db.transaction([ENTRY_OBJECT_STORE], "readwrite")
            .objectStore(ENTRY_OBJECT_STORE)
            .clear();
        }
      });
    }
  };
}

function saveRecord(record) {
  if (db) {
    // Add offline entry to DB
    db.transaction([ENTRY_OBJECT_STORE], "readwrite")
      .objectStore(ENTRY_OBJECT_STORE)
      .add(record);
  }
}
