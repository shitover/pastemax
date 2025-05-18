// src/components/base/ToggleSwitch.tsx
import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  className = '',
  disabled = false,
}) => {
  return (
    <label htmlFor={id} className={`toggle-switch ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="toggle-switch-checkbox"
        disabled={disabled}
      />
      <span className="toggle-switch-slider"></span>
    </label>
  );
};

export default ToggleSwitch;
