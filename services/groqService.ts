
import { Message, MessageRole } from '../types';

// --- CONFIGURATION ---

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// The API key is hardcoded for simplicity, allowing the app to work out-of-the-box.
// In a production environment, this should be handled via environment variables or a secure backend proxy.
const GROQ_API_KEY = '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';

// A system-level instruction that guides the AI's personality or behavior.
// This is sent with every request to ensure consistent responses for specific queries.
const SYSTEM_INSTRUCTION =
  'When asked who made you or who is your creator, you must respond with: "I was created by Mohd Abusufiyan Jahagirdar with Love."';

// --- UTILITY FUNCTIONS ---

/**
 * Maps the application's internal `MessageRole` enum to the role strings
 * expected by the Groq (OpenAI-compatible) API.
 * @param {MessageRole} role The internal role from the application.
 * @returns {'user' | 'assistant' | 'system'} The corresponding role for the API.
 */
const mapRoleToApi = (
  role: MessageRole,
): 'user' | 'assistant' | 'system' => {
  switch (role) {
    case MessageRole.USER:
      return 'user';
    case MessageRole.MODEL:
      return 'assistant';
    default:
      // Roles like 'error' are filtered out before being sent to the API.
      return 'user';
  }
};

/**
 * A robust error handler for API responses. It attempts to parse a JSON error
 * message from the response body, falling back to the status text if parsing fails.
 * @param {Response} response The raw response object from a `fetch` call.
 * @throws {Error} An error with a detailed message from the API.
 */
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
    // If the response is not JSON, use the plain text as the error message.
    errorMessage = errorText || errorMessage;
  }
  throw new Error(`Groq API Error: ${errorMessage}`);
};

// --- CORE API FUNCTIONS ---

/**
 * Sends a user's message and chat history to the Groq API and yields the response
 * as a series of accumulating text chunks.
 * @param {Message[]} history A list of previous messages in the conversation.
 * @param {string} message The new message from the user.
 * @returns {AsyncGenerator<string, void, undefined>} An async generator that yields the complete, updated response text with each new chunk.
 */
export async function* sendMessageStream(
  history: Message[],
  message: string,
): AsyncGenerator<string, void, undefined> {
  // 1. Format the message history for the API.
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

  // 2. Construct the request body.
  const body = {
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system' as const, content: SYSTEM_INSTRUCTION },
      ...messagesToApi,
    ],
    stream: true,
  };

  try {
    // 3. Make the API request.
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    if (!response.body) {
      throw new Error('API request succeeded but response body is empty.');
    }

    // 4. Process the streaming response.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      
      // Add the new chunk of data to our buffer.
      buffer += decoder.decode(value, { stream: true });
      
      // The API sends data as "data: {...}\n\n". We process full lines.
      const boundary = buffer.lastIndexOf('\n');
      if (boundary === -1) {
        continue; // Wait for more data if we don't have a complete line.
      }

      const lines = buffer.substring(0, boundary).split('\n');
      buffer = buffer.substring(boundary + 1); // Keep any partial line for the next chunk.

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataString = line.substring(6).trim();
          if (dataString === '[DONE]') {
            return; // End of stream
          }
          if (!dataString) {
            continue;
          }
          try {
            // Parse the JSON data chunk.
            const data = JSON.parse(dataString);
            const content = data.choices[0]?.delta?.content;
            if (content) {
              // Append the new content and yield the full response so far.
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
      // Re-throw the potentially more helpful error message from handleApiError.
      throw error;
    }
    throw new Error('An unknown streaming error occurred.');
  }
}

/**
 * Generates a concise title for a chat session based on its initial messages.
 * @param {Message[]} messages The first user message and the first model response.
 * @returns {Promise<string>} A short, descriptive title for the chat.
 */
export const getTitleForChat = async (messages: Message[]): Promise<string> => {
  if (messages.length === 0) {
    return 'New Chat';
  }

  const conversationForTitle = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `Generate a short, concise title for this chat (max 5 words), based on this conversation:\n\n${conversationForTitle}\n\nDo not use quotes in the title.`;

  const body = {
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user' as const, content: prompt }],
  };

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    // Clean up the title by removing quotes and extra whitespace.
    const title = data.choices[0]?.message?.content
      ?.trim()
      .replace(/["'*]/g, '');

    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    // Do not throw an error to the user, just return a default title.
    return 'New Chat';
  }
};
