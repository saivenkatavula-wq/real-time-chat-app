import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import {
  getGeminiModel,
  getModelFallbackOrder,
  isGeminiConfigured,
} from "../lib/gemini.js";

const TONE_PRESETS = new Set([
  "friendly",
  "professional",
  "casual",
  "empathetic",
  "encouraging",
]);

const normalizeTone = (tone) => tone?.toString().trim().toLowerCase() ?? "";

const formatMessageContent = (message, myId) => {
  const isMine = message.senderId.toString() === myId;
  const speaker = isMine ? "You" : "Friend";

  const parts = [];
  if (message.text) {
    parts.push(message.text);
  }

  if (message.image) {
    parts.push("[Image shared]");
  }

  if (parts.length === 0) {
    return null;
  }

  return `${speaker}: ${parts.join(" ")}`;
};

const buildConversationContext = (messages, myId) =>
  messages
    .map((message) => formatMessageContent(message, myId))
    .filter(Boolean)
    .join("\n");

export const suggestReply = async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({ error: "AI features are not configured" });
  }

  const { id: friendId } = req.params;
  const toneInput = normalizeTone(req.body?.tone);

  if (!toneInput || !TONE_PRESETS.has(toneInput)) {
    return res.status(400).json({ error: "Tone is required" });
  }

  try {
    const myId = req.user._id.toString();
    const isFriend = req.user.friends?.some(
      (friend) => friend.toString() === friendId
    );

    if (!isFriend) {
      return res
        .status(403)
        .json({ error: "You can only request suggestions for friends" });
    }

    const friend = await User.findById(friendId).select("fullName");
    if (!friend) {
      return res.status(404).json({ error: "Friend not found" });
    }

    const recentMessages = await Message.find({
      $or: [
        { senderId: myId, receiverId: friendId },
        { senderId: friendId, receiverId: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const conversationContext = buildConversationContext(
      recentMessages.reverse(),
      myId
    );

    const toneDescription = toneInput;

    const conversationSummary = conversationContext
      ? `Conversation so far:\n${conversationContext}`
      : `There has been no prior conversation. You are helping the user message ${friend.fullName}.`;

    const systemPrompt = `You are an assistant that drafts ${toneDescription} replies for a messaging application.
The reply should be actionable, concise (under 120 words), and must sound like a real person.
Do not include explanations or meta commentary—return only the suggested message text.`;

    const userPrompt = `${conversationSummary}\n\nWrite a single ${toneDescription} reply that the user could send next.`;

    let suggestion = null;
    let lastError = null;
    const modelsToTry = getModelFallbackOrder();

    for (const modelName of modelsToTry) {
      try {
        const model = getGeminiModel(modelName);
        const result = await model.generateContent({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
        });

        suggestion = result?.response?.text()?.trim();

        if (suggestion) {
          break;
        }
      } catch (error) {
        lastError = error;
        const isNotFound =
          error?.status === 404 ||
          error?.statusText === "Not Found" ||
          error?.message?.includes("not found");

        if (!isNotFound) {
          throw error;
        }
      }
    }

    if (!suggestion) {
      if (lastError) {
        throw lastError;
      }
      return res
        .status(502)
        .json({ error: "AI did not return a valid suggestion" });
    }

    return res.status(200).json({ suggestion });
  } catch (error) {
    console.error("Error generating AI suggestion:", error);
    if (error?.status === 404) {
      return res.status(503).json({
        error:
          "Requested Gemini model is unavailable. Please update GEMINI_MODEL or try again later.",
      });
    }

    const status = error.message?.includes("Gemini API key") ? 503 : 500;
    return res.status(status).json({ error: "Failed to generate suggestion" });
  }
};
