const RESERVED_ENV_KEYS = new Set([
  "GUEST",
  "GUEST_READ",
  "PUBURL",
  "FETCH_TIMEOUT_MS",
]);

function matchAllowList(list, target) {
  if (!list || typeof list !== "string") return false;
  for (const rule of list.split(",")) {
    const r = rule.trim();
    if (!r) continue;
    if (r === "*") return true;
    if (target.startsWith(r)) return true;
  }
  return false;
}

function parseAccount(context) {
  const auth = context.request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Basic ")) return null;
  let decoded;
  try {
    decoded = atob(auth.slice(6).trim());
  } catch {
    return null;
  }
  if (!decoded || !decoded.includes(":")) return null;
  if (RESERVED_ENV_KEYS.has(decoded)) return null;
  return decoded;
}

function checkAuth(context, target, guestEnvKey) {
  if (typeof target !== "string") target = "";
  if (target.startsWith("_$flaredrive$/thumbnails/")) return true;

  if (matchAllowList(context.env[guestEnvKey], target)) return true;

  const account = parseAccount(context);
  if (!account) return false;

  if (!Object.prototype.hasOwnProperty.call(context.env, account)) return false;
  const value = context.env[account];
  if (typeof value !== "string") return false;
  return matchAllowList(value, target);
}

export function get_auth_status(context) {
  const target = (context.request.url.split("/api/write/items/")[1] || "");
  return checkAuth(context, target, "GUEST");
}

export function get_read_auth_status(context, path) {
  return checkAuth(context, path, "GUEST_READ");
}
