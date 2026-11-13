const RESERVED_USERNAMES = new Set([
  "GUEST",
  "GUEST_READ",
  "PUBURL",
  "FETCH_TIMEOUT_MS",
]);

function normalizeTarget(input) {
  let p = Array.isArray(input) ? input.join("/") : String(input ?? "");
  p = p.split("?")[0].split("#")[0];
  try {
    p = decodeURIComponent(p);
  } catch {}
  return p.replace(/^\/+/, "");
}

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
  if (!auth || !/^basic /i.test(auth)) return null;
  let decoded;
  try {
    decoded = atob(auth.slice(6).trim());
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep <= 0 || sep >= decoded.length - 1) return null;
  const username = decoded.slice(0, sep);
  if (RESERVED_USERNAMES.has(username)) return null;
  return decoded;
}

function checkAuth(context, target, guestEnvKey, defaultWhenUnset) {
  if (typeof target !== "string") target = "";
  if (target.startsWith("_$flaredrive$/thumbnails/")) return true;

  const guestConfig = context.env[guestEnvKey];
  if ((guestConfig === undefined || guestConfig === null) && defaultWhenUnset) {
    return true;
  }
  if (matchAllowList(guestConfig, target)) return true;

  const account = parseAccount(context);
  if (!account) return false;
  if (!Object.prototype.hasOwnProperty.call(context.env, account)) return false;
  const value = context.env[account];
  if (typeof value !== "string") return false;
  return matchAllowList(value, target);
}

export function get_auth_status(context) {
  const parts = context.request.url.split("/api/write/items/");
  if (parts.length < 2) return false;
  return checkAuth(context, normalizeTarget(parts[1] || ""), "GUEST", false);
}

export function get_read_auth_status(context, path) {
  return checkAuth(context, normalizeTarget(path), "GUEST_READ", true);
}
