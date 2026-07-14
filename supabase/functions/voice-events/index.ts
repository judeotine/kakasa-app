import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const contentType = req.headers.get("content-type") || "";
  let data: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      data[key] = String(value);
    }
  } else {
    try {
      data = await req.json();
    } catch {
      return new Response("OK", { status: 200 });
    }
  }

  const sessionId = data.sessionId || data.callSessionId || "";
  const callerPhone = data.callerNumber || data.from || "";
  const isActive = data.isActive;
  const duration = parseInt(data.durationInSeconds || data.duration || "0") || 0;
  const direction = data.direction || "";
  const status = data.callSessionState || data.status || "";

  let action = "call_event";
  if (isActive === "0") action = "call_ended";
  else if (isActive === "1") action = "call_active";
  else if (status) action = status;

  await admin.from("voice_sessions").insert({
    session_id: sessionId,
    caller_phone: callerPhone,
    language: "eng",
    action,
    duration_seconds: duration,
  });

  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
});
