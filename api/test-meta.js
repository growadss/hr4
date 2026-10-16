const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required" });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = req.headers["x-test-secret"];

  if (!secret || providedSecret !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return res.status(500).json({ error: "Missing Meta credentials" });
  }

  const eventId = `test_${crypto.randomUUID()}`;

  const payload = {
    data: [{
      event_name: "Subscribe",
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "other",
      user_data: {
        external_id: [
          crypto.createHash("sha256")
            .update("telegram_capi_connection_test")
            .digest("hex")
        ]
      }
    }],
    test_event_code: "TEST60643"
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${pixelId}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    return res.status(response.ok ? 200 : 502).json({
      success: response.ok,
      meta_response: result
    });

  } catch (error) {
    return res.status(500).json({
      error: "Meta connection failed"
    });
  }
};
