// src/components/ToggleSwitch.tsx
import React from 'react';

interface ToggleSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  labelPosition?: 'left' | 'right';
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  checked,
  onChange,
  className = '',
  labelPosition = 'left',
}) => {
  const textLabel = (
    <label htmlFor={id} className="toggle-switch-text-label">
      {label}
    </label>
  );

  const switchControl = (
    <div className="toggle-switch-control">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="toggle-switch-checkbox"
      />
      <label htmlFor={id} className="toggle-switch-visual"></label>
    </div>
  );

  return (
    <div className={`toggle-switch ${labelPosition === 'right' ? 'label-right' : ''} ${className}`}>
      {labelPosition === 'left' && textLabel}
      {switchControl}
      {labelPosition === 'right' && textLabel}
    </div>
  );
};

export default ToggleSwitch;
