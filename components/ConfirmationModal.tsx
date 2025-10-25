
import React from 'react';

interface ConfirmationModalProps {
  /** Whether the modal is currently visible. */
  isOpen: boolean;
  /** Function to call when the modal is closed (e.g., by clicking the overlay or cancel button). */
  onClose: () => void;
  /** Function to call when the user confirms the action. */
  onConfirm: () => void;
  /** The title of the modal dialog. */
  title: string;
  /** The content/body of the modal, typically a description of the action. */
  children: React.ReactNode;
}

/**
 * A reusable modal dialog component for confirming destructive actions,
 * such as deleting a chat session.
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside it
      >
        <h2
          id="confirmation-modal-title"
          className="text-xl font-bold mb-4 text-gray-900 dark:text-white"
        >
          {title}
        </h2>
        <div className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
          {children}
        </div>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline w-24 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline w-24 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
