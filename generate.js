import { GoogleGenAI, Type } from "@google/genai";
import fs from "node:fs";

// GitHub Secrets から API キーを取得
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY が設定されていません。");
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

  const todayFile = "doc/eiken_p1_today.json";
  const yesterdayFile = "doc/eiken_p1_yesterday.json";
  const twoDaysAgoFile = `doc/eiken_p1_${twoDaysAgoStr}.json`;

  // 1. もし eiken_p1_yesterday.json が存在したら、一昨日の日付のファイル名にリネーム
  if (fs.existsSync(yesterdayFile)) {
    fs.renameSync(yesterdayFile, twoDaysAgoFile);
    console.log(`Rotated: ${yesterdayFile} -> ${twoDaysAgoFile}`);
  }

  // 2. もし eiken_p1_today.json が存在したら、eiken_p1_yesterday.json にリネーム
  if (fs.existsSync(todayFile)) {
    fs.renameSync(todayFile, yesterdayFile);
    console.log(`Rotated: ${todayFile} -> ${yesterdayFile}`);
  }
}

async function genP1Quiz() {
  // 1. まず古いファイルを移動・整理する
  rotateFiles();

  console.log("Gemini API で英検準1級クイズを生成中...");

  // 2. 新しい問題を生成
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "「英検準1級の単語」に関する4択クイズを10問作成してください。",
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  // 3. 生成された JSON を eiken_p1_today.json に保存
  fs.writeFileSync("eiken_p1_today.json", response.text);
  console.log("eiken_p1_today.json の生成が完了しました！");
}

genP1Quiz().catch((err) => {
  console.error(err);
  process.exit(1);
});