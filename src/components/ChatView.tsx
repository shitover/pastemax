import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatTarget } from '../types/llmTypes';
import ChatHistorySidebar, { ChatSession } from './ChatHistorySidebar';
import ChatModelSelector from './ChatModelSelector';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../context/ThemeContext';
import '../styles/modals/ChatView.css';
import '../styles/modals/ChatHistorySidebar.css';

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
 // onAcceptAndSave?: (messageId: string) => void; // this feature will be implemeted in the future
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
  selectedModelId?: string;
  onModelSelect?: (modelId: string) => void;
}

// Define this interface for your code renderer props
interface CodeRendererProps {
  node?: any; // Ideally, this would be typed with 'Element' from 'hast'
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any; // For ...rest and other HTML attributes
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
 // onAcceptAndSave,
  chatSessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateNewSession,
  selectedModelId,
  onModelSelect,
}) => {
  const [userMessage, setUserMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // State for expanded messages and truncation limits
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());
  const MAX_CHARS_TRUNCATE = 700;
  const MAX_LINES_TRUNCATE = 15;

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

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

  // Filter out system messages for display
  const visibleMessages = messages.filter((message) => message.role !== 'system');

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

  // Helper function to get displayable message content
  const commonMarkdownComponents: Options['components'] = {
    code({ node, inline, className, children, ...rest }: CodeRendererProps) {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : '';
      const safeClassName = className || '';

      // Ensure children is an array of strings and join, or handle single string child
      let codeString = '';
      if (Array.isArray(children)) {
        codeString = children
          .map((child) => (typeof child === 'string' ? child : String(child)))
          .join('');
      } else if (typeof children === 'string') {
        codeString = children;
      } else if (children !== null && children !== undefined) {
        codeString = String(children);
      }

      return !inline && lang ? (
        <SyntaxHighlighter
          style={theme === 'dark' ? oneDark : oneLight}
          language={lang}
          PreTag="div"
          {...rest}
        >
          {codeString.replace(/\\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={safeClassName} {...rest}>
          {codeString}
        </code>
      );
    },
  };

  const getDisplayableMessageContent = (message: ChatMessage) => {
    const isExpanded = expandedMessageIds.has(message.id);
    const lines = message.content.split('\n');
    const charCount = message.content.length;

    const needsTruncationByChars = charCount > MAX_CHARS_TRUNCATE;
    const needsTruncationByLines = lines.length > MAX_LINES_TRUNCATE;
    const needsTruncation = needsTruncationByChars || needsTruncationByLines;

    if (!needsTruncation || isExpanded) {
      return (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={commonMarkdownComponents}>
            {message.content}
          </ReactMarkdown>
          {needsTruncation && (
            <button
              onClick={() => toggleMessageExpansion(message.id)}
              className="toggle-message-button"
            >
              Show less
            </button>
          )}
        </>
      );
    }

    let truncatedContent = message.content;
    if (needsTruncationByLines && lines.length > MAX_LINES_TRUNCATE) {
      truncatedContent = lines.slice(0, MAX_LINES_TRUNCATE).join('\n');
    }

    if (truncatedContent.length > MAX_CHARS_TRUNCATE) {
      truncatedContent = truncatedContent.substring(0, MAX_CHARS_TRUNCATE);
    }

    // Basic check to avoid cutting in the middle of a code block for the preview
    // This could be made more robust.
    const lastCodeBlockStart = truncatedContent.lastIndexOf('```');
    if (lastCodeBlockStart > -1) {
      const subsequentCodeBlockEnd = truncatedContent.indexOf('```', lastCodeBlockStart + 3);
      if (subsequentCodeBlockEnd === -1) {
        // Unclosed code block in truncated view
        // If the start of an unclosed code block is too close to the end, truncate before it
        if (truncatedContent.length - lastCodeBlockStart < 100) {
          truncatedContent = truncatedContent.substring(0, lastCodeBlockStart);
        }
      }
    }

    return (
      <>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={commonMarkdownComponents}>
          {truncatedContent + '...'}
        </ReactMarkdown>
        <button
          onClick={() => toggleMessageExpansion(message.id)}
          className="toggle-message-button"
        >
          Show more
        </button>
      </>
    );
  };

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
              <div className="chat-view-header-content">
                <h3>
                  {chatTarget?.type === 'file' ? (
                    <>Chat about: {chatTarget.fileName || 'File'}</>
                  ) : chatTarget?.type === 'selection' ? (
                    <>Chat about selection</>
                  ) : (
                    <>AI Chat</>
                  )}
                </h3>
                {isLlmConfigured && onModelSelect && (
                  <ChatModelSelector
                    currentModelId={selectedModelId}
                    onModelSelect={onModelSelect}
                  />
                )}
              </div>
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
              {visibleMessages.map((message, index) => (
                <div
                  key={message.id}
                  ref={index === messages.length - 1 ? messagesEndRef : null}
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
                  <div className="message-content">{getDisplayableMessageContent(message)}</div>

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

                      {/* Only show Accept & Save button for file targets
                      {chatTarget?.type === 'file' && onAcceptAndSave && (
                        <button
                          className="save-button"
                          onClick={() => onAcceptAndSave(message.id)}
                          title="Save to file"
                        >
                          Accept & Save
                        </button>
                      )} */}
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
