const THUMBNAIL_SIZE = 144;

export async function generateThumbnail(file) {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  const ctx = canvas.getContext("2d");

  if (file.type.startsWith("image/")) {
    const image = await new Promise((resolve) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.src = url;
    });
    ctx.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  } else if (file.type === "video/mp4") {
    const video = await new Promise(async (resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.src = URL.createObjectURL(file);
      setTimeout(() => reject(new Error("Video load timeout")), 2000);
      await video.play();
      await video.pause();
      video.currentTime = 0;
      resolve(video);
    });
    ctx.drawImage(video, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  }

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob))
  );
}

export async function blobDigest(blob) {
  const digest = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const SIZE_LIMIT = 100 * 1000 * 1000;

export async function multipartUpload(key, file, options) {
  const headers = options?.headers || {};
  headers["content-type"] = file.type;

  const uploadId = await axios
    .post(`/api/write/items/${key}?uploads`, "", { headers })
    .then((res) => res.data.uploadId);
  const totalChunks = Math.ceil(file.size / SIZE_LIMIT);
  const uploadedParts = [];

  for (let i = 1; i <= totalChunks; i++) {
    const chunk = file.slice((i - 1) * SIZE_LIMIT, i * SIZE_LIMIT);
    const searchParams = new URLSearchParams({ partNumber: i, uploadId });
    const res = await axios.put(`/api/write/items/${key}?${searchParams}`, chunk, {
      onUploadProgress(progressEvent) {
        if (typeof options?.onUploadProgress !== "function") return;
        options.onUploadProgress({
          loaded: (i - 1) * SIZE_LIMIT + progressEvent.loaded,
          total: file.size,
        });
      },
    });
    uploadedParts[i - 1] = { partNumber: i, etag: res.headers.etag };
  }

  const completeParams = new URLSearchParams({ uploadId });
  await axios.post(`/api/write/items/${key}?${completeParams}`, { parts: uploadedParts });
}
