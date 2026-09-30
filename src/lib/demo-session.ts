"use client";

// Frontend preview only. This flag grants no server-side access.
const KEY = "ku-med:demo-session";
const PROFILE_KEY = "ku-med:demo-profile";
const EVENT = "ku-med:session-change";

export type DemoSessionProfile = { username:string; role:string; displayName:string; medicalLicense:string };

export function hasDemoSession(): boolean {
  try { return sessionStorage.getItem(KEY) === "active"; }
  catch { return false; }
}

export function beginDemoSession(profile?:DemoSessionProfile) {
  sessionStorage.setItem(KEY, "active");
  if(profile)sessionStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
  window.dispatchEvent(new Event(EVENT));
}

export function getDemoSessionProfile():DemoSessionProfile|null {
  try { const value=sessionStorage.getItem(PROFILE_KEY);return value?JSON.parse(value) as DemoSessionProfile:null; }
  catch { return null; }
}

export function endDemoSession() {
  try { sessionStorage.removeItem(KEY);sessionStorage.removeItem(PROFILE_KEY); }
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
