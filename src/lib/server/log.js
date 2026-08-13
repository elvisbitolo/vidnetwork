export function log(level, event, fields = {}) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logError = (event, fields = {}) => log("error", event, fields);
export const logInfo = (event, fields = {}) => log("info", event, fields);
