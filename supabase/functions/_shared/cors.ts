export const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5500",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function handleCors(req: Request): Response | null {
  const origin = req.headers.get("origin");
  const headers = { ...corsHeaders };
  
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  return null;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers = { ...corsHeaders };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
