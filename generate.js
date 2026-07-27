import { GoogleGenAI, Type } from "@google/genai";
import fs from "node:fs";

// GitHub Secrets から API キーを取得
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY が設定されていません。");
  process.exit(1);
}

// GitHub Secrets から LINE Access Token を取得
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!token) {
  console.error("Error: LINE_CHANNEL_ACCESS_TOKEN が設定されていません。");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const responseSchema = {
  type: Type.ARRAY,
  description: "クイズ問題のリスト",
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: "問題文" },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "4つの選択肢",
      },
      correctAnswer: {
        type: Type.INTEGER,
        description: "正解の選択肢のインデックス (0〜3)",
      },
    },
    required: ["question", "options", "correctAnswer"],
  },
};

// YYYY-MM-DD 形式の日付文字列を取得する関数
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ファイルをローテーション（名前変更）する関数
function rotateFiles() {
  const today = new Date();

  // 一昨日（2日前）の日付を取得
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const twoDaysAgoStr = formatDate(twoDaysAgo); // 例: "2026-07-23"

  const todayFileP1 = "docs/eiken_p1_today.json";
  const yesterdayFileP1 = "docs/eiken_p1_yesterday.json";
  const twoDaysAgoFileP1 = `docs/eiken_p1_${twoDaysAgoStr}.json`;

  const todayFileP2 = "docs/eiken_p2_today.json";
  const yesterdayFileP2 = "docs/eiken_p2_yesterday.json";
  const twoDaysAgoFileP2 = `docs/eiken_p2_${twoDaysAgoStr}.json`;

  // 1. もし eiken_p1_yesterday.json が存在したら、一昨日の日付のファイル名にリネーム
  if (fs.existsSync(yesterdayFileP1)) {
    fs.renameSync(yesterdayFileP1, twoDaysAgoFileP1);
    console.log(`Rotated: ${yesterdayFileP1} -> ${twoDaysAgoFileP1}`);
  }

  if (fs.existsSync(yesterdayFileP2)) {
    fs.renameSync(yesterdayFileP2, twoDaysAgoFileP2);
    console.log(`Rotated: ${yesterdayFileP2} -> ${twoDaysAgoFileP2}`);
  }

  // 2. もし eiken_p1_today.json が存在したら、eiken_p1_yesterday.json にリネーム
  if (fs.existsSync(todayFileP1)) {
    fs.renameSync(todayFileP1, yesterdayFileP1);
    console.log(`Rotated: ${todayFileP1} -> ${yesterdayFileP1}`);
  }

  if (fs.existsSync(todayFileP2)) {
    fs.renameSync(todayFileP2, yesterdayFileP2);
    console.log(`Rotated: ${todayFileP2} -> ${yesterdayFileP2}`);
  }
  
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

const prompt = `の語彙力を測る4択の穴埋め問題を10問作成してください。

【厳格なフォーマット指定】
- 各問題の "question" は、単語が入る場所を "(        )" とした「英語の文」にしてください。日本語の訳や解説は含めないでください。
- "options" は、文脈に適合する正解1つと、英検準1級レベルの適切なダミー（紛らわしい選択肢）3つで構成してください。
- "correctAnswer" は、options 配列内の正解のインデックス（0〜3）を数値で指定してください。

【被り防止・バリエーションの指示】
- 10問それぞれで異なる英単語をターゲット（正解）にしてください。
- 動詞、形容詞、名詞、副詞など、品詞の偏りがないようにバランスよく出題してください。
- 単一の文脈（ビジネスなど）に偏らず、社会、環境、日常、科学など多様なテーマの例文を作成してください。
`;

async function genP1Quiz() {
  console.log("Gemini API で英検準1級クイズを生成中...");
  // 1. 新しい問題を生成
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "英検準1級レベル" + prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  // 2. 生成された JSON を eiken_p1_today.json に保存
  fs.writeFileSync("docs/eiken_p1_today.json", response.text);
  console.log("docs/eiken_p1_today.json の生成が完了しました！");
}

async function genP2Quiz() {
  console.log("Gemini API で英検準2級クイズを生成中...");
  // 1. 新しい問題を生成
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "英検準2級レベル" + prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  // 2. 生成された JSON を eiken_p2_today.json に保存
  fs.writeFileSync("docs/eiken_p2_today.json", response.text);
  console.log("docs/eiken_p2_today.json の生成が完了しました！");
}

async function genQuiz() {
  rotateFiles();
  await genP1Quiz();
  await getP2Quiz();
  await sendLineBroadcast(
    `📚 【英検クイズ】\nの問題が新しく生成されました！今日の学習を始めましょう！\nhttps://keniooi.github.io/english-quiz/`
  );
}

genQuiz().catch((err) => {
  console.error(err);
  process.exit(1);
});