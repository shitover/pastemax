import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VariableSizeList, FixedSizeList } from 'react-window';
import { ChatMessage, ChatTarget } from '../types/llmTypes';
import ChatHistorySidebar, { ChatSession } from './ChatHistorySidebar';
import ChatModelSelector from './ChatModelSelector';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../context/ThemeContext';
import { Maximize2, Minimize2, X } from 'lucide-react';
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
  onRetry?: (messageIdToRetry: string) => void;
  onCopyResponse: (messageId: string) => void;
  // onAcceptAndSave?: (messageId: string) => void; // this feature will be implemeted in the future
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
  selectedModelId?: string;
  onModelSelect?: (modelId: string) => void;
  currentLlmRequestId?: string | null;
  onCancelLlmRequest?: (requestId: string) => void;
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
  onRetry,
  onCopyResponse,
  // onAcceptAndSave,
  chatSessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateNewSession,
  selectedModelId,
  onModelSelect,
  currentLlmRequestId,
  onCancelLlmRequest,
}) => {
  const [userMessage, setUserMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // const messagesEndRef = useRef<HTMLDivElement>(null); // Replaced by listRef for virtualization
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null); // To get height for the list
  const listRef = useRef<FixedSizeList>(null); // Ref for FixedSizeList
  const { theme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [expandedFileContexts, setExpandedFileContexts] = useState<Record<string, boolean>>({});
  const [expandedMainMessages, setExpandedMainMessages] = useState<Record<string, boolean>>({});

  // Determine the model ID for the current session, falling back to global if not set in session
  const activeSession = currentSessionId
    ? chatSessions.find((s) => s.id === currentSessionId)
    : undefined;
  const modelIdForThisSession = activeSession?.modelId || selectedModelId; // Use session's model, or global

  const toggleFileContextExpansion = (messageId: string) => {
    setExpandedFileContexts((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const toggleMainMessageExpansion = (messageId: string) => {
    setExpandedMainMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  // Auto-focus the input when the chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setIsMaximized(false);
    }
  }, [isOpen]);

  // Scroll to bottom when messages change or chat view opens
  useEffect(() => {
    if (isOpen && visibleMessages.length > 0 && listRef.current) {
      // Using setTimeout to ensure the list has rendered and dimensions are available
      setTimeout(() => {
        listRef.current?.scrollToItem(visibleMessages.length - 1, 'end');
      }, 0);
    }
  }, [messages, isOpen, visibleMessages.length]); // Rerun when messages change or view opens

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
    code({ inline, className, children, ...rest }: CodeRendererProps) {
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

// Define the Row component for react-window
const Row = React.memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: {
      messages: ChatMessage[];
      theme: string;
      onCopyResponse: (messageId: string) => void;
      onRetry?: (messageIdToRetry: string) => void;
      expandedFileContexts: Record<string, boolean>;
      toggleFileContextExpansion: (messageId: string) => void;
      expandedMainMessages: Record<string, boolean>;
      toggleMainMessageExpansion: (messageId: string) => void;
      formatTime: (timestamp: number) => string;
      commonMarkdownComponents: Options['components'];
      isLoading: boolean; // Added isLoading to data
    };
  }) => {
    const message = data.messages[index];
    if (!message) return null; // Should not happen if itemCount is correct

    return (
      <div style={style} className={`chat-message-wrapper ${message.role}-wrapper`}>
        <div className={`chat-message ${message.role}`}>
          <div className="chat-message-header">
            <span className="chat-message-role">{message.role === 'user' ? 'You' : 'AI'}</span>
            {(message.role === 'user' || message.role === 'assistant') && ' '}
            <span className="chat-message-time">{data.formatTime(message.timestamp)}</span>
          </div>
          <div className="chat-message-content">
            {message.role === 'user' ? (
              <>
                {message.isContentTruncated && !data.expandedMainMessages[message.id] ? (
                  <>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={data.commonMarkdownComponents}
                    >
                      {message.previewDisplayContent || ''}
                    </ReactMarkdown>
                    <button
                      onClick={() => data.toggleMainMessageExpansion(message.id)}
                      className="toggle-context-button"
                    >
                      Show more
                    </button>
                  </>
                ) : (
                  <>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={data.commonMarkdownComponents}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.isContentTruncated && data.expandedMainMessages[message.id] && (
                      <button
                        onClick={() => data.toggleMainMessageExpansion(message.id)}
                        className="toggle-context-button"
                      >
                        Show less
                      </button>
                    )}
                  </>
                )}

                {message.fileContext && (
                  <div className="file-context-display separated-file-context">
                    <p className="file-context-name">
                      Attached File Context: <strong>{message.fileContext.name}</strong>
                    </p>
                    <SyntaxHighlighter
                      key={`${message.id}-filecontext-${data.theme}-${message.fileContext.language}`}
                      style={data.theme === 'dark' ? oneDark : oneLight}
                      language={message.fileContext.language || 'plaintext'}
                      PreTag="div"
                      className="file-content-codeblock"
                      wrapLines={true}
                      lineProps={{
                        style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
                      }}
                    >
                      {message.fileContext.isVeryLong
                        ? data.expandedFileContexts[message.id]
                          ? String(message.fileContext.content)
                          : String(message.fileContext.previewContent)
                        : String(message.fileContext.content)}
                    </SyntaxHighlighter>
                    {message.fileContext.isVeryLong && (
                      <button
                        onClick={() => data.toggleFileContextExpansion(message.id)}
                        className="toggle-context-button"
                      >
                        {data.expandedFileContexts[message.id]
                          ? 'Show less file context'
                          : 'Show more file context'}
                      </button>
                    )}
                  </div>
                )}

                {!message.isContentTruncated &&
                  message.originalUserQuestion &&
                  message.originalUserQuestion !== message.content &&
                  !message.fileContext && (
                    <div className="user-question-display separated-user-question">
                      <p className="user-question-header">Your Original Question:</p>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={data.commonMarkdownComponents}
                      >
                        {message.originalUserQuestion}
                      </ReactMarkdown>
                    </div>
                  )}
              </>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={data.commonMarkdownComponents}>
                {message.content}
              </ReactMarkdown>
            )}
          </div>
          {message.role === 'assistant' && data.onCopyResponse && (
            <div className="message-actions">
              <button
                className="copy-button"
                onClick={() => data.onCopyResponse(message.id)}
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
          )}
          {message.role === 'user' && data.onRetry && (
            <div className="message-actions">
              <button
                className="retry-button"
                onClick={() => data.onRetry && data.onRetry(message.id)}
                disabled={data.isLoading} // Use isLoading from itemData
                title="Retry this prompt"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);
Row.displayName = 'MessageRow';


  // Don't render if the modal is not open
  if (!isOpen) return null;

  const toggleMaximize = () => setIsMaximized(!isMaximized);

  const itemData = {
    messages: visibleMessages,
    theme,
    onCopyResponse,
    onRetry,
    expandedFileContexts,
    toggleFileContextExpansion,
    expandedMainMessages,
    toggleMainMessageExpansion,
    formatTime,
    commonMarkdownComponents,
    isLoading, // Pass isLoading to itemData
  };

  // Estimate item height - this is a placeholder.
  // For FixedSizeList, we use a fixed size. For VariableSizeList, this would be dynamic.
  const getItemHeight = (index: number) => {
    // Basic estimation, can be improved significantly for VariableSizeList
    const message = visibleMessages[index];
    if (!message) return 100; // Default height

    let height = 80; // Base height for role, timestamp, actions
    const lines = message.content.split('\n').length;
    height += lines * 20; // Approx 20px per line of text

    if (message.fileContext) {
      height += 50; // Additional height for file context header
      const fileLines = message.fileContext.isVeryLong && !expandedFileContexts[message.id]
        ? (message.fileContext.previewContent || '').split('\n').length
        : (message.fileContext.content || '').split('\n').length;
      height += fileLines * 18; // Approx 18px per line for code
      if (message.fileContext.isVeryLong) height += 30; // Button height
    }
    if (message.isContentTruncated) height += 30; // Button height

    // Add more for code blocks within main content if possible to detect
    if (message.content.includes('```')) {
        height += 80; // Arbitrary extra for potential code block
    }

    return Math.min(Math.max(height, 100), 600); // Min 100px, Max 600px
  };


  return (
    <div className="chat-view-overlay" onClick={onClose}>
      <div
        className={`chat-view-modal ${isMaximized ? 'chat-view-modal--maximized' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
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
              <div className="chat-view-header-title-area">
                <h3>
                  {chatTarget?.type === 'file' ? (
                    <>Chat about: {chatTarget.fileName || 'File'}</>
                  ) : chatTarget?.type === 'selection' ? (
                    <>Chat about selection</>
                  ) : (
                    <>AI Chat</>
                  )}
                </h3>
                {isLlmConfigured && (
                  <ChatModelSelector
                    currentModelId={modelIdForThisSession}
                    onModelSelect={onModelSelect}
                  />
                )}
              </div>
              <div className="chat-view-header-controls">
                <button
                  onClick={toggleMaximize}
                  className="chat-view-control-button chat-view-maximize-button"
                  aria-label={isMaximized ? 'Minimize chat' : 'Maximize chat'}
                  title={isMaximized ? 'Minimize chat' : 'Maximize chat'}
                >
                  {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  className="chat-view-control-button chat-view-close-button"
                  onClick={onClose}
                  aria-label="Close chat"
                  title="Close chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {!isLlmConfigured && (
              <div className="chat-view-unconfigured">
                <p>LLM provider not configured. Please configure your LLM settings first.</p>
              </div>
            )}

            <div className="chat-view-messages" ref={chatContainerRef}>
              {chatContainerRef.current && visibleMessages.length > 0 && (
                <FixedSizeList
                  ref={listRef}
                  height={chatContainerRef.current.clientHeight}
                  itemCount={visibleMessages.length}
                  itemSize={150} // Using FixedSizeList with an average item size
                  width="100%"
                  itemData={itemData}
                  itemKey={(index, data) => data.messages[index].id}
                >
                  {Row}
                </FixedSizeList>
              )}
              {(!chatContainerRef.current || visibleMessages.length === 0) && !isLoading && !error && (
                <div className="chat-view-empty">
                  {/* Optional: Message for when there are no messages */}
                  {/* <p>No messages yet. Start the conversation!</p> */}
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && currentLlmRequestId === currentSessionId && (
                <div className="chat-message-wrapper assistant-wrapper chat-loading-indicator-container">
                  <div className="chat-message assistant chat-loading-indicator">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Global Error message for the session */}
              {error && !isLoading && (
                <div className="chat-error">
                  <p>{error}</p>
                </div>
              )}
              {/* messagesEndRef is no longer used for scrolling with react-window */}
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
                disabled={!userMessage.trim() || isLoading || !isLlmConfigured}
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
              {isLoading && currentLlmRequestId && onCancelLlmRequest && (
                <button
                  type="button"
                  className="chat-view-stop-button"
                  onClick={() => onCancelLlmRequest(currentLlmRequestId)}
                >
                  Stop
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
