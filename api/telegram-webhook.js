const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("Telegram webhook is running");
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret =
    req.headers["x-telegram-bot-api-secret-token"];

  if (!secret || receivedSecret !== secret) {
    return res.status(401).send("Unauthorized");
  }

  const update = req.body;
  const joinRequest = update?.chat_join_request;

  // Ignore updates other than Telegram Join Requests
  if (!joinRequest) {
    return res.status(200).send("Ignored");
  }

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.error("Missing Meta environment variables");
    return res.status(500).send("Configuration error");
  }

  // Stable event ID helps Meta identify webhook retries
  const eventId = `tg_join_request_${update.update_id}`;

  // Hash Telegram user ID for external_id
  const externalId = crypto
    .createHash("sha256")
    .update(String(joinRequest.from.id))
    .digest("hex");

  const eventTime = joinRequest.date || Math.floor(Date.now() / 1000);

  const payload = {
    data: [
      {
        event_name: "Subscribe",
        event_time: eventTime,
        event_id: eventId,
        action_source: "other",
        user_data: {
          external_id: [externalId]
        },
        custom_data: {
          source: "telegram_join_request"
        }
      }
    ]
  };
payload.test_event_code = "TEST60643";
  try {
    const url =
      `https://graph.facebook.com/vXX.X/${pixelId}/events` +
      `?access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(url.replace("vXX.X", "v25.0"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Meta CAPI error:", result);
      return res.status(502).send("Meta event failed");
    }

    console.log("Meta event sent:", eventId);
    return res.status(200).send("Join request event sent");
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).send("Webhook failed");
  }
};
