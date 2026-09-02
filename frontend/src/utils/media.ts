/**
 * Media URL resolution utility for courses, banners, and uploads.
 * Ensures URLs work seamlessly across both local development (:5173 -> :8000)
 * and public AWS production (Nginx reverse proxy on port 80).
 */

const isLocalhost = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
};

/**
 * Returns a fully functional URL for course thumbnails:
 * - On Localhost: http://localhost:8000/courses/thumbnails/...
 * - On AWS/Production: /courses/thumbnails/...
 */
export function getThumbnailFullUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Blob or Data URLs (client-side file previews)
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const local = isLocalhost();

  // If already prefixed with localhost:8000 / 127.0.0.1:8000 from past database records:
  if (trimmed.startsWith("http://localhost:8000") || trimmed.startsWith("http://127.0.0.1:8000")) {
    if (local) return trimmed;
    // On AWS production: strip the host so it resolves locally through Nginx
    const path = trimmed.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, "");
    return path.startsWith("/") ? path : `/${path}`;
  }

  // External CDN URLs (e.g. Unsplash placeholders)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Ensure clean leading slash
  let cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  // If path was saved with an extraneous /api prefix, normalize to /courses/thumbnails
  if (cleanPath.startsWith("/api/courses/thumbnails/")) {
    cleanPath = cleanPath.replace(/^\/api/, "");
  }

  // On localhost, Vite runs on :5173 while backend is on :8000
  if (local) {
    return `http://localhost:8000${cleanPath}`;
  }

  // On AWS/Production, served via Nginx reverse proxy on port 80
  return cleanPath;
}

/**
 * Returns a fully functional URL for promotion banners:
 * - On Localhost: http://localhost:8000/banners/image/...
 * - On AWS/Production: /banners/image/...
 */
export function getBannerImageUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const local = isLocalhost();

  if (trimmed.startsWith("http://localhost:8000") || trimmed.startsWith("http://127.0.0.1:8000")) {
    if (local) return trimmed;
    const path = trimmed.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, "");
    return path.startsWith("/") ? path : `/${path}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  let cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  if (cleanPath.startsWith("/api/banners/image/")) {
    cleanPath = cleanPath.replace(/^\/api/, "");
  }

  if (local) {
    return `http://localhost:8000${cleanPath}`;
  }

  return cleanPath;
}

/**
 * Generic media resolver for videos, attachments, etc.
 */
export function resolveMediaUrl(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const local = isLocalhost();

  if (trimmed.startsWith("http://localhost:8000") || trimmed.startsWith("http://127.0.0.1:8000")) {
    if (local) return trimmed;
    const path = trimmed.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, "");
    return path.startsWith("/") ? path : `/${path}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  if (local) {
    return `http://localhost:8000${cleanPath}`;
  }

  return cleanPath;
}
