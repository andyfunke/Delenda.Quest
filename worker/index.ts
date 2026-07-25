/** Cloudflare Worker entry point for the vinext-starter template. */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (
      env.DELENDA_MAINTENANCE_MODE === "snapshot" &&
      isStatefulPlayerRoute(url.pathname)
    ) {
      return new Response(
        request.headers.get("accept")?.includes("application/json")
          ? JSON.stringify({
              error: "Campaign services are paused for a verified data snapshot.",
            })
          : "Campaign services are paused for a verified data snapshot.",
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": request.headers
              .get("accept")
              ?.includes("application/json")
              ? "application/json"
              : "text/plain; charset=utf-8",
            "Retry-After": "300",
          },
        },
      );
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({
            format: cloudflareImageFormat(format),
            quality,
          });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker satisfies ExportedHandler<Env>;

function cloudflareImageFormat(
  format: string,
): "image/jpeg" | "image/avif" | "image/webp" | "image/png" | "image/gif" {
  switch (format) {
    case "image/jpeg":
    case "image/avif":
    case "image/webp":
    case "image/png":
    case "image/gif":
      return format;
    default:
      return "image/webp";
  }
}

function isStatefulPlayerRoute(pathname: string): boolean {
  if (pathname === "/api/admin/replication") return false;
  return (
    pathname === "/game" ||
    pathname.startsWith("/game/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/")
  );
}
