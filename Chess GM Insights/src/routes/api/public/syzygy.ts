import { createFileRoute } from "@tanstack/react-router";

// Syzygy tablebase proxy — placeholder, returns empty result.
// Real implementation will proxy to tablebase.lichess.ovh later.
export const Route = createFileRoute("/api/public/syzygy")({
  server: {
    handlers: {
      GET: async () => Response.json({ moves: [], category: "unknown" }),
    },
  },
});
