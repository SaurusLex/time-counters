// firebase-backup.js
// Backup y restauración de contadores en Firestore
// Estructura:
//   users/{userId}/counters/{counterId} - cada contador
//   users/{userId}/userSettings/sync - { lastSync } metadata separada
//   users/{userId}/userSettings/appConfig - unidades de tiempo, dateFormat, etc.

import { db, auth } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

const DEFAULT_APP_CONFIG = {
  years: true,
  months: true,
  weeks: true,
  days: true,
  hours: true,
  minutes: true,
  seconds: true,
  dateFormat: "dd/MM/yyyy",
};

function mergeAppConfig(partial) {
  if (typeof partial !== "object" || partial === null) {
    return { ...DEFAULT_APP_CONFIG };
  }
  const pick = {};
  for (const key of Object.keys(DEFAULT_APP_CONFIG)) {
    if (key in partial) pick[key] = partial[key];
  }
  return { ...DEFAULT_APP_CONFIG, ...pick };
}

function readLocalConfigNormalized() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("config") || "{}");
  } catch {
    saved = {};
  }
  return mergeAppConfig(saved);
}

function mergeAppConfigFromRemote(data) {
  if (!data || typeof data !== "object") return readLocalConfigNormalized();
  return mergeAppConfig(data);
}

function getCountersCollectionRef() {
  const user = auth.currentUser;
  if (!user) return null;
  return collection(db, "users", user.uid, "counters");
}

function getUserSettingsSyncRef() {
  const user = auth.currentUser;
  if (!user) return null;
  return doc(db, "users", user.uid, "userSettings", "sync");
}

function getUserSettingsAppConfigRef() {
  const user = auth.currentUser;
  if (!user) return null;
  return doc(db, "users", user.uid, "userSettings", "appConfig");
}

async function persistAppSettingsToCloud() {
  const appConfigRef = getUserSettingsAppConfigRef();
  const syncRef = getUserSettingsSyncRef();
  if (!appConfigRef || !syncRef) return;
  await setDoc(appConfigRef, readLocalConfigNormalized());
  await setDoc(syncRef, { lastSync: serverTimestamp() });
}

/** Sincroniza solo configuración (unidades, formato de fecha) + lastSync, sin reescribir contadores. */
export async function syncAppConfigToFirestore() {
  if (!auth.currentUser) return;
  try {
    await persistAppSettingsToCloud();
    if (typeof window.renderFirebaseBackupInfo === "function") {
      window.renderFirebaseBackupInfo();
    }
  } catch (err) {
    console.error("Error al sincronizar la configuración:", err);
  }
}

export async function backupToFirestore() {
  const user = auth.currentUser;
  if (!user) {
    if (window.showToast) window.showToast("Debes iniciar sesión primero.");
    return;
  }
  const btn = document.getElementById("firebase-backup-btn");
  if (btn) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Guardando...';
  }
  try {
    const counters = JSON.parse(localStorage.getItem("counters") || "[]");
    const collRef = getCountersCollectionRef();
    const currentIds = new Set();

    for (const c of counters) {
      const id = c.id || Date.now().toString() + "-" + Math.random().toString(36).slice(2);
      currentIds.add(id);
      await setDoc(doc(collRef, id), {
        ...c,
        id,
      });
    }

    const existingSnap = await getDocs(collRef);
    for (const d of existingSnap.docs) {
      if (!currentIds.has(d.id)) {
        await deleteDoc(d.ref);
      }
    }

    await persistAppSettingsToCloud();

    if (window.showToast) window.showToast("Backup guardado en la nube");
    if (typeof window.renderFirebaseBackupInfo === "function") {
      window.renderFirebaseBackupInfo();
    }
  } catch (err) {
    console.error("Error al guardar backup:", err);
    if (window.showToast) window.showToast("Error al guardar en la nube");
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
  }
}

export async function restoreFromFirestore(silent = false) {
  const user = auth.currentUser;
  if (!user) {
    if (!silent && window.showToast) window.showToast("Debes iniciar sesión primero.");
    return;
  }
  const btn = document.getElementById("firebase-restore-btn");
  if (btn) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Restaurando...';
  }
  try {
    const collRef = getCountersCollectionRef();
    const snap = await getDocs(collRef);
    const counters = snap.docs.map((d) => {
      const data = d.data();
      const { updatedAt, ...rest } = data;
      return { ...rest, id: d.id };
    });
    localStorage.setItem("counters", JSON.stringify(counters));

    const appConfigRef = getUserSettingsAppConfigRef();
    const configSnap = await getDoc(appConfigRef);
    let restoredConfig = false;
    if (configSnap.exists()) {
      localStorage.setItem(
        "config",
        JSON.stringify(mergeAppConfigFromRemote(configSnap.data()))
      );
      restoredConfig = true;
    }

    if (window.renderCounters) window.renderCounters();
    const hasAnyBackup = !snap.empty || restoredConfig;
    if (!hasAnyBackup) {
      if (!silent && window.showToast) window.showToast("No hay backup en la nube");
    } else {
      if (!silent && window.showToast) window.showToast("Datos restaurados desde la nube");
    }
  } catch (err) {
    console.error("Error al restaurar:", err);
    if (!silent && window.showToast) window.showToast("Error al restaurar desde la nube");
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
  }
}

function formatAgoFromLastSync(lastSync) {
  const now = new Date();
  const diffMs = now - lastSync;
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffMins < 1) {
    if (diffSecs === 0) return "hace un momento";
    if (diffSecs === 1) return "hace 1 segundo";
    return `hace ${diffSecs} segundos`;
  }
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffMins < 1440) return `hace ${Math.floor(diffMins / 60)} h`;
  return `hace ${Math.floor(diffMins / 1440)} días`;
}

export async function renderFirebaseBackupInfo(container) {
  const el = container || document.getElementById("firebase-backup-info");
  if (!el) return;
  const user = auth.currentUser;
  if (!user) {
    el.textContent = "";
    return;
  }
  if (el._lastSyncInterval) {
    clearInterval(el._lastSyncInterval);
    el._lastSyncInterval = null;
  }
  try {
    const ref = getUserSettingsSyncRef();
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().lastSync) {
      const lastSync = snap.data().lastSync?.toDate?.() || new Date();
      const lastSyncStr = lastSync.toLocaleString();

      function updateAgo() {
        if (!el.isConnected) {
          clearInterval(el._lastSyncInterval);
          el._lastSyncInterval = null;
          return;
        }
        const ago = formatAgoFromLastSync(lastSync);
        el.textContent = `Última sincronización: ${lastSyncStr} (${ago})`;
        const diffMs = new Date() - lastSync;
        if (diffMs >= 60000 && el._lastSyncInterval) {
          clearInterval(el._lastSyncInterval);
          el._lastSyncInterval = null;
        }
      }

      updateAgo();
      if (new Date() - lastSync < 60000) {
        el._lastSyncInterval = setInterval(updateAgo, 1000);
      }
    } else {
      el.textContent = "Aún no has sincronizado.";
    }
  } catch (err) {
    el.textContent = "No se pudo comprobar el estado.";
  }
}
