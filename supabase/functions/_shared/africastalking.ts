const AT_SMS_URL = "https://api.africastalking.com/version1/messaging";
const AT_SANDBOX_SMS_URL = "https://api.sandbox.africastalking.com/version1/messaging";

function getApiKey(): string {
  return Deno.env.get("AFRICASTALKING_API_KEY")!;
}

function getUsername(): string {
  return Deno.env.get("AFRICASTALKING_USERNAME") ?? "sandbox";
}

function getSmsUrl(): string {
  return getUsername() === "sandbox" ? AT_SANDBOX_SMS_URL : AT_SMS_URL;
}

export async function sendSMS(
  to: string,
  message: string
): Promise<{ messageId: string; status: string }> {
  const params = new URLSearchParams({
    username: getUsername(),
    to,
    message,
  });

  const res = await fetch(getSmsUrl(), {
    method: "POST",
    headers: {
      apiKey: getApiKey(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "unknown error");
    throw new Error(`SMS send failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const recipient = data.SMSMessageData?.Recipients?.[0];
  return {
    messageId: recipient?.messageId ?? "",
    status: recipient?.status ?? "unknown",
  };
}

export function ussdResponse(text: string, isEnd: boolean): Response {
  const prefix = isEnd ? "END " : "CON ";
  return new Response(prefix + text, {
    headers: { "Content-Type": "text/plain" },
  });
}

export function formatPhone(msisdn: string): string {
  if (msisdn.startsWith("+")) return msisdn;
  if (msisdn.startsWith("0")) return "+256" + msisdn.slice(1);
  return "+" + msisdn;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 6) return phone;
  const local = digits.startsWith("256") ? "0" + digits.slice(3) : digits;
  return local.slice(0, 4) + "****" + local.slice(-2);
}
