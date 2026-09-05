export function parsePersonMeta(participant) {
  let meta = null;
  if (participant?.metadata) {
    try {
      meta = JSON.parse(participant.metadata);
    } catch {
      meta = null;
    }
  }
  return {
    id: meta?.id || participant?.identity || "",
    name: meta?.name || participant?.name || "",
    avatar: meta?.avatar || "",
  };
}