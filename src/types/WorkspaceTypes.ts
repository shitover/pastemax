export interface Workspace {
  id: string;
  name: string;
  folderPath: string | null;
  createdAt: number;
  lastUsed: number;
}

export interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[]; // Added workspaces prop
  currentWorkspace: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onUpdateWorkspaceFolder: (workspaceId: string, folderPath: string | null) => void;
  selectedFolder: string | null;
}
