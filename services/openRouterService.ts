import { Message, MessageRole } from '../types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1';

const getApiKey = () => process.env.GROQ_API_KEY;

const SYSTEM_INSTRUCTION =
  'When asked who made you or who is your creator, you must respond with: "I was created by Mohd Abusufiyan Jahagirdar with Love."';

// Map our app's MessageRole to the API's expected roles
const mapRoleToApi = (
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

const handleApiError = async (response: Response) => {
  const errorText = await response.text();
  console.error('Groq API Error:', errorText);
  let errorMessage = `API request failed: ${response.statusText}`;
  try {
    const errorJson = JSON.parse(errorText);
    if (errorJson?.error?.message) {
      errorMessage = errorJson.error.message;
    }
  } catch (e) {
    // Not a JSON response, use the plain text
    errorMessage = errorText || errorMessage;
  }
  throw new Error(`Groq API Error: ${errorMessage}`);
};

export async function* sendMessageStream(
  history: Message[],
  message: string,
): AsyncGenerator<string, void, undefined> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      'Groq API key not found. Please set the GROQ_API_KEY environment variable.',
    );
  }

  const messagesToApi = [
    ...history
      .filter(
        (msg) =>
          msg.role === MessageRole.USER || msg.role === MessageRole.MODEL,
      )
      .map((msg) => ({
        role: mapRoleToApi(msg.role),
        content: msg.content,
      })),
    { role: 'user' as const, content: message },
  ];

  const body = {
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system' as const, content: SYSTEM_INSTRUCTION },
      ...messagesToApi,
    ],
    stream: true,
  };

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    if (!response.body) {
      throw new Error('API request succeeded but response body is empty.');
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
      // Re-throw the potentially more helpful error message
      throw error;
    }
    throw new Error('An unknown streaming error occurred.');
  }
}

export const getTitleForChat = async (messages: Message[]): Promise<string> => {
  const apiKey = getApiKey();
  if (messages.length === 0) {
    return 'New Chat';
  }

  if (!apiKey) {
    console.error('Groq API key is not set in environment variables.');
    return 'New Chat';
  }

  const conversationForTitle = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `Generate a short, concise title for this chat (max 5 words), based on this conversation:\n\n${conversationForTitle}\n\nDo not use quotes in the title.`;

  const body = {
    model: 'llama3-8b-8192',
    messages: [{ role: 'user' as const, content: prompt }],
  };

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    const title = data.choices[0]?.message?.content
      ?.trim()
      .replace(/["'*]/g, '');

    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    // Do not throw here, just return a default title
    return 'New Chat';
  }
};
