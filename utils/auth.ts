export function get_auth_status(context) {
  const url = new URL(context.request.url);
  const marker = "/api/write/items/";
  const markerIndex = url.pathname.indexOf(marker);
  let path = markerIndex >= 0 ? url.pathname.slice(markerIndex + marker.length) : "";

  try {
    path = decodeURIComponent(path);
  } catch {
    return false;
  }

  if (path.startsWith("_$flaredrive$/thumbnails/")) return true;

  const guest = context.env["GUEST"];
  if (guest) {
    for (const allowedPath of String(guest).split(",")) {
      if (allowedPath === "*") return true;
      if (allowedPath && path.startsWith(allowedPath)) return true;
    }
  }

  const authorization = context.request.headers.get("Authorization");
  if (!authorization || !authorization.startsWith("Basic ")) return false;

  let account;
  try {
    account = atob(authorization.slice(6));
  } catch {
    return false;
  }

  if (!account || !context.env[account]) return false;

  for (const allowedPath of String(context.env[account]).split(",")) {
    if (allowedPath === "*") return true;
    if (allowedPath && path.startsWith(allowedPath)) return true;
  }
  return false;
}
