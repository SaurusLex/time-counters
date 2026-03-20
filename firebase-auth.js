// firebase-auth.js
// Autenticación con Firebase (proveedor Google)

import { auth } from "./firebase-config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from "firebase/auth";

export function getCurrentUser() {
  return auth.currentUser;
}

export function isSignedIn() {
  return !!auth.currentUser;
}

export async function handleLoginClick() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    document.dispatchEvent(
      new CustomEvent("firebase-auth-changed", { detail: { user: auth.currentUser } })
    );
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    if (window.showToast) {
      const cancelled = err.code === "auth/popup-closed-by-user";
      window.showToast(
        cancelled ? "Inicio de sesión cancelado" : "Error al autenticar con Google",
        { variant: cancelled ? "info" : "error" }
      );
    }
  }
}

export async function handleLogoutClick() {
  try {
    await signOut(auth);
    document.dispatchEvent(
      new CustomEvent("firebase-auth-changed", { detail: { user: null } })
    );
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
  }
}

export function initAuth(onAuthChange) {
  onAuthStateChanged(auth, (user) => {
    if (onAuthChange) onAuthChange(user);
    document.dispatchEvent(
      new CustomEvent("firebase-auth-changed", { detail: { user } })
    );
  });
}
