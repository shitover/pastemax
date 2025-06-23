import React, { useState, useEffect } from 'react';
import { X, Save, Tag, Plus, Star, Hash, Zap } from 'lucide-react';
import { PromptLibraryEntry, PromptCategory, LlmProvider } from '../types/llmTypes';
import '../styles/modals/QuickSaveModal.css';

interface QuickSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<PromptLibraryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  categories: PromptCategory[];
  availableTags: string[];
  selectedText: string;
  fullResponse: string;
  isSelectedText: boolean;
  modelUsed?: string;
  provider?: LlmProvider;
}

const QuickSaveModal: React.FC<QuickSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  availableTags,
  selectedText,
  fullResponse,
  isSelectedText,
  modelUsed,
  provider,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prompt: '',
    tags: [] as string[],
    category: '',
    isFavorite: false,
    tokenCount: 0,
  });

  const [useFullResponse, setUseFullResponse] = useState(!isSelectedText);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      const contentToUse = useFullResponse ? fullResponse : selectedText;
      setFormData({
        title: '', // Keep title empty by default
        description: '',
        prompt: contentToUse,
        tags: [],
        category: '',
        isFavorite: false,
        tokenCount: Math.ceil(contentToUse.length / 4), // Rough token estimation
      });
    }
  }, [isOpen, selectedText, fullResponse, useFullResponse]);

  // Update prompt when switching between selected/full response
  useEffect(() => {
    const contentToUse = useFullResponse ? fullResponse : selectedText;
    setFormData((prev) => ({
      ...prev,
      prompt: contentToUse,
      // Don't auto-generate title, keep it as user entered
      tokenCount: Math.ceil(contentToUse.length / 4),
    }));
  }, [useFullResponse, selectedText, fullResponse]);

  const generateSuggestedTitle = (content: string): string => {
    const lines = content.split('\n').filter((line) => line.trim());
    const firstLine = lines[0]?.trim() || '';

    // Extract first meaningful sentence or phrase
    if (firstLine.length > 60) {
      return firstLine.substring(0, 57) + '...';
    }

    return firstLine || 'Saved Prompt';
  };

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

  const addSuggestedTags = () => {
    const suggestions = ['AI-generated', 'saved-response'];
    if (modelUsed) suggestions.push(modelUsed);
    if (provider) suggestions.push(provider);

    const newTags = suggestions.filter((tag) => !formData.tags.includes(tag));
    if (newTags.length > 0) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, ...newTags],
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
        tags: formData.tags,
        category: formData.category || undefined,
        isFavorite: formData.isFavorite,
        provider,
        modelUsed,
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
    <div className="quick-save-overlay" onClick={onClose}>
      <div
        className="quick-save-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="quick-save-header">
          <h2>
            <Zap size={24} />
            Quick Save to Library
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form className="quick-save-form" onSubmit={handleSubmit}>
          {/* Content Selection */}
          {isSelectedText && (
            <div className="content-selector">
              <label>Save:</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    checked={!useFullResponse}
                    onChange={() => setUseFullResponse(false)}
                  />
                  Selected text ({selectedText.length} chars)
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    checked={useFullResponse}
                    onChange={() => setUseFullResponse(true)}
                  />
                  Full response ({fullResponse.length} chars)
                </label>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter a title for this prompt"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description or notes"
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className="form-group">
            <label>Content Preview</label>
            <div className="content-preview">
              {formData.prompt.length > 300
                ? `${formData.prompt.substring(0, 300)}...`
                : formData.prompt}
            </div>
          </div>

          {/* Category & Tags Row */}
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
          </div>

          {/* Tags */}
          <div className="form-group">
            <div className="tags-header">
              <label>Tags</label>
              <button type="button" className="auto-tag-btn" onClick={addSuggestedTags}>
                <Tag size={14} />
                Auto-tag
              </button>
            </div>

            <div className="tags-section">
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
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="tag-input-row">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag..."
                />
                <button type="button" onClick={handleAddTag} className="add-tag-btn">
                  <Plus size={16} />
                </button>
              </div>

              {availableTags.length > 0 && (
                <div className="available-tags">
                  {availableTags
                    .filter((tag) => !formData.tags.includes(tag))
                    .slice(0, 8)
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
              )}
            </div>
          </div>

          {/* Favorite & Token Info */}
          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isFavorite}
                onChange={(e) => handleInputChange('isFavorite', e.target.checked)}
              />
              <Star size={16} />
              Mark as favorite
            </label>

            <div className="token-info">
              <Hash size={16} />
              <span>~{formData.tokenCount.toLocaleString()} tokens</span>
            </div>
          </div>

          {/* Actions */}
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
              {isSubmitting ? 'Saving...' : 'Save to Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickSaveModal;
