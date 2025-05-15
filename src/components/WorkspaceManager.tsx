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
}: WorkspaceManagerProps): JSX.Element | null => {
  const [workspaces, setWorkspaces] = React.useState([] as Workspace[]);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
  const modalRef = React.useRef(null as HTMLDivElement | null);
  const inputRef = React.useRef(null as HTMLInputElement | null);

  // Load workspaces from localStorage
  const loadWorkspaces = () => {
    try {
      console.log('Loading workspaces from localStorage');
      const storedWorkspaces = localStorage.getItem('pastemax-workspaces');
      if (storedWorkspaces) {
        try {
          const parsed = JSON.parse(storedWorkspaces);
          // Check if parsed is an array and has length
          if (Array.isArray(parsed)) {
            console.log(`Found ${parsed.length} workspaces in localStorage`);
            // Sort only if there are workspaces to sort
            if (parsed.length > 0) {
              setWorkspaces(parsed.sort((a: Workspace, b: Workspace) => b.lastUsed - a.lastUsed));
            } else {
              console.log('Setting empty workspaces array');
              setWorkspaces([]);
            }
          } else {
            console.error('Stored workspaces is not an array:', parsed);
            setWorkspaces([]);
          }
        } catch (parseError) {
          console.error('Failed to parse workspaces from localStorage:', parseError);
          // If JSON parsing fails, reset the localStorage value
          localStorage.setItem('pastemax-workspaces', JSON.stringify([]));
          setWorkspaces([]);
        }
      } else {
        // Handle case when no workspaces exist in localStorage
        console.log('No workspaces found in localStorage, setting empty array');
        localStorage.setItem('pastemax-workspaces', JSON.stringify([]));
        setWorkspaces([]);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
      // Focus input after render
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);

      // Critical check: Force an extra check that our state is consistent with localStorage
      // This is important especially after deleting the last workspace
      setTimeout(() => {
        const storedWorkspaces = localStorage.getItem('pastemax-workspaces');
        if (storedWorkspaces) {
          try {
            const parsed = JSON.parse(storedWorkspaces);
            // Special handling for case where we have an empty array in localStorage
            // but our state might not have updated
            if (Array.isArray(parsed) && parsed.length === 0 && workspaces.length !== 0) {
              console.log(
                'State inconsistency detected: localStorage shows empty array but state has items'
              );
              setWorkspaces([]);
              // Ensure the empty array is correctly saved in localStorage
              localStorage.setItem('pastemax-workspaces', JSON.stringify([]));
            }
          } catch (error) {
            console.error('Error during consistency check:', error);
          }
        }
      }, 200);
    } else {
      setNewWorkspaceName('');
    }
  }, [isOpen, workspaces.length]);

  // Add effect to reload workspaces when props change or component updates
  React.useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
    }
  }, [isOpen, currentWorkspace]); // Reload when current workspace changes

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

      // Force reload the workspaces after a short delay to ensure state is updated
      setTimeout(() => {
        loadWorkspaces();
      }, 100);
    }
  };

  const handleDeleteWorkspace = (id: string, e: any) => {
    e.stopPropagation(); // Prevent triggering the workspace selection

    if (window.confirm('Are you sure you want to delete this workspace?')) {
      console.log('Deleting workspace with ID:', id);

      // Call the parent component's delete function
      onDeleteWorkspace(id);

      // Immediately update our local state to remove the deleted workspace
      setWorkspaces((current: Workspace[]) =>
        current.filter((workspace: Workspace) => workspace.id !== id)
      );

      // Force reload workspaces from localStorage after a short delay
      setTimeout(() => {
        console.log('Reloading workspaces after deletion');
        loadWorkspaces();

        // Force focus on the new workspace input to help with creating a new workspace
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') {
      handleCreateWorkspace();
    }
  };

  const handleSetWorkspaceFolder = (workspaceId: string, e: any) => {
    e.stopPropagation(); // Prevent triggering the workspace selection

    // If we have a selected folder, use it
    if (selectedFolder) {
      onUpdateWorkspaceFolder(workspaceId, selectedFolder);
      loadWorkspaces(); // Reload to update the list
    } else {
      // Inform the user they need to select a folder first
      alert('Please select a folder first using the "Select Folder" button.');
    }
  };

  const handleClearWorkspaceFolder = (workspaceId: string, e: any) => {
    e.stopPropagation(); // Prevent triggering the workspace selection
    onUpdateWorkspaceFolder(workspaceId, null);
    loadWorkspaces(); // Reload to update the list
  };

  if (!isOpen) return null;

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
