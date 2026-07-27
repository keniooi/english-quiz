// GitHub Secrets から LINE Access Token を取得
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!token) {
  console.error("Error: LINE_CHANNEL_ACCESS_TOKEN が設定されていません。");
  process.exit(1);
}

// 🔔 LINEにメッセージを送信する関数
async function sendLineBroadcast(message) {
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("LINE通知の送信に失敗しました:", errorText);
    } else {
      console.log("LINE通知を送信しました。");
    }
  } catch (err) {
    console.error("LINE通知リクエスト中にエラーが発生しました:", err);
  }
}

sendLineBroadcast(
    `📚 【英検クイズ】\nの問題が新しく生成されました！今日の学習を始めましょう！\nhttps://keniooi.github.io/english-quiz/`
).catch((err) => {
  console.error(err);
  process.exit(1);
});