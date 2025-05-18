import React from 'react';
import type { Workspace, WorkspaceManagerProps } from '../types/WorkspaceTypes';
import { FolderOpen, X, Trash2, Plus } from 'lucide-react';
import '../styles/index.css';

const WorkspaceManager = ({
  isOpen,
  onClose,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onUpdateWorkspaceFolder,
  selectedFolder,
  workspaces, // Use workspaces from props
}: WorkspaceManagerProps): JSX.Element | null => {
  const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
  const modalRef = React.useRef(null as HTMLDivElement | null);
  const inputRef = React.useRef(null as HTMLInputElement | null);

  React.useEffect(() => {
    if (isOpen) {
      setNewWorkspaceName(''); // Always clear input when modal opens or workspace count changes
      // Focus input after render using requestAnimationFrame for reliability
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (workspaces.length === 0) {
            inputRef.current.select();
          }
        }
      });
    } else {
      setNewWorkspaceName('');
    }
  }, [isOpen, workspaces.length]);

  React.useEffect(() => {
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

  const handleCreateWorkspace = () => {
    console.log('Creating new workspace with name:', newWorkspaceName.trim());
    if (newWorkspaceName.trim()) {
      // Clear the input field first to prevent any race conditions
      setNewWorkspaceName('');

      // Call the parent component's create function
      onCreateWorkspace(newWorkspaceName.trim());
      // App.tsx will handle updating the workspaces list, which will re-render this component
    }
  };

  const handleDeleteWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the workspace selection

    if (window.confirm('Are you sure you want to delete this workspace?')) {
      console.log('Deleting workspace with ID:', id);

      // Call the parent component's delete function
      onDeleteWorkspace(id);

      // Immediately try to focus and select the input after deletion
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateWorkspace();
    }
  };

  const handleSetWorkspaceFolder = (workspaceId: string, e: any) => {
    e.stopPropagation(); // Prevent triggering the workspace selection

    // If we have a selected folder, use it
    if (selectedFolder) {
      onUpdateWorkspaceFolder(workspaceId, selectedFolder);
      // App.tsx will handle updating the workspaces list
    } else {
      // Inform the user they need to select a folder first
      alert('Please select a folder first using the "Select Folder" button.');
    }
  };

  const handleClearWorkspaceFolder = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the workspace selection
    onUpdateWorkspaceFolder(workspaceId, null);
    // App.tsx will handle updating the workspaces list
  };

  if (!isOpen) return null;

  return (
    <div className="workspace-manager-overlay">
      <div className="workspace-manager" ref={modalRef}>
        <div className="workspace-manager-header">
          <h2>Workspace Manager</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="workspace-manager-content">
          <div className="new-workspace-form">
            <input
              ref={inputRef}
              type="text"
              className="new-workspace-input"
              placeholder="New workspace name"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={handleKeyDown}
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
              <div className="no-workspaces">No workspaces yet. Create one to get started.</div>
            ) : (
              <ul>
                {workspaces.map((workspace: Workspace) => (
                  <li
                    key={workspace.id}
                    className={`workspace-item ${workspace.id === currentWorkspace ? 'active' : ''}`}
                    onClick={() => onSelectWorkspace(workspace.id)}
                  >
                    <div className="workspace-info">
                      <div className="workspace-name">{workspace.name}</div>
                      <div className="workspace-path">
                        {workspace.folderPath || 'No folder assigned'}
                      </div>
                    </div>
                    <div className="workspace-actions">
                      <button
                        className="set-folder-button"
                        onClick={(e) => handleSetWorkspaceFolder(workspace.id, e)}
                        title="Set current folder for this workspace"
                      >
                        <FolderOpen size={16} />
                      </button>
                      {workspace.folderPath && (
                        <button
                          className="clear-folder-button"
                          onClick={(e) => handleClearWorkspaceFolder(workspace.id, e)}
                          title="Clear folder assignment"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <button
                        className="delete-workspace-button"
                        onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                        title="Delete this workspace"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
