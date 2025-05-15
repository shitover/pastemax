import React, { useRef, useEffect } from 'react';
import { Workspace, WorkspaceManagerProps } from '../types/WorkspaceTypes';
import { X, Plus, Trash2 } from 'lucide-react';

const WorkspaceManager = ({
  isOpen,
  onClose,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
}: WorkspaceManagerProps): JSX.Element | null => {
  const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);

  // Load workspaces whenever modal opens or when needed
  const loadWorkspaces = () => {
    try {
      const saved = localStorage.getItem('pastemax-workspaces');
      if (saved) {
        const parsed = JSON.parse(saved);
        setWorkspaces(parsed);
      }
    } catch (error) {
      console.error('Error reading workspaces:', error);
    }
  };

  // Load workspaces when modal opens
  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    onCreateWorkspace(newWorkspaceName);
    setNewWorkspaceName('');

    // Reload the workspaces to see the new one
    setTimeout(loadWorkspaces, 10);
  };

  const handleDeleteWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteWorkspace(id);

    // Reload the workspaces to reflect the deletion
    setTimeout(loadWorkspaces, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateWorkspace();
    }
  };

  return (
    <div className="workspace-manager-overlay">
      <div className="workspace-manager" ref={modalRef}>
        <div className="workspace-manager-header">
          <h2>Workspace Manager</h2>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="workspace-manager-content">
          <div className="new-workspace-form">
            <input
              ref={inputRef}
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New workspace name"
              className="new-workspace-input"
            />
            <button
              className="new-workspace-button"
              onClick={handleCreateWorkspace}
              disabled={!newWorkspaceName.trim()}
            >
              <Plus size={16} />
              Create
            </button>
          </div>

          <div className="workspaces-list">
            {workspaces.length === 0 ? (
              <div className="no-workspaces">No workspaces yet. Create your first one!</div>
            ) : (
              <ul>
                {workspaces.map((workspace) => (
                  <li
                    key={workspace.id}
                    className={`workspace-item ${workspace.id === currentWorkspace ? 'active' : ''}`}
                    onClick={() => onSelectWorkspace(workspace.id)}
                  >
                    <div className="workspace-info">
                      <div className="workspace-name">{workspace.name}</div>
                      <div className="workspace-path">
                        {workspace.folderPath || 'No folder selected'}
                      </div>
                    </div>
                    <button
                      className="delete-workspace-button"
                      onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceManager;
