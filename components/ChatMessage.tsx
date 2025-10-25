
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, MessageRole } from '../types';
import UserIcon from './icons/UserIcon';
import SparkleIcon from './icons/SparkleIcon';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';

interface ChatMessageProps {
  /** The message object to display. */
  message: Message;
}

/**
 * Renders a single message in the chat interface.
 * It handles different styles for user, model, and error messages,
 * supports Markdown rendering for model responses, and includes a
 * copy-to-clipboard feature for model messages.
 */
const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { role, content } = message;
  const [isCopied, setIsCopied] = useState(false);

  const isUser = role === MessageRole.USER;
  const isModel = role === MessageRole.MODEL;
  const isError = role === MessageRole.ERROR;

  const containerClasses = isUser
    ? 'bg-white dark:bg-gray-900'
    : 'bg-gray-50 dark:bg-gray-800';

  const icon = isUser ? <UserIcon /> : <SparkleIcon />;

  const textColor = isError
    ? 'text-red-500'
    : 'text-gray-800 dark:text-gray-100';

  /**
   * Copies the message content to the user's clipboard and provides visual feedback.
   */
  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div
      className={`group p-4 sm:p-6 ${containerClasses} transition-colors duration-300`}
    >
      <div className="max-w-4xl mx-auto flex space-x-4">
        <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 transition-colors duration-300">
          {icon}
        </div>
        <div
          className={`prose dark:prose-invert max-w-none ${textColor} flex-grow transition-colors duration-300 relative`}
        >
          {/* Show copy button only for non-empty model messages */}
          {isModel && content && (
            <button
              onClick={handleCopy}
              className={`absolute -top-2 right-0 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all ${
                isCopied ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
              }`}
              aria-label={isCopied ? 'Copied!' : 'Copy message'}
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
          )}
          {/* Render content as plain text for errors, or as Markdown for user/model messages */}
          {isError ? (
            <p>{content}</p>
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
