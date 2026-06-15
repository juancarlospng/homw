const RESEND_ENDPOINT = "https://api.resend.com/emails";

function json(response, status, payload) {
  response.status(status).json(payload);
}

function clean(value) {
  return String(value || "").trim();
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || "info@woehm.com";
  const from = process.env.CONTACT_FROM_EMAIL || "HOMW <onboarding@resend.dev>";

  if (!apiKey) {
    return json(response, 500, { error: "Email service is not configured" });
  }

  const name = clean(request.body?.name);
  const email = clean(request.body?.email);
  const company = clean(request.body?.company);
  const details = clean(request.body?.details);

  if (!name || !email || !details) {
    return json(response, 400, { error: "Name, email and project details are required" });
  }

  const emailBody = [
    "New HOMW walkthrough request",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || "Not provided"}`,
    "",
    "Project details:",
    details,
  ].join("\n");

  const resendResponse = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: `HOMW walkthrough request from ${name}`,
      text: emailBody,
    }),
  });

  if (!resendResponse.ok) {
    return json(response, 502, { error: "Could not send email" });
  }

  return json(response, 200, { ok: true });
}
