import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from '@google/genai';

import { useAuth } from './contexts/AuthContext';
import { useTheme } from './hooks/useTheme';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { ChatSession, Message, MessageRole } from './types';
import {
  createNewGeminiChat,
  sendMessageStream,
  getTitleForChat,
} from './services/geminiService';

import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import SendIcon from './components/icons/SendIcon';
import MicrophoneIcon from './components/icons/MicrophoneIcon';
import LoadingDots from './components/LoadingDots';
import MenuIcon from './components/icons/MenuIcon';
import WelcomeScreen from './components/WelcomeScreen';
import ApiKeyPrompt from './components/ApiKeyPrompt';

const App: React.FC = () => {
  const { isLoading: isAuthLoading } = useAuth();
  const [theme, toggleTheme] = useTheme();

  const [hasApiKey, setHasApiKey] = useState(false);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(true);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const geminiChat = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = chatSessions.find(
    (session) => session.id === activeSessionId,
  );

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          const keyStatus = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(keyStatus);
        } catch (e) {
          console.error('Error checking for API key:', e);
          setHasApiKey(false);
        }
      }
      setIsApiKeyLoading(false);
    };
    checkApiKey();
  }, []);

  const updateSessionMessages = useCallback(
    (sessionId: string, updateFn: (messages: Message[]) => Message[]) => {
      setChatSessions((prevSessions) =>
        prevSessions.map((session) =>
          session.id === sessionId
            ? { ...session, messages: updateFn(session.messages) }
            : session,
        ),
      );
    },
    [],
  );

  const createNewChat = useCallback(() => {
    if (activeSessionId === null) {
      setIsSidebarOpen(false);
      return;
    }
    setActiveSessionId(null);
    setInput('');
    geminiChat.current = createNewGeminiChat();
    setIsSidebarOpen(false);
  }, [activeSessionId]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    let loadedSessions: ChatSession[] = [];
    try {
      const savedSessionsJSON = localStorage.getItem('chatSessions');
      if (savedSessionsJSON) {
        loadedSessions = JSON.parse(savedSessionsJSON);
      }
    } catch (e) {
      console.error('Failed to parse chat sessions from localStorage', e);
      loadedSessions = [];
    }

    setChatSessions(loadedSessions);

    if (loadedSessions.length > 0) {
      const savedActiveId = localStorage.getItem('activeSessionId');
      if (
        savedActiveId &&
        loadedSessions.some((s) => s.id === savedActiveId)
      ) {
        setActiveSessionId(savedActiveId);
      } else {
        setActiveSessionId(loadedSessions[0].id);
      }
    } else {
      setActiveSessionId(null);
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
      if (activeSessionId) {
        localStorage.setItem('activeSessionId', activeSessionId);
      } else {
        localStorage.removeItem('activeSessionId');
      }
    } else {
      localStorage.removeItem('chatSessions');
      localStorage.removeItem('activeSessionId');
    }
  }, [chatSessions, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isLoading]);

  const handleSendMessage = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || isLoading) return;

      setInput('');
      setIsLoading(true);

      let sessionId = activeSessionId;
      let isNewSession = false;
      let sessionHistory: Message[] = [];

      if (sessionId === null) {
        isNewSession = true;
        const newSession: ChatSession = {
          id: uuidv4(),
          title: 'New Chat',
          messages: [],
        };
        setChatSessions((prev) => [newSession, ...prev]);
        sessionId = newSession.id;
        setActiveSessionId(newSession.id);
      } else {
        const currentSession = chatSessions.find((s) => s.id === sessionId);
        if (!currentSession) {
          setIsLoading(false);
          return; // Should not happen
        }
        sessionHistory = currentSession.messages;
      }

      if (!sessionId) {
        setIsLoading(false);
        return;
      }
      const finalSessionId = sessionId;

      const userMessage: Message = {
        role: MessageRole.USER,
        content: messageContent,
      };
      const modelMessage: Message = { role: MessageRole.MODEL, content: '' };

      updateSessionMessages(finalSessionId, (messages) => [
        ...messages,
        userMessage,
        modelMessage,
      ]);

      try {
        geminiChat.current = createNewGeminiChat(sessionHistory);
        const stream = sendMessageStream(geminiChat.current, messageContent);

        let lastFullResponse = '';
        for await (const chunk of stream) {
          lastFullResponse = chunk;
          updateSessionMessages(finalSessionId, (messages) => {
            const newMessages = [...messages];
            if (newMessages.length > 0) {
              newMessages[newMessages.length - 1].content = chunk;
            }
            return newMessages;
          });
        }

        if (isNewSession) {
          const finalMessagesForTitle = [
            userMessage,
            { role: MessageRole.MODEL, content: lastFullResponse },
          ];
          const newTitle = await getTitleForChat(finalMessagesForTitle);
          setChatSessions((prev) =>
            prev.map((s) =>
              s.id === finalSessionId ? { ...s, title: newTitle } : s,
            ),
          );
        }
      } catch (error) {
        console.error(error);
        if (
          error instanceof Error &&
          (error.message.includes('API key not valid') ||
            error.message.includes('An API Key must be set'))
        ) {
          console.error(
            'API key not valid. Prompting for a new key.',
          );
          setHasApiKey(false); // Re-trigger the API key prompt
        }
        const errorMessage: Message = {
          role: MessageRole.ERROR,
          content: 'Sorry, something went wrong. Please try again.',
        };
        updateSessionMessages(finalSessionId, (messages) => {
          const newMessages = [...messages];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = errorMessage;
          }
          return newMessages;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, activeSessionId, chatSessions, updateSessionMessages],
  );

  const selectChat = (id: string) => {
    setActiveSessionId(id);
    setIsSidebarOpen(false);
  };

  const deleteChat = (id: string) => {
    const remainingSessions = chatSessions.filter((s) => s.id !== id);
    setChatSessions(remainingSessions);
    if (activeSessionId === id) {
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id);
      } else {
        setActiveSessionId(null);
      }
    }
  };

  const onCommand = useCallback(
    (command: string) => {
      if (command === 'send message') {
        handleSendMessage(input);
      } else if (command === 'clear input') {
        setInput('');
      } else if (command === 'new chat') {
        createNewChat();
      }
    },
    [input, handleSendMessage, createNewChat],
  );

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasRecognitionSupport,
  } = useSpeechRecognition({ onCommand });

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  if (isAuthLoading || isApiKeyLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <LoadingDots />
      </div>
    );
  }

  if (!hasApiKey) {
    return <ApiKeyPrompt onKeySelected={() => setHasApiKey(true)} />;
  }

  const lastMessage =
    activeSession?.messages[activeSession.messages.length - 1];

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 font-sans">
      <Sidebar
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        theme={theme}
        toggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-screen">
        <header className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <button onClick={() => setIsSidebarOpen(true)}>
            <MenuIcon />
          </button>
          <h2 className="ml-4 font-semibold text-gray-800 dark:text-gray-200">
            {activeSession?.title || 'New Chat'}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto h-full">
            {activeSession && activeSession.messages.length > 0 ? (
              <>
                {activeSession.messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}
                {isLoading &&
                  lastMessage?.role === MessageRole.MODEL &&
                  lastMessage?.content === '' && (
                    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800">
                      <div className="max-w-4xl mx-auto flex space-x-4">
                        <div className="w-8 h-8 flex-shrink-0"></div>
                        <LoadingDots />
                      </div>
                    </div>
                  )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              !isLoading && <WelcomeScreen onPromptClick={handleSendMessage} />
            )}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(input);
                  }
                }}
                placeholder="Type your message..."
                className="w-full p-3 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                rows={1}
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                {hasRecognitionSupport && (
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`p-2 rounded-full ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <MicrophoneIcon />
                  </button>
                )}
                <button
                  onClick={() => handleSendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
