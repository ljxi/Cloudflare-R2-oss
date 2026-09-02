export function notFound() {
  return new Response("Not found", { status: 404 });
}

export function parseBucketPath(context): [any, string] {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathSegments = (params.path || []) as string[];
  let path = "";

  try {
    path = decodeURIComponent(pathSegments.join("/"));
  } catch {
    return [null, ""];
  }

  const driveid = url.hostname.replace(/\..*/, "");
  return [env[driveid] || env["BUCKET"], path];
}
