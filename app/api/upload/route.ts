import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    // Debug: Check if API key exists
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("API Key exists:", !!apiKey);
    console.log("API Key starts with:", apiKey?.substring(0, 10) + "...");

    // get prompt field from the request body
    const reqBody = await req.json();
    const { userPrompt } = reqBody;
    console.log("User prompt:", userPrompt);

    if (!apiKey) {
      return NextResponse.json({
        text: "API key is missing",
        error: "GEMINI_API_KEY not found"
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 200 },
    });

    console.log("Calling Gemini API...");
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    console.log("Gemini response:", text);

    return NextResponse.json({
      parsedText: text,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({
      text: "Unable to process the prompt. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}