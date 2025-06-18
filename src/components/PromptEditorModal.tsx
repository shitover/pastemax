import React, { useState, useEffect } from 'react';
import { X, Save, Tag, Plus, Minus, Star, User, Globe, Hash } from 'lucide-react';
import { PromptLibraryEntry, PromptCategory, LlmProvider } from '../types/llmTypes';
import '../styles/modals/PromptEditorModal.css';

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<PromptLibraryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingEntry?: PromptLibraryEntry | null;
  categories: PromptCategory[];
  availableTags: string[];
  initialPrompt?: string;
  initialResponse?: string;
  initialModelUsed?: string;
  initialProvider?: LlmProvider;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEntry,
  categories,
  availableTags,
  initialPrompt = '',
  initialResponse = '',
  initialModelUsed = '',
  initialProvider,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prompt: '',
    response: '',
    tags: [] as string[],
    category: '',
    isFavorite: false,
    isPrivate: false,
    modelUsed: '',
    provider: undefined as LlmProvider | undefined,
    tokenCount: 0,
  });

  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens or editing entry changes
  useEffect(() => {
    if (editingEntry) {
      setFormData({
        title: editingEntry.title,
        description: editingEntry.description || '',
        prompt: editingEntry.prompt,
        response: editingEntry.response || '',
        tags: [...editingEntry.tags],
        category: editingEntry.category || '',
        isFavorite: editingEntry.isFavorite || false,
        isPrivate: editingEntry.isPrivate || false,
        modelUsed: editingEntry.modelUsed || '',
        provider: editingEntry.provider,
        tokenCount: editingEntry.tokenCount || 0,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        prompt: initialPrompt,
        response: initialResponse,
        tags: [],
        category: '',
        isFavorite: false,
        isPrivate: false,
        modelUsed: initialModelUsed,
        provider: initialProvider,
        tokenCount: 0,
      });
    }
  }, [editingEntry, initialPrompt, initialResponse, initialModelUsed, initialProvider]);

  // Calculate token count when prompt or response changes
  useEffect(() => {
    const calculateTokenCount = async () => {
      if (formData.prompt || formData.response) {
        try {
          const content = `${formData.prompt}\n\n${formData.response}`;
          // Use the same token counting method as the app
          if (window.electron?.countTokens) {
            const count = await window.electron.countTokens(content);
            setFormData((prev) => ({ ...prev, tokenCount: count }));
          } else {
            // Fallback: rough estimation (4 characters per token)
            const roughCount = Math.ceil(content.length / 4);
            setFormData((prev) => ({ ...prev, tokenCount: roughCount }));
          }
        } catch (error) {
          console.error('Error counting tokens:', error);
        }
      }
    };

    calculateTokenCount();
  }, [formData.prompt, formData.response]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagSelect = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.prompt.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        prompt: formData.prompt.trim(),
        response: formData.response.trim() || undefined,
        tags: formData.tags,
        category: formData.category || undefined,
        isFavorite: formData.isFavorite,
        isPrivate: formData.isPrivate,
        modelUsed: formData.modelUsed || undefined,
        provider: formData.provider,
        tokenCount: formData.tokenCount,
      });

      onClose();
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="prompt-editor-overlay" onClick={onClose}>
      <div
        className="prompt-editor-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="prompt-editor-header">
          <h2>{editingEntry ? 'Edit Prompt' : 'New Prompt'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="prompt-editor-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter a descriptive title for your prompt"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description or notes about this prompt"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prompt">Prompt *</label>
                <textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => handleInputChange('prompt', e.target.value)}
                  placeholder="Enter your prompt here..."
                  rows={6}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="response">Response</label>
                <textarea
                  id="response"
                  value={formData.response}
                  onChange={(e) => handleInputChange('response', e.target.value)}
                  placeholder="AI response (if available)"
                  rows={6}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modelUsed">Model Used</label>
                <input
                  type="text"
                  id="modelUsed"
                  value={formData.modelUsed}
                  onChange={(e) => handleInputChange('modelUsed', e.target.value)}
                  placeholder="e.g., gpt-4, claude-3-sonnet"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label>Tags</label>
              <div className="tags-input-section">
                <div className="selected-tags">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="tag selected">
                      <Tag size={12} />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="remove-tag-btn"
                      >
                        <Minus size={12} />
                      </button>
                    </span>
                  ))}

                  {showTagInput ? (
                    <div className="new-tag-input">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          } else if (e.key === 'Escape') {
                            setShowTagInput(false);
                            setNewTag('');
                          }
                        }}
                        placeholder="Type tag name..."
                        autoFocus
                      />
                      <button type="button" onClick={handleAddTag} className="add-tag-btn">
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTagInput(true)}
                      className="add-tag-trigger"
                    >
                      <Plus size={12} />
                      Add Tag
                    </button>
                  )}
                </div>

                {availableTags.length > 0 && (
                  <div className="available-tags">
                    <label>Existing tags:</label>
                    <div className="tag-suggestions">
                      {availableTags
                        .filter((tag) => !formData.tags.includes(tag))
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagSelect(tag)}
                            className="tag suggested"
                          >
                            <Hash size={10} />
                            {tag}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isFavorite}
                  onChange={(e) => handleInputChange('isFavorite', e.target.checked)}
                />
                <Star size={16} />
                Mark as favorite
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                />
                <User size={16} />
                Private (visible only to you)
              </label>
            </div>
          </div>

          {formData.tokenCount > 0 && (
            <div className="form-section">
              <div className="token-info">
                <Hash size={16} />
                <span>Estimated tokens: {formData.tokenCount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={!formData.title.trim() || !formData.prompt.trim() || isSubmitting}
            >
              <Save size={16} />
              {isSubmitting ? 'Saving...' : editingEntry ? 'Update Prompt' : 'Save Prompt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptEditorModal;
