
import React from 'react';
import { ChatSession } from '../types';
import NewChatIcon from './icons/NewChatIcon';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import CloseIcon from './icons/CloseIcon';

interface SidebarProps {
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Renders the sidebar navigation panel.
 * It displays a list of chat sessions, allows creating new chats,
 * and contains controls for theme switching. It is responsive and
 * can be toggled on mobile devices.
 */
const Sidebar: React.FC<SidebarProps> = ({
  chatSessions,
  activeSessionId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  theme,
  toggleTheme,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Overlay for mobile view */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-30 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-100 dark:bg-gray-900 w-64 text-gray-800 dark:text-gray-200 flex flex-col transition-transform transform z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 md:flex-shrink-0`}
      >
        <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold">KA-28</h1>
          <button onClick={onClose} className="md:hidden">
            <CloseIcon />
          </button>
        </div>

        <div className="p-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <NewChatIcon />
            <span className="ml-2">New Chat</span>
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto p-2 space-y-1">
          {chatSessions.map((session) => (
            <div key={session.id} className="group relative">
              <button
                onClick={() => onSelectChat(session.id)}
                className={`w-full text-left p-2 rounded-md truncate ${
                  activeSessionId === session.id
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {session.title}
              </button>
              {/* Delete button appears on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent selecting the chat when clicking delete
                  onDeleteChat(session.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100"
                aria-label="Delete chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-end">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
