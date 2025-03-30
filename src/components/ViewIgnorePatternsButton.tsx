import React from 'react';

interface ViewIgnorePatternsButtonProps {
  onClick: () => void;
  disabled: boolean;
}

/**
 * Button component for viewing ignore patterns
 * Displays a button that triggers the ignore patterns viewer
 * Used in the header section alongside folder selection controls
 * 
 * @component
 * @example
 * ```tsx
 * <ViewIgnorePatternsButton
 *   onClick={handleViewPatterns}
 *   disabled={!hasSelectedFolder}
 * />
 * ```
 */
function ViewIgnorePatternsButton({ 
  onClick, 
  disabled 
}: ViewIgnorePatternsButtonProps) {
  return (
    <button
      onClick={onClick}
      title="View Applied Ignore Rules"
      disabled={disabled}
      className="view-ignores-btn" // Using consistent class naming
    >
      View Ignores
    </button>
  );
}

export default ViewIgnorePatternsButton;