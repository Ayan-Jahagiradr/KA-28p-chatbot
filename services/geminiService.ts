import { Message, MessageRole } from '../types';

const API_KEY = process.env.API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_INSTRUCTION =
  'When asked who made you or who is your creator, you must respond with: "I was created by Mohd Abusufiyan Jahagirdar with Love."';

// Map our app's MessageRole to OpenRouter's expected roles
const mapRoleToOpenRouter = (
  role: MessageRole,
): 'user' | 'assistant' | 'system' => {
  switch (role) {
    case MessageRole.USER:
      return 'user';
    case MessageRole.MODEL:
      return 'assistant';
    default:
      // This case should be filtered out before calling the API
      return 'user';
  }
};

export async function* sendMessageStream(
  history: Message[],
  message: string,
): AsyncGenerator<string, void, undefined> {
  if (!API_KEY) {
    throw new Error(
      'The API_KEY environment variable has not been set. Please set it to your OpenRouter API key.',
    );
  }

  const messagesToApi = [
    ...history
      .filter(
        (msg) => msg.role === MessageRole.USER || msg.role === MessageRole.MODEL,
      )
      .map((msg) => ({
        role: mapRoleToOpenRouter(msg.role),
        content: msg.content,
      })),
    { role: 'user' as const, content: message },
  ];

  const body = {
    model: 'google/gemini-flash-1.5',
    messages: [
      { role: 'system' as const, content: SYSTEM_INSTRUCTION },
      ...messagesToApi,
    ],
    stream: true,
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      console.error('OpenRouter API Error:', errorText);
      throw new Error(
        `API request failed: ${response.statusText} - ${errorText}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataString = line.substring(6);
          if (dataString === '[DONE]') {
            return;
          }
          try {
            const data = JSON.parse(dataString);
            const content = data.choices[0]?.delta?.content;
            if (content) {
              accumulatedResponse += content;
              yield accumulatedResponse;
            }
          } catch (e) {
            console.error(
              'Error parsing stream data:',
              e,
              'Data:',
              dataString,
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming Error:', error);
    if (error instanceof Error) {
      throw new Error(`Streaming failed: ${error.message}`);
    }
    throw new Error('An unknown streaming error occurred.');
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

  const conversationForTitle = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `Generate a short, concise title for this chat (max 5 words), based on this conversation:\n\n${conversationForTitle}\n\nDo not use quotes in the title.`;

  const body = {
    model: 'mistralai/mistral-7b-instruct:free',
    messages: [{ role: 'user' as const, content: prompt }],
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    const title = data.choices[0]?.message?.content?.trim().replace(/["'*]/g, '');

    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
};
