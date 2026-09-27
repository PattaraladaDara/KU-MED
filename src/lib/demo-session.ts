"use client";

// Frontend preview only. This flag grants no server-side access.
const KEY = "ku-med:demo-session";
const EVENT = "ku-med:session-change";

export function hasDemoSession(): boolean {
  try { return sessionStorage.getItem(KEY) === "active"; }
  catch { return false; }
}

export function beginDemoSession() {
  sessionStorage.setItem(KEY, "active");
  window.dispatchEvent(new Event(EVENT));
}

export function endDemoSession() {
  try { sessionStorage.removeItem(KEY); }
  finally { window.dispatchEvent(new Event(EVENT)); }
}

export function subscribeDemoSession(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function serverSessionSnapshot() { return false; }
