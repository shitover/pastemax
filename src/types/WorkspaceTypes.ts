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
  currentWorkspace: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
}
