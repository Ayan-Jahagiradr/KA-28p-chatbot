
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useAuth } from './contexts/AuthContext';
import { useTheme } from './hooks/useTheme';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { ChatSession, Message, MessageRole } from './types';
import {
  sendMessageStream,
  getTitleForChat,
} from './services/groqService'; 

import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import SendIcon from './components/icons/SendIcon';
import MicrophoneIcon from './components/icons/MicrophoneIcon';
import LoadingDots from './components/LoadingDots';
import MenuIcon from './components/icons/MenuIcon';
import WelcomeScreen from './components/WelcomeScreen';
import ConfirmationModal from './components/ConfirmationModal';

/**
 * The main application component. It manages the entire application state,
 * including chat sessions, user input, and UI interactions.
 */
const App: React.FC = () => {
  // --- HOOKS ---
  const { isLoading: isAuthLoading } = useAuth();
  const [theme, toggleTheme] = useTheme();

  // --- STATE MANAGEMENT ---
  // All chat sessions, including their messages and titles.
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  // The ID of the currently active chat session. Null indicates a new, unsaved chat.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  // The current content of the user input textarea.
  const [input, setInput] = useState('');
  // A boolean flag to indicate if the AI is currently generating a response.
  const [isLoading, setIsLoading] = useState(false);
  // Controls the visibility of the sidebar on mobile devices.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Holds the ID of the session that the user has requested to delete, pending confirmation.
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // A ref to the end of the messages list to enable auto-scrolling.
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- DERIVED STATE ---
  // Finds the active chat session object from the sessions array.
  const activeSession = chatSessions.find(
    (session) => session.id === activeSessionId,
  );
  
  /**
   * A memoized utility function to update the messages of a specific chat session.
   * This helps prevent unnecessary re-renders.
   * @param sessionId The ID of the session to update.
   * @param updateFn A function that receives the current messages and returns the updated messages.
   */
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

  /**
   * Resets the UI state to start a new chat conversation.
   */
  const createNewChat = useCallback(() => {
    setActiveSessionId(null);
    setInput('');
    setIsSidebarOpen(false);
  }, []);

  // --- EFFECTS ---

  // Load chat sessions and the last active session ID from localStorage on initial component mount.
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
        // Default to the most recent session if the saved one is invalid.
        setActiveSessionId(loadedSessions[0].id);
      }
    } else {
      setActiveSessionId(null);
    }
  }, []);

  // Save chat sessions and the active session ID to localStorage whenever they change.
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
      if (activeSessionId) {
        localStorage.setItem('activeSessionId', activeSessionId);
      } else {
        localStorage.removeItem('activeSessionId');
      }
    } else {
      // Clean up localStorage if there are no sessions left.
      localStorage.removeItem('chatSessions');
      localStorage.removeItem('activeSessionId');
    }
  }, [chatSessions, activeSessionId]);

  // Automatically scroll to the latest message when the chat updates.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isLoading]);

  // --- CORE LOGIC ---

  /**
   * Handles the entire process of sending a user message and receiving a streamed response from the AI.
   * @param messageContent The text content of the message to send.
   */
  const handleSendMessage = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || isLoading) return;

      setInput('');
      setIsLoading(true);

      let sessionId = activeSessionId;
      let isNewSession = false;
      let sessionHistory: Message[] = [];

      // 1. Determine if this is a new chat or an existing one.
      if (sessionId === null) {
        isNewSession = true;
        const newSession: ChatSession = {
          id: uuidv4(),
          title: 'New Chat',
          messages: [],
        };
        // Add the new session to the top of the list.
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

      // 2. Add the user's message and a placeholder for the model's response to the UI.
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
        // 3. Call the API service to get a streamed response.
        const stream = sendMessageStream(sessionHistory, messageContent);

        let lastFullResponse = '';
        // 4. Update the UI with each chunk of the response as it arrives.
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

        // 5. If it was a new session, generate and set a title for it.
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
        // 6. Handle any errors during the API call.
        console.error(error);
        const errorMessageContent =
          error instanceof Error
            ? error.message
            : 'Sorry, something went wrong. Please check your API key and try again.';
        const errorMessage: Message = {
          role: MessageRole.ERROR,
          content: errorMessageContent,
        };
        // Replace the model's placeholder message with an error message.
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
  
  // --- EVENT HANDLERS ---
  const selectChat = (id: string) => {
    setActiveSessionId(id);
    setIsSidebarOpen(false);
  };

  const requestDeleteChat = (id: string) => {
    setSessionToDelete(id);
  };

  const confirmDeleteChat = () => {
    if (!sessionToDelete) return;
    const remainingSessions = chatSessions.filter((s) => s.id !== sessionToDelete);
    setChatSessions(remainingSessions);
    // If the active chat was deleted, select another one or start a new chat.
    if (activeSessionId === sessionToDelete) {
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id);
      } else {
        setActiveSessionId(null);
      }
    }
    setSessionToDelete(null);
  };

  const cancelDeleteChat = () => {
    setSessionToDelete(null);
  };

  // --- SPEECH RECOGNITION ---
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

  // Update text input with the transcript from speech recognition.
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);


  // --- RENDER LOGIC ---

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <LoadingDots />
      </div>
    );
  }
  
  const lastMessage =
    activeSession?.messages[activeSession.messages.length - 1];
  
  const sessionToDeleteDetails = chatSessions.find(s => s.id === sessionToDelete);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 font-sans">
      <Sidebar
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onDeleteChat={requestDeleteChat}
        theme={theme}
        toggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <ConfirmationModal
        isOpen={!!sessionToDelete}
        onClose={cancelDeleteChat}
        onConfirm={confirmDeleteChat}
        title="Delete Chat"
      >
        <p>
          Are you sure you want to delete the chat "
          <span className="font-semibold">{sessionToDeleteDetails?.title}</span>"? This action cannot be undone.
        </p>
      </ConfirmationModal>

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
                {/* Show loading dots only when waiting for the first chunk of a new message */}
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
              // Show welcome screen for new chats
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
