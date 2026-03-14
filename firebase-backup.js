// firebase-backup.js
// Backup y restauración de contadores en Firestore
// Estructura:
//   users/{userId}/counters/{counterId} - cada contador
//   users/{userId}/userSettings/sync - { lastSync } metadata separada

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

    await setDoc(getUserSettingsSyncRef(), { lastSync: serverTimestamp() });

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
    if (window.renderCounters) window.renderCounters();
    if (snap.empty) {
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

export async function renderFirebaseBackupInfo(container) {
  const el = container || document.getElementById("firebase-backup-info");
  if (!el) return;
  const user = auth.currentUser;
  if (!user) {
    el.textContent = "";
    return;
  }
  try {
    const ref = getUserSettingsSyncRef();
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().lastSync) {
      const lastSync = snap.data().lastSync?.toDate?.() || new Date();
      const now = new Date();
      const diffMs = now - lastSync;
      const diffMins = Math.floor(diffMs / 60000);
      let ago = "";
      if (diffMins < 1) ago = "hace menos de un minuto";
      else if (diffMins < 60) ago = `hace ${diffMins} min`;
      else if (diffMins < 1440) ago = `hace ${Math.floor(diffMins / 60)} h`;
      else ago = `hace ${Math.floor(diffMins / 1440)} días`;
      el.textContent = `Última sincronización: ${lastSync.toLocaleString()} (${ago})`;
    } else {
      el.textContent = "Aún no has sincronizado.";
    }
  } catch (err) {
    el.textContent = "No se pudo comprobar el estado.";
  }
}
