// FIX: Switched from OpenRouter to the official Google GenAI SDK.
// This addresses the type error and aligns with best practices.
import { GoogleGenAI, Content } from '@google/genai';
import { Message, MessageRole } from '../types';

const API_KEY = process.env.API_KEY;

const SYSTEM_INSTRUCTION =
  'When asked who made you or who is your creator, you must respond with: "I was created by Mohd Abusufiyan Jahagirdar with Love."';

const buildGeminiHistory = (messages: Message[]): Content[] => {
  return messages
    .filter(
      (msg) =>
        (msg.role === MessageRole.USER || msg.role === MessageRole.MODEL) &&
        msg.content,
    )
    .map((msg) => ({
      // Gemini API uses 'user' and 'model' roles, which match our MessageRole enum
      role: msg.role,
      parts: [{ text: msg.content }],
    }));
};

export async function* sendMessageStream(
  history: Message[],
  message: string,
): AsyncGenerator<string, void, undefined> {
  if (!API_KEY) {
    throw new Error(
      'The API_KEY environment variable has not been set. Please set it to your Gemini API key.',
    );
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Use a recommended model for chat applications.
  const modelName = 'gemini-2.5-flash';
  const chatHistory = buildGeminiHistory(history);

  try {
    // The application manages history per-session, so we create a new chat
    // instance with history for each message.
    const chat = ai.chats.create({
      model: modelName,
      history: chatHistory,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const result = await chat.sendMessageStream({ message });

    let fullResponse = '';
    for await (const chunk of result) {
      // The UI expects the full response text on each stream event, so we accumulate it.
      if (chunk.text) {
        fullResponse += chunk.text;
        yield fullResponse;
      }
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    if (error instanceof Error) {
      throw new Error(`API request failed: ${error.message}`);
    }
    throw new Error(`An unknown API error occurred.`);
  }
}

export const getTitleForChat = async (messages: Message[]): Promise<string> => {
  if (messages.length === 0) {
    return 'New Chat';
  }

  if (!API_KEY) {
    console.error('API_KEY is not set for getTitleForChat');
    return 'New Chat';
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const conversationForTitle = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `Generate a short, concise title for this chat (max 5 words), based on this conversation:\n\n${conversationForTitle}\n\nDo not use quotes in the title.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // Use response.text to get the content as per Gemini API guidelines.
    let title = response.text.trim().replace(/["'*]/g, '');
    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
};
