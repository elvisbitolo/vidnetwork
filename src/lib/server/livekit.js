let _client = null;

export async function getLiveKitAdmin() {
  if (_client) return _client;
  const { RoomServiceClient } = await import("livekit-server-sdk");
  const host = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!host || !key || !secret) return null;
  const url = new URL(host);
  _client = new RoomServiceClient(`${url.protocol}//${url.host}`, key, secret);
  return _client;
}

export async function listLiveParticipants(slug) {
  const client = await getLiveKitAdmin();
  if (!client) return [];
  const participants = await client.listParticipants(slug);
  return participants.map((p) => ({
    identity: p.identity || "",
    name: p.name || p.identity || "Member",
    joinedAt: p.joinedAt ? Number(p.joinedAt) || 0 : 0,
    canPublish:
      !p.permissions || p.permissions.canPublish !== false,
    metadata: p.metadata || "",
  }));
}

export async function removeLiveParticipant(slug, identity) {
  const client = await getLiveKitAdmin();
  if (!client) return { ok: false, error: "LiveKit not configured" };
  await client.removeParticipant(slug, identity);
  return { ok: true };
}

export async function setLiveParticipantPublish(slug, identity, canPublish) {
  const client = await getLiveKitAdmin();
  if (!client) return { ok: false, error: "LiveKit not configured" };
  await client.updateParticipant(slug, identity, {
    canPublish,
    canPublishData: true,
    canSubscribe: true,
  });
  return { ok: true };
}

export async function endLiveKitRoom(slug) {
  const client = await getLiveKitAdmin();
  if (!client) return { ok: false, error: "LiveKit not configured" };
  await client.deleteRoom(slug);
  return { ok: true };
}
