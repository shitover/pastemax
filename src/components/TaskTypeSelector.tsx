import React, { useState, useRef, useEffect } from 'react';
import { TaskTypeSelectorProps, DEFAULT_TASK_TYPES } from '../types/TaskTypes';

/**
 * TaskTypeSelector Component - Minimal design
 *
 * This component provides a dropdown to select different task types which will
 * automatically load predefined prompts for each type.
 *
 * @param {string} selectedTaskType - The currently selected task type ID
 * @param {function} onTaskTypeChange - Function to call when task type changes
 * @returns {JSX.Element} - The rendered component
 */
const TaskTypeSelector = ({
  selectedTaskType,
  onTaskTypeChange,
}: TaskTypeSelectorProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get the currently selected task type object
  const selectedTask =
    DEFAULT_TASK_TYPES.find((type) => type.id === selectedTaskType) || DEFAULT_TASK_TYPES[0];

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle task type selection
  const handleTaskTypeSelect = (taskTypeId: string) => {
    onTaskTypeChange(taskTypeId);
    setIsOpen(false);
  };

  return (
    <div className="sidebar-task-type" ref={dropdownRef}>
      <div className="sidebar-title">Task Type</div>
      <div className="sidebar-task-type-selected" onClick={() => setIsOpen(!isOpen)}>
        <span className="sidebar-task-type-label">{selectedTask.label}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="sidebar-task-type-dropdown">
          {DEFAULT_TASK_TYPES.map((type) => (
            <div
              key={type.id}
              className={`sidebar-task-type-option ${type.id === selectedTaskType ? 'selected' : ''}`}
              onClick={() => handleTaskTypeSelect(type.id)}
            >
              <div className="sidebar-task-type-option-label">{type.label}</div>
              {type.description && (
                <div className="sidebar-task-type-option-description">{type.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskTypeSelector;
