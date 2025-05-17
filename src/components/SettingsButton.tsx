import React from 'react';
import { Settings } from 'lucide-react';

interface SettingsButtonProps {
  onClick: () => void;
  className?: string;
}

const SettingsButton = ({ onClick, className = '' }: SettingsButtonProps) => {
  return (
    <button
      className={`settings-button ${className}`}
      onClick={onClick}
      aria-label="Open settings"
      title="Settings"
    >
      <Settings size={18} />
    </button>
  );
};

export default SettingsButton;
