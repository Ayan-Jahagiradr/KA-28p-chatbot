import React from 'react';

// Fix: Defined the AIStudio interface to resolve a TypeScript error about conflicting global declarations for `window.aistudio`.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}

interface ApiKeyPromptProps {
  onKeySelected: () => void;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    if (!window.aistudio) {
      console.error('aistudio context not available.');
      alert('API key selection is not available in this environment.');
      return;
    }
    try {
      await window.aistudio.openSelectKey();
      onKeySelected();
    } catch (e) {
      console.error('Error opening API key selection:', e);
      alert('An error occurred while trying to select an API key.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-md text-center shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Select API Key
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          To continue, please select a Gemini API key. Your key is securely
          managed and used to access the Gemini API.
        </p>
        <button
          onClick={handleSelectKey}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline w-full text-lg transition-colors"
        >
          Choose API Key
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          For information about API keys and billing, please visit{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            ai.google.dev/gemini-api/docs/billing
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default ApiKeyPrompt;
