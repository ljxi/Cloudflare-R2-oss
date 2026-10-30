import { getAuthHeaders } from "sigflint";

export class S3Client {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;

  constructor(accessKeyId: string, secretAccessKey: string, region?: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region || "auto";
  }

  public async s3_fetch(input: string, init?: RequestInit) {
    init = init || {};
    const headers = new Headers(init.headers);

    // The signer only signs what the S3 client is expected to sign: the host it
    // adds itself, content-type, and the x-amz-* headers the caller passed.
    const signHeaders: Record<string, string> = {};
    for (const [name, value] of headers) {
      if (name === "content-type" || name.startsWith("x-amz-")) {
        signHeaders[name] = value;
      }
    }

    const authHeaders = await getAuthHeaders(
      {
        method: init.method || "GET",
        url: new URL(input),
        region: this.region,
        service: "s3",
        unsignedPayload: true,
        signHeaders,
      },
      {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      }
    );

    for (const [name, value] of Object.entries(authHeaders)) {
      headers.set(name, value);
    }
    init.headers = headers;
    return fetch(input, init);
  }
}
