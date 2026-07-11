/**
 * Resolve a stored attachment reference to a browser-usable URL.
 *
 * Uploaded objects are stored as an object path like `/objects/<id>` and are
 * served through the API at `${BASE_URL}api/storage/objects/<id>`. External
 * links (http/https/data/blob) are returned unchanged so admins can also paste
 * a direct URL.
 */
export function attachmentSrc(url: string): string {
  if (!url) return url;
  if (
    /^(https?:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  const base = import.meta.env.BASE_URL; // includes trailing slash
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}api/storage${path}`;
}

/** Classify a MIME type into the attachment kinds the UI knows how to render. */
export function getAttachmentType(mime: string): "image" | "video" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

/**
 * Resolve the cover image for a post card: prefer an explicit coverImageUrl,
 * otherwise fall back to the first image attachment. Returns a browser-usable
 * URL or null when the post has no visual. Used everywhere post cards render so
 * the behaviour stays consistent.
 */
export function resolvePostCover(post: {
  coverImageUrl?: string | null;
  attachments?: Array<{ url: string; type: string }> | null;
}): string | null {
  if (post.coverImageUrl) return attachmentSrc(post.coverImageUrl);
  const firstImage = post.attachments?.find((a) => a.type === "image");
  return firstImage ? attachmentSrc(firstImage.url) : null;
}
