import React, { useEffect } from 'react';
import { DEFAULT_TASK_TYPES } from '../types/TaskTypes';

/**
 * Props interface for the UserInstructions component
 * @property {string} instructions - The current instructions text
 * @property {function} setInstructions - Function to update instructions
 * @property {string} selectedTaskType - The ID of the selected task type
 */
interface UserInstructionsProps {
  instructions: string;
  setInstructions: (value: string) => void;
  selectedTaskType: string;
}

/**
 * UserInstructions Component
 *
 * This component provides a text area for users to enter custom instructions
 * that will be appended to the end of the copied content. This is useful for
 * adding context, requirements, or special notes when sharing code snippets.
 *
 * The component now also loads predefined prompts based on the selected task type.
 *
 * @param {string} instructions - Current instructions text value
 * @param {function} setInstructions - State setter function for updating instructions
 * @param {string} selectedTaskType - The ID of the selected task type
 * @returns {JSX.Element} - The rendered component
 */
const UserInstructions = ({
  instructions,
  setInstructions,
  selectedTaskType,
}: UserInstructionsProps): JSX.Element => {
  // Update instructions when task type changes
  useEffect(() => {
    const selectedTask = DEFAULT_TASK_TYPES.find((type) => type.id === selectedTaskType);
    if (selectedTask) {
      setInstructions(selectedTask.prompt);
    }
  }, [selectedTaskType, setInstructions]);

  return (
    <>
      {/* Section header */}
      <div className="content-header">
        <div className="content-title">User Instructions</div>
      </div>

      {/* Instructions input container */}
      <div className="user-instructions-container">
        <div className="user-instructions">
          <textarea
            id="userInstructionsInput"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter your instructions here..."
            rows={10}
            style={{
              width: '100%',
              resize: 'none',
            }}
          />
        </div>
      </div>
    </>
  );
};

export default UserInstructions;
