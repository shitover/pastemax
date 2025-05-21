import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatTarget } from '../types/llmTypes';
import ChatHistorySidebar, { ChatSession } from './ChatHistorySidebar';

interface ChatViewProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  chatTarget?: ChatTarget;
  isLlmConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onCopyResponse: (messageId: string) => void;
  onAcceptAndSave?: (messageId: string) => void; // Only available for file chat target
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  isOpen,
  onClose,
  messages,
  chatTarget,
  isLlmConfigured,
  isLoading,
  error,
  onSendMessage,
  onCopyResponse,
  onAcceptAndSave,
  chatSessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateNewSession,
}) => {
  const [userMessage, setUserMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus the input when the chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userMessage.trim() && !isLoading) {
      onSendMessage(userMessage.trim());
      setUserMessage('');
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Filter sessions based on search query
  const filteredSessions = searchQuery.trim()
    ? chatSessions.filter(
        (session) =>
          session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.messages.some((msg) =>
            msg.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : chatSessions;

  // Don't render if the modal is not open
  if (!isOpen) return null;

  return (
    <div className="chat-view-overlay" onClick={onClose}>
      <div className="chat-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-view-content">
          <ChatHistorySidebar
            sessions={filteredSessions}
            currentSessionId={currentSessionId}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
            onCreateNewSession={onCreateNewSession}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
          />

          <div className="chat-view-main">
            <div className="chat-view-header">
              <h3>
                {chatTarget?.type === 'file' ? (
                  <>Chat about: {chatTarget.fileName || 'File'}</>
                ) : chatTarget?.type === 'selection' ? (
                  <>Chat about selection</>
                ) : (
                  <>AI Chat</>
                )}
              </h3>
              <button className="chat-view-close-button" onClick={onClose} aria-label="Close chat">
                ×
              </button>
            </div>

            {!isLlmConfigured && (
              <div className="chat-view-unconfigured">
                <p>LLM provider not configured. Please configure your LLM settings first.</p>
              </div>
            )}

            <div className="chat-view-messages" ref={chatContainerRef}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${
                    message.role === 'user'
                      ? 'user-message'
                      : message.role === 'assistant'
                        ? 'assistant-message'
                        : 'system-message'
                  }`}
                >
                  <div className="message-header">
                    <span className="message-role">
                      {message.role === 'user'
                        ? 'You'
                        : message.role === 'assistant'
                          ? 'AI'
                          : 'System'}
                    </span>
                    <span className="message-time">{formatTime(message.timestamp)}</span>
                  </div>
                  <div className="message-content">{message.content}</div>

                  {/* Action buttons for assistant messages */}
                  {message.role === 'assistant' && (
                    <div className="message-actions">
                      <button
                        className="copy-button"
                        onClick={() => onCopyResponse(message.id)}
                        title="Copy to clipboard"
                      >
                        Copy
                      </button>

                      {/* Only show Accept & Save button for file targets */}
                      {chatTarget?.type === 'file' && onAcceptAndSave && (
                        <button
                          className="save-button"
                          onClick={() => onAcceptAndSave(message.id)}
                          title="Save to file"
                        >
                          Accept & Save
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="chat-loading">
                  <div className="loading-spinner"></div>
                  <p>AI is thinking...</p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="chat-error">
                  <p>{error}</p>
                </div>
              )}

              {/* Empty div for scrolling to bottom */}
              <div ref={messagesEndRef} />
            </div>

            {/* User input area */}
            <form className="chat-view-input-form" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                className="chat-view-input"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={3}
                disabled={!isLlmConfigured || isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                className="chat-view-send-button"
                disabled={!userMessage.trim() || !isLlmConfigured || isLoading}
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
