
import React, { useEffect, useState } from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

// This regex finds URLs in a string.
const urlRegex = /(https?:\/\/[^\s]+)/g;

/**
 * A component that takes a string and renders it, turning any URLs into clickable links.
 */
const MessageWithLinks: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold break-all">
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`bg-danger-bgLight border-l-4 border-danger-borderLight text-danger-DEFAULT 
                  p-6 rounded-md shadow-md my-8
                  transition-all duration-500 ease-out transform
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
      role="alert"
    >
      <div className="flex">
        <div className="py-1">
          <span className="material-symbols-outlined text-danger-DEFAULT mr-3" style={{ fontSize: '24px' }}>error</span>
        </div>
        <div>
          <p className="font-bold">Error Occurred</p>
          <div className="text-sm">
            <MessageWithLinks text={message} />
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 bg-danger-DEFAULT text-white font-semibold rounded-md px-4 py-2 text-sm hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-danger-bgLight focus:ring-danger-DEFAULT transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
