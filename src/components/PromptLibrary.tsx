import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Star,
  StarOff,
  Tag,
  Filter,
  Edit2,
  Trash2,
  Copy,
  Play,
  Book,
  Grid,
  List,
  Calendar,
  User,
  Globe,
  ChevronDown,
  ChevronUp,
  Hash,
  Clock,
  Brain,
  Maximize2,
  Minimize2,
  X,
  Expand,
} from 'lucide-react';
import {
  PromptLibraryEntry,
  PromptCategory,
  PromptLibraryFilter,
  PromptLibrarySortOption,
  LlmProvider,
} from '../types/llmTypes';
import '../styles/modals/PromptLibrary.css';

interface PromptLibraryProps {
  entries: PromptLibraryEntry[];
  categories: PromptCategory[];
  onCreateEntry: () => void;
  onEditEntry: (entry: PromptLibraryEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onToggleFavorite: (entryId: string) => void;
  onUsePrompt: (entry: PromptLibraryEntry) => void;
  onCopyPrompt: (entry: PromptLibraryEntry) => void;
  isLoading?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const PromptLibrary: React.FC<PromptLibraryProps> = ({
  entries,
  categories,
  onCreateEntry,
  onEditEntry,
  onDeleteEntry,
  onToggleFavorite,
  onUsePrompt,
  onCopyPrompt,
  isLoading = false,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<PromptLibrarySortOption>({
    field: 'updatedAt',
    order: 'desc',
  });
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider | 'all'>('all');
  const [expandedPrompt, setExpandedPrompt] = useState<PromptLibraryEntry | null>(null);

  // Get all unique tags from entries
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((entry) => {
      entry.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [entries]);

  // Get all unique providers from entries
  const allProviders = useMemo(() => {
    const providers = new Set<LlmProvider>();
    entries.forEach((entry) => {
      if (entry.provider) providers.add(entry.provider);
    });
    return Array.from(providers);
  }, [entries]);

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries.filter((entry) => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          entry.title.toLowerCase().includes(query) ||
          entry.description?.toLowerCase().includes(query) ||
          entry.prompt.toLowerCase().includes(query) ||
          entry.response?.toLowerCase().includes(query) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        const hasSelectedTag = selectedTags.some((tag) => entry.tags.includes(tag));
        if (!hasSelectedTag) return false;
      }

      // Favorites filter
      if (showFavoritesOnly && !entry.isFavorite) {
        return false;
      }

      // Provider filter
      if (selectedProvider !== 'all' && entry.provider !== selectedProvider) {
        return false;
      }

      return true;
    });

    // Sort entries
    filtered.sort((a, b) => {
      const { field, order } = sortOption;
      let aValue: any = a[field];
      let bValue: any = b[field];

      if (field === 'title') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    entries,
    searchQuery,
    selectedCategory,
    selectedTags,
    showFavoritesOnly,
    selectedProvider,
    sortOption,
  ]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedTags([]);
    setShowFavoritesOnly(false);
    setSelectedProvider('all');
  };

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    selectedTags.length +
    (showFavoritesOnly ? 1 : 0) +
    (selectedProvider !== 'all' ? 1 : 0);

  return (
    <div className="prompt-library">
      {/* Header */}
      <div className="prompt-library-header">
        <div className="prompt-library-title">
          <Book className="prompt-library-icon" size={20} />
          <h2>Prompt Library</h2>
          <span className="entry-count">({filteredAndSortedEntries.length})</span>
        </div>

        <div className="prompt-library-actions">
          <button
            className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid size={16} />
          </button>
          <button
            className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={16} />
          </button>

          {onToggleFullscreen && (
            <button
              className="expand-btn"
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          <button className="create-prompt-btn" onClick={onCreateEntry}>
            <Plus size={16} />
            New Prompt
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="prompt-library-controls">
        <div className="search-section">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Search prompts, descriptions, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filters-section">
          <button
            className={`filter-toggle ${isFilterExpanded ? 'active' : ''}`}
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          >
            <Filter size={16} />
            Filters
            {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
            {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {activeFiltersCount > 0 && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {isFilterExpanded && (
        <div className="filters-expanded">
          <div className="filter-row">
            <div className="filter-group">
              <label>Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Provider:</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as LlmProvider | 'all')}
                className="filter-select"
              >
                <option value="all">All Providers</option>
                {allProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={showFavoritesOnly}
                  onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                />
                Favorites only
              </label>
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="filter-row">
              <div className="filter-group tags-filter">
                <label>Tags:</label>
                <div className="tags-list">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      className={`tag-filter ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      <Hash size={12} />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sort Options */}
      <div className="sort-section">
        <label>Sort by:</label>
        <select
          value={`${sortOption.field}-${sortOption.order}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortOption({
              field: field as PromptLibrarySortOption['field'],
              order: order as 'asc' | 'desc',
            });
          }}
          className="sort-select"
        >
          <option value="updatedAt-desc">Recently Updated</option>
          <option value="createdAt-desc">Recently Created</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="tokenCount-desc">Token Count (High to Low)</option>
          <option value="tokenCount-asc">Token Count (Low to High)</option>
        </select>
      </div>

      {/* Content */}
      <div className="prompt-library-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading prompts...</p>
          </div>
        ) : filteredAndSortedEntries.length === 0 ? (
          <div className="empty-state">
            {entries.length === 0 ? (
              <>
                <Book size={48} className="empty-icon" />
                <h3>No prompts yet</h3>
                <p>Create your first prompt to get started with your library</p>
                <button className="create-first-prompt-btn" onClick={onCreateEntry}>
                  <Plus size={16} />
                  Create First Prompt
                </button>
              </>
            ) : (
              <>
                <Search size={48} className="empty-icon" />
                <h3>No prompts found</h3>
                <p>Try adjusting your search or filters</p>
                <button className="clear-filters-btn" onClick={clearFilters}>
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={`prompts-container ${viewMode}`}>
            {filteredAndSortedEntries.map((entry) => (
              <PromptCard
                key={entry.id}
                entry={entry}
                viewMode={viewMode}
                onEdit={() => onEditEntry(entry)}
                onDelete={() => onDeleteEntry(entry.id)}
                onToggleFavorite={() => onToggleFavorite(entry.id)}
                onUse={() => onUsePrompt(entry)}
                onCopy={() => onCopyPrompt(entry)}
                onClick={() => setExpandedPrompt(entry)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Expanded Prompt Modal */}
      {expandedPrompt && (
        <div className="expanded-prompt-overlay" onClick={() => setExpandedPrompt(null)}>
          <div className="expanded-prompt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="expanded-prompt-header">
              <div className="expanded-prompt-title">
                <h2>{expandedPrompt.title}</h2>
                {expandedPrompt.isFavorite && <Star className="favorite-icon" size={16} />}
              </div>
              <button
                className="close-expanded-btn"
                onClick={() => setExpandedPrompt(null)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="expanded-prompt-content">
              {expandedPrompt.description && (
                <div className="expanded-section">
                  <h3>Description</h3>
                  <p>{expandedPrompt.description}</p>
                </div>
              )}

              <div className="expanded-section">
                <h3>Prompt</h3>
                <div className="expanded-prompt-text scrollable">{expandedPrompt.prompt}</div>
              </div>

              {expandedPrompt.response && (
                <div className="expanded-section">
                  <h3>Response</h3>
                  <div className="expanded-response-text scrollable">{expandedPrompt.response}</div>
                </div>
              )}

              <div className="expanded-meta">
                <div className="meta-row">
                  <div className="meta-item">
                    <Clock size={14} />
                    <span>Updated: {formatDate(expandedPrompt.updatedAt)}</span>
                  </div>
                  {expandedPrompt.modelUsed && (
                    <div className="meta-item">
                      <Brain size={14} />
                      <span>Model: {expandedPrompt.modelUsed}</span>
                    </div>
                  )}
                  {expandedPrompt.tokenCount && (
                    <div className="meta-item">
                      <Hash size={14} />
                      <span>{expandedPrompt.tokenCount.toLocaleString()} tokens</span>
                    </div>
                  )}
                </div>

                {expandedPrompt.tags.length > 0 && (
                  <div className="expanded-tags">
                    {expandedPrompt.tags.map((tag) => (
                      <span key={tag} className="tag">
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="expanded-prompt-actions">
              <button
                className="action-btn favorite"
                onClick={() => onToggleFavorite(expandedPrompt.id)}
                title={expandedPrompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {expandedPrompt.isFavorite ? <Star size={16} /> : <StarOff size={16} />}
                {expandedPrompt.isFavorite ? 'Favorited' : 'Add to Favorites'}
              </button>
              <button
                className="action-btn"
                onClick={() => onCopyPrompt(expandedPrompt)}
                title="Copy prompt"
              >
                <Copy size={16} />
                Copy Prompt
              </button>
              <button
                className="action-btn use"
                onClick={() => onUsePrompt(expandedPrompt)}
                title="Use this prompt"
              >
                <Play size={16} />
                Use Prompt
              </button>
              <button
                className="action-btn"
                onClick={() => onEditEntry(expandedPrompt)}
                title="Edit"
              >
                <Edit2 size={16} />
                Edit
              </button>
              <button
                className="action-btn delete"
                onClick={() => onDeleteEntry(expandedPrompt.id)}
                title="Delete"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Separate component for individual prompt cards
interface PromptCardProps {
  entry: PromptLibraryEntry;
  viewMode: 'grid' | 'list';
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onUse: () => void;
  onCopy: () => void;
  onClick: () => void;
  formatDate: (timestamp: number) => string;
}

const PromptCard: React.FC<PromptCardProps> = ({
  entry,
  viewMode,
  onEdit,
  onDelete,
  onToggleFavorite,
  onUse,
  onCopy,
  onClick,
  formatDate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`prompt-card ${viewMode} clickable`} onClick={onClick}>
      <div className="prompt-card-header">
        <div className="prompt-card-title">
          <h3>{entry.title}</h3>
          {entry.isFavorite && <Star className="favorite-icon" size={14} />}
          {entry.isPrivate && <User className="private-icon" size={14} />}
        </div>

        <div className="prompt-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="action-btn favorite"
            onClick={onToggleFavorite}
            title={entry.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {entry.isFavorite ? <Star size={16} /> : <StarOff size={16} />}
          </button>
          <button className="action-btn" onClick={onCopy} title="Copy prompt">
            <Copy size={16} />
          </button>
          <button className="action-btn use" onClick={onUse} title="Use this prompt">
            <Play size={16} />
          </button>
          <button className="action-btn" onClick={onEdit} title="Edit">
            <Edit2 size={16} />
          </button>
          <button className="action-btn delete" onClick={onDelete} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {entry.description && <p className="prompt-card-description">{entry.description}</p>}

      <div className="prompt-card-content">
        <div className="prompt-preview">
          <strong>Prompt:</strong>
          <div className={`prompt-text ${isExpanded ? 'expanded' : ''}`}>{entry.prompt}</div>
          {entry.prompt.length > 200 && (
            <button
              className="expand-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {entry.response && (
          <div className="response-preview">
            <strong>Response:</strong>
            <div className="response-text">
              {entry.response.length > 300
                ? `${entry.response.substring(0, 300)}...`
                : entry.response}
            </div>
          </div>
        )}
      </div>

      <div className="prompt-card-footer">
        <div className="prompt-card-meta">
          <div className="meta-item">
            <Clock size={12} />
            <span>{formatDate(entry.updatedAt)}</span>
          </div>

          {entry.modelUsed && (
            <div className="meta-item">
              <Brain size={12} />
              <span>{entry.modelUsed}</span>
            </div>
          )}

          {entry.tokenCount && (
            <div className="meta-item">
              <Hash size={12} />
              <span>{entry.tokenCount.toLocaleString()} tokens</span>
            </div>
          )}
        </div>

        {entry.tags.length > 0 && (
          <div className="prompt-card-tags">
            {entry.tags.map((tag) => (
              <span key={tag} className="tag">
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptLibrary;
