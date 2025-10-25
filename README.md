
# KA-28: High-Speed AI Chat Application

KA-28 is a sleek, responsive chat application powered by the high-speed Groq API. It's inspired by minimalist and incredibly fast user interfaces, allowing users to engage in real-time, streaming conversations with a powerful AI assistant.

## Key Features

- **Real-time Streaming Chat**: Responses from the AI are streamed in real-time, character by character, providing a fluid and interactive experience.
- **Powered by Groq API**: Leverages the Groq LPU Inference Engine for extremely fast AI responses using state-of-the-art models like Llama 3.1.
- **Chat History**: Conversations are automatically saved to the browser's local storage, allowing you to pick up where you left off.
- **Voice Input**: Includes a "speak-to-text" feature using the Web Speech API for hands-free message input.
- **Responsive Design**: A clean, modern UI that works seamlessly on both desktop and mobile devices.
- **Dark/Light Mode**: A theme toggle that respects your OS preference and saves your choice.
- **Markdown Support**: AI responses are rendered as Markdown, supporting formatting like lists, code blocks, and bold text.
- **Zero Configuration**: The application works out-of-the-box with a pre-configured API key, requiring no setup from the user.

## Technology Stack

- **Frontend**: React 19, TypeScript
- **AI Backend**: Groq API (`llama-3.1-8b-instant` model)
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **Speech Recognition**: Web Speech API

---

## How It Works

The application is a single-page application built entirely on the frontend. It communicates directly with the Groq API from the client-side.

1.  **Initialization**: When the app loads, it checks local storage for any previously saved chat sessions and the user's preferred theme.
2.  **User Input**: The user can type a message or use the microphone for voice input. The input is managed by the main `App.tsx` component.
3.  **API Communication (`groqService.ts`)**:
    - When a message is sent, the `sendMessageStream` function in `groqService.ts` is called.
    - It constructs a request payload containing the current conversation history and a system instruction.
    - It makes a `POST` request to the Groq API endpoint with the `stream: true` option.
4.  **Stream Processing**:
    - The service reads the streaming response from the API.
    - The data arrives in chunks and is processed line by line. A buffer is used to ensure complete JSON objects are parsed, preventing errors.
    - As text content is extracted from the stream, it is `yield`ed back to the `App.tsx` component.
5.  **Real-time UI Updates**:
    - The `App.tsx` component iterates through the asynchronous generator from the stream.
    - With each new piece of text, it updates the state, causing the `ChatMessage` component to re-render with the latest content. This creates the "typing" effect.
6.  **Title Generation**:
    - For new chats, once the first response is complete, the `getTitleForChat` function is called.
    - It sends the initial user message and the full AI response back to the Groq API with a prompt asking it to create a concise title.
    - The title is then updated in the application state and displayed in the sidebar.
7.  **State & Persistence**: All chat sessions, including messages and titles, are stored in a state variable in `App.tsx`. A `useEffect` hook monitors this state and saves any changes to the browser's `localStorage`, ensuring the data persists across browser sessions.

## File Structure Overview

```
.
├── components/         # Reusable React components
│   ├── icons/          # SVG icon components
│   ├── App.tsx         # Main application component
│   ├── ChatMessage.tsx # Renders a single chat message
│   ├── Sidebar.tsx     # Left sidebar for chat history and navigation
│   └── ...
├── contexts/           # React context providers (e.g., AuthContext)
├── firebase/           # Firebase configuration (currently disabled)
├── hooks/              # Custom React hooks
│   ├── useSpeechRecognition.ts # Logic for voice input
│   └── useTheme.ts     # Logic for dark/light mode
├── services/           # Modules for external API communication
│   └── groqService.ts  # Handles all API calls to the Groq API
├── types.ts            # TypeScript type definitions
├── index.html          # The main HTML file
├── index.tsx           # The entry point of the React application
└── README.md           # This file
```
