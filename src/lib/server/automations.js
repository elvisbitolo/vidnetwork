import { adminDb } from "@/lib/firebase/admin";
import { fillTemplate } from "@/lib/server/automations-core";
import { sendEmail } from "@/lib/server/email";
import { createNotification } from "@/lib/server/notifications";
import { awardPoints } from "@/lib/server/gamification";
import { addSpaceMember } from "@/lib/server/spaces";
import { logError } from "@/lib/server/log";

export { fillTemplate };

export async function getOwnerUser() {
  const snap = await adminDb().collection("users").where("role", "==", "owner").limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { uid: doc.id, ...doc.data() };
}

export async function createAutomation({ name, trigger, action, config = {}, createdBy }) {
  const clean = typeof name === "string" ? name.trim() : "";
  if (!clean) {
    throw Object.assign(new Error("Automation name required"), { code: 400 });
  }
  const ref = adminDb().collection("automations").doc();
  await ref.set({
    name: clean,
    trigger,
    action,
    config,
    active: true,
    createdBy,
    createdAt: new Date(),
  });
  return { id: ref.id };
}

export async function listAutomations() {
  const snap = await adminDb().collection("automations").orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toMillis
        ? data.createdAt.toMillis()
        : data.createdAt
          ? new Date(data.createdAt).getTime()
          : 0,
    };
  });
}

export async function setAutomationActive(id, active) {
  const ref = adminDb().collection("automations").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update({ active: !!active });
  return { id };
}

export async function deleteAutomation(id) {
  await adminDb().collection("automations").doc(id).delete();
}

function placeholderValues(context) {
  const values = { ...context };
  if (context.memberName) values.name = context.memberName;
  return values;
}

async function executeAction(automation, context) {
  const { action, config = {} } = automation;
  const values = placeholderValues(context);
  const owner = config.to === "owner" ? await getOwnerUser() : null;

  if (action === "send_email") {
    const to = owner?.email || (config.to && typeof config.to === "string" ? config.to : "");
    if (!to) return;
    await sendEmail({
      to,
      subject: fillTemplate(config.subject, values),
      text: fillTemplate(config.body, values),
    }).catch((err) => {
      logError("automation.email_failed", { error: err.message, automationId: automation.id });
    });
    return;
  }

  if (action === "create_notification") {
    const userId = owner?.uid || config.toUserId || "";
    if (!userId) return;
    const text = fillTemplate(config.message, values);
    await createNotification({
      userId,
      type: "automation",
      actorId: "",
      actorName: "VidNetwork",
      text,
      href: config.href || "/dashboard",
    });
    return;
  }

  if (action === "award_points") {
    const points = Math.max(Number(config.points) || 0, 0);
    const subjectUid = context.subjectUid || "";
    if (!subjectUid || points <= 0) return;
    await awardPoints(subjectUid, points, context.subjectName || "Member");
  }

  if (action === "add_member_to_space") {
    const subjectUid = context.subjectUid || "";
    if (!subjectUid) return;
    const targetSpaceId = config.spaceId || context.spaceId || "";
    if (!targetSpaceId) return;
    await addSpaceMember(targetSpaceId, subjectUid, context.subjectName || "Member", "member");
  }
}

export async function runAutomations(trigger, context = {}) {
  const snap = await adminDb()
    .collection("automations")
    .where("active", "==", true)
    .where("trigger", "==", trigger)
    .get();
  const automations = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  for (const automation of automations) {
    try {
      await executeAction(automation, context);
    } catch (err) {
      logError("automation.run_failed", {
        error: err.message,
        trigger,
        automationId: automation.id,
      });
    }
  }
}
