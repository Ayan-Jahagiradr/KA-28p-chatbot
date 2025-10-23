import { GoogleGenAI, Chat, Content } from '@google/genai';
import { Message, MessageRole } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildGeminiHistory = (messages: Message[]): Content[] => {
  return messages
    .filter((msg) => msg.role !== MessageRole.ERROR && msg.content)
    .map((msg) => ({
      role: msg.role === MessageRole.USER ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
};

export const createNewGeminiChat = (messages: Message[] = []): Chat => {
  const history = buildGeminiHistory(messages);

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history,
    config: {
      systemInstruction: 'When asked who made you or who is your creator, you must respond with: "I was created by Mohd Abusufiyan Jahagirdar with Love."'
    }
  });

  return chat;
};

export async function* sendMessageStream(
  chat: Chat,
  message: string,
): AsyncGenerator<string, void, undefined> {
  const result = await chat.sendMessageStream({ message });
  let fullResponse = '';
  for await (const chunk of result) {
    // Each chunk is a GenerateContentResponse object.
    // The `text` property contains the text of the current chunk.
    const chunkText = chunk.text;
    if (chunkText) {
      fullResponse += chunkText;
      yield fullResponse;
    }
  }
}

export const getTitleForChat = async (messages: Message[]): Promise<string> => {
  if (messages.length === 0) {
    return 'New Chat';
  }

  const conversationForTitle = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `Generate a short, concise title for this chat (max 5 words), based on this conversation:\n\n${conversationForTitle}\n\nDo not use quotes in the title.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Good for simple text tasks
      contents: prompt,
    });

    // Per guidelines, access text directly from response.text
    let title = response.text.trim();

    // Clean up the title, remove quotes if any and other unwanted characters
    title = title.replace(/["'*]/g, '');

    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
};
