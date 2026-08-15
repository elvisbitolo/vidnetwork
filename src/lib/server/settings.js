import { adminDb } from "@/lib/firebase/admin";
import {
  DEFAULT_CHECKLIST_STEPS,
  CHECKLIST_KEYS,
  normalizeChecklistSteps,
} from "@/lib/server/settings-core";

export { DEFAULT_CHECKLIST_STEPS, CHECKLIST_KEYS, normalizeChecklistSteps };

const SETTINGS_ID = "community";

export async function getSettings() {
  const doc = await adminDb().collection("settings").doc(SETTINGS_ID).get();
  if (!doc.exists) {
    return { welcomeChecklist: DEFAULT_CHECKLIST_STEPS };
  }
  const data = doc.data();
  return { ...data, welcomeChecklist: normalizeChecklistSteps(data.welcomeChecklist) };
}

export async function updateSettings(patch = {}) {
  const data = {};
  if (patch.welcomeChecklist !== undefined) {
    data.welcomeChecklist = normalizeChecklistSteps(patch.welcomeChecklist);
  }
  await adminDb().collection("settings").doc(SETTINGS_ID).set(data, { merge: true });
  return { welcomeChecklist: data.welcomeChecklist };
}
