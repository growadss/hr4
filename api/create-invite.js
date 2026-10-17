const { neon } = require("@neondatabase/serverless");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const databaseUrl =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!databaseUrl || !botToken || !chatId) {
      return res.status(500).json({
        error: "Missing environment variables"
      });
    }

    const sql = neon(databaseUrl);

    const { fbp, fbc } = req.body || {};

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          creates_join_request: true,
          name: "Meta Tracking"
        })
      }
    );

    const result = await response.json();

    if (!result.ok) {
      return res.status(500).json({
        error: "Telegram invite creation failed"
      });
    }

    const inviteLink = result.result.invite_link;

    await sql`
      INSERT INTO telegram_invite_tracking
      (invite_link, fbp, fbc)
      VALUES (${inviteLink}, ${fbp || null}, ${fbc || null})
    `;

    return res.status(200).json({
      success: true,
      invite_link: inviteLink
    });

  } catch (error) {
    console.error("Create invite error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
};
