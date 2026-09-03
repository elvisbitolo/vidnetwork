import { adminDb } from "@/lib/firebase/admin";
import { fillTemplate } from "@/lib/server/automations-core";
import { sendEmail } from "@/lib/server/email";
import { createNotification } from "@/lib/server/notifications";
import { awardPoints } from "@/lib/server/gamification";
import { addSpaceMember } from "@/lib/server/spaces";
import { getOrCreateDm, addMessage } from "@/lib/server/chat";
import { recordAutomationRun } from "@/lib/server/automation-history";
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
      actorName: "Secret Yarnery",
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

  if (action === "send_dm") {
    const subjectUid = context.subjectUid || "";
    let senderOwner = owner;
    if (!senderOwner) senderOwner = await getOwnerUser();
    if (!subjectUid || !senderOwner) return;
    const text = fillTemplate(config.message, values);
    const conversation = await getOrCreateDm(senderOwner.uid, subjectUid);
    if (!conversation) return;
    await addMessage(
      conversation.id,
      { uid: senderOwner.uid, name: senderOwner.name || "Secret Yarnery" },
      text || "You have a new message from Secret Yarnery."
    );
  }

  if (action === "send_push") {
    const subjectUid = context.subjectUid || config.toUserId || "";
    if (!subjectUid) return;
    const title = fillTemplate(config.title, values) || "Secret Yarnery";
    const body = fillTemplate(config.body, values) || "You have a new notification.";
    await sendPushToUser(subjectUid, title, body, config.href || "/dashboard");
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
    const targetUserId = context.subjectUid || "";
    try {
      await executeAction(automation, context);
      await recordAutomationRun({
        automationId: automation.id,
        trigger,
        action: automation.action,
        targetUserId,
        success: true,
        error: "",
      });
    } catch (err) {
      logError("automation.run_failed", {
        error: err.message,
        trigger,
        automationId: automation.id,
      });
      await recordAutomationRun({
        automationId: automation.id,
        trigger,
        action: automation.action,
        targetUserId,
        success: false,
        error: err.message || "Unknown error",
      });
    }
  }
}

async function sendPushToUser(uid, title, body, url = "/dashboard") {
  const webpush = await import("web-push");
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    throw new Error("Push not configured — add VAPID keys.");
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const doc = await adminDb().collection("pushSubscriptions").doc(uid).get();
  if (!doc.exists) return;
  const sub = doc.data();
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: sub.keys },
    JSON.stringify({ title, body, url })
  );
}

export function fireCourseCompleted({ subjectUid, subjectName, memberName, memberEmail, courseId, courseName }) {
  return runAutomations("course_completed", {
    subjectUid,
    subjectName: subjectName || memberName,
    memberName,
    memberEmail,
    courseId,
    courseName,
    completionDate: new Date(),
  });
}

export function fireSpaceJoined({ subjectUid, subjectName, memberName, memberEmail, spaceId, spaceName }) {
  return runAutomations("space_joined", {
    subjectUid,
    subjectName: subjectName || memberName,
    memberName,
    memberEmail,
    spaceId,
    spaceName,
  });
}

export function fireMemberInactive({ subjectUid, subjectName, memberName, memberEmail, spaceId, inactiveDays }) {
  return runAutomations("member_inactive", {
    subjectUid,
    subjectName: subjectName || memberName,
    memberName,
    memberEmail,
    spaceId,
    inactiveDays,
  });
}

export function fireMilestoneReached({ subjectUid, subjectName, memberName, memberEmail, totalPoints, milestonePoints }) {
  return runAutomations("milestone_reached", {
    subjectUid,
    subjectName: subjectName || memberName,
    memberName,
    memberEmail,
    totalPoints,
    milestonePoints,
  });
}
