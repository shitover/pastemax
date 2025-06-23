import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, ChatTarget } from '../types/llmTypes';
import ChatHistorySidebar, { ChatSession } from './ChatHistorySidebar';
import ChatModelSelector from './ChatModelSelector';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../context/ThemeContext';
import { Maximize2, Minimize2, X, MessageSquare, Book, Save, BookOpen } from 'lucide-react';
import QuickSaveModal from './QuickSaveModal';
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
  onCancelLlmRequest?: () => void;
  // Prompt Library props
  promptCategories?: any[];
  availablePromptTags?: string[];
  onSaveToPromptLibrary?: (entry: any) => void;
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
  onCancelLlmRequest,
  promptCategories = [],
  availablePromptTags = [],
  onSaveToPromptLibrary,
}) => {
  const [userMessage, setUserMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [expandedFileContexts, setExpandedFileContexts] = useState<Record<string, boolean>>({});
  const [expandedMainMessages, setExpandedMainMessages] = useState<Record<string, boolean>>({});

  // Quick Save Modal state
  const [isQuickSaveOpen, setIsQuickSaveOpen] = useState(false);
  const [saveData, setSaveData] = useState({
    selectedText: '',
    fullResponse: '',
    messageId: '',
    isSelectedText: false,
    modelUsed: '',
    provider: undefined as any,
  });

  // Track selected text per message
  const [messageSelections, setMessageSelections] = useState<Record<string, string>>({});

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

  // Handle text selection in messages
  const handleTextSelection = (messageId: string) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';

    setMessageSelections((prev) => ({
      ...prev,
      [messageId]: selectedText,
    }));
  };

  // Quick Save handlers
  const handleSaveSelected = (messageId: string) => {
    // Get stored selection for this message or current selection
    let selectedText = messageSelections[messageId] || '';

    if (!selectedText) {
      // Try to get current selection
      const selection = window.getSelection();
      selectedText = selection?.toString().trim() || '';
    }

    if (!selectedText) {
      // If still no text selected, show a helpful message
      alert(
        '📝 To save selected text:\n\n1. Highlight some text from the AI response\n2. Then click "Save Selected"\n\nOr use "Save All" to save the entire response.'
      );
      return;
    }

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    setSaveData({
      selectedText,
      fullResponse: message.content,
      messageId,
      isSelectedText: true,
      modelUsed: modelIdForThisSession || '',
      provider: undefined, // Could be enhanced to track provider per message
    });
    setIsQuickSaveOpen(true);
  };

  const handleSaveFullResponse = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    setSaveData({
      selectedText: '',
      fullResponse: message.content,
      messageId,
      isSelectedText: false,
      modelUsed: modelIdForThisSession || '',
      provider: undefined, // Could be enhanced to track provider per message
    });
    setIsQuickSaveOpen(true);
  };

  const handleQuickSaveComplete = async (entryData: any) => {
    if (onSaveToPromptLibrary) {
      await onSaveToPromptLibrary(entryData);
    }
    setIsQuickSaveOpen(false);
  };

  const handleQuickSaveClose = () => {
    setIsQuickSaveOpen(false);
    // Clear selection
    window.getSelection()?.removeAllRanges();
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

  // Don't render if the modal is not open
  if (!isOpen) return null;

  const toggleMaximize = () => setIsMaximized(!isMaximized);

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

            <>
              <div className="chat-view-messages" ref={chatContainerRef}>
                {visibleMessages.map((message, index) => (
                  <div
                    key={message.id}
                    ref={index === messages.length - 1 ? messagesEndRef : null}
                    className={`chat-message-wrapper ${message.role}-wrapper`}
                  >
                    <div className={`chat-message ${message.role}`}>
                      <div className="chat-message-header">
                        <span className="chat-message-role">
                          {message.role === 'user' ? 'You' : 'AI'}
                        </span>
                        {(message.role === 'user' || message.role === 'assistant') && ' '}
                        {/* Only show timestamp when not loading or when message has content */}
                        {(!message.isLoading || message.content.trim()) && (
                          <span className="chat-message-time">{formatTime(message.timestamp)}</span>
                        )}
                      </div>
                      <div className="chat-message-content">
                        {message.role === 'user' ? (
                          <>
                            {message.isContentTruncated && !expandedMainMessages[message.id] ? (
                              <>
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={commonMarkdownComponents}
                                >
                                  {message.previewDisplayContent || ''}
                                </ReactMarkdown>
                                <button
                                  onClick={() => toggleMainMessageExpansion(message.id)}
                                  className="toggle-context-button"
                                >
                                  Show more
                                </button>
                              </>
                            ) : (
                              <>
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={commonMarkdownComponents}
                                >
                                  {message.content}
                                </ReactMarkdown>
                                {message.isContentTruncated && (
                                  <button
                                    onClick={() => toggleMainMessageExpansion(message.id)}
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
                                  key={`${message.id}-filecontext-${theme}-${message.fileContext.language}`}
                                  style={theme === 'dark' ? oneDark : oneLight}
                                  language={message.fileContext.language || 'plaintext'}
                                  PreTag="div"
                                  className="file-content-codeblock"
                                  wrapLines={true}
                                  lineProps={{
                                    style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
                                  }}
                                >
                                  {
                                    message.fileContext.isVeryLong
                                      ? expandedFileContexts[message.id]
                                        ? String(message.fileContext.content) // Show full content if expanded
                                        : String(message.fileContext.previewContent) // Show preview if very long and not expanded
                                      : String(message.fileContext.content) // Show full content if not very long
                                  }
                                </SyntaxHighlighter>
                                {message.fileContext.isVeryLong && (
                                  <button
                                    onClick={() => toggleFileContextExpansion(message.id)}
                                    className="toggle-context-button"
                                  >
                                    {expandedFileContexts[message.id]
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
                                    components={commonMarkdownComponents}
                                  >
                                    {message.originalUserQuestion}
                                  </ReactMarkdown>
                                </div>
                              )}
                          </>
                        ) : (
                          <>
                            {message.isLoading && !message.content.trim() ? (
                              <div className="chat-loading-indicator">
                                <div className="typing-dots">
                                  <span></span>
                                  <span></span>
                                  <span></span>
                                </div>
                              </div>
                            ) : message.isLoading && message.content.trim() ? (
                              <div className="streaming-content">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={commonMarkdownComponents}
                                >
                                  {message.content}
                                </ReactMarkdown>
                                <div className="streaming-indicator">
                                  <span className="streaming-cursor">|</span>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="assistant-message-content"
                                onMouseUp={() => handleTextSelection(message.id)}
                                onKeyUp={() => handleTextSelection(message.id)}
                              >
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={commonMarkdownComponents}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {/* Only show action buttons for completed assistant messages */}
                      {message.role === 'assistant' &&
                        !message.isLoading &&
                        message.content.trim() && (
                          <div className="message-actions">
                            {onCopyResponse && (
                              <button
                                className="copy-button"
                                onClick={() => onCopyResponse(message.id)}
                                title="Copy to clipboard"
                              >
                                Copy
                              </button>
                            )}
                            {onSaveToPromptLibrary && (
                              <>
                                <button
                                  className="save-selected-button"
                                  onClick={() => handleSaveSelected(message.id)}
                                  title="Save selection or full response to prompt library"
                                >
                                  <BookOpen size={14} />
                                  Save Selected
                                </button>
                                <button
                                  className="save-full-button"
                                  onClick={() => handleSaveFullResponse(message.id)}
                                  title="Save full response to prompt library"
                                >
                                  <Save size={14} />
                                  Save All
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      {message.role === 'user' && onRetry && (
                        <div className="message-actions">
                          <button
                            className="retry-button"
                            onClick={() => onRetry(message.id)}
                            disabled={isLoading}
                            title="Retry this prompt"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Global Error message for the session (e.g., config errors, not per-message retry) */}
                {error && !isLoading && (
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
                  disabled={!userMessage.trim() || isLoading || !isLlmConfigured}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
                {isLoading && onCancelLlmRequest && (
                  <button
                    type="button"
                    className="chat-view-stop-button"
                    onClick={() => onCancelLlmRequest()}
                  >
                    Stop
                  </button>
                )}
              </form>
            </>
          </div>
        </div>
      </div>

      {/* Quick Save Modal */}
      <QuickSaveModal
        isOpen={isQuickSaveOpen}
        onClose={handleQuickSaveClose}
        onSave={handleQuickSaveComplete}
        categories={promptCategories}
        availableTags={availablePromptTags}
        selectedText={saveData.selectedText}
        fullResponse={saveData.fullResponse}
        isSelectedText={saveData.isSelectedText}
        modelUsed={saveData.modelUsed}
        provider={saveData.provider}
      />
    </div>
  );
};

export default ChatView;
