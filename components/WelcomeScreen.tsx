import React from 'react';
import SparkleIcon from './icons/SparkleIcon';

interface WelcomeScreenProps {
  onPromptClick: (prompt: string) => void;
}

const promptStarters = [
  'Explain quantum computing in simple terms',
  'Write a Python script to sort a list of strings',
  'What are the top 3 benefits of a morning workout?',
  'Give me some ideas for a weekend trip near San Francisco',
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="w-16 h-16 mb-6 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
        <SparkleIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
        How can I help you today?
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-3xl">
        {promptStarters.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptClick(prompt)}
            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left text-sm"
          >
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              {prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;