export interface TaskType {
    id: string;
    label: string;
    description?: string;
    prompt: string;
  }
  
  export interface TaskTypeSelectorProps {
    selectedTaskType: string;
    onTaskTypeChange: (taskTypeId: string) => void;
  }
  
  export const DEFAULT_TASK_TYPES: TaskType[] = [
    {
      id: 'feature',
      label: 'Feature',
      description: 'Implement a new feature',
      prompt: `You are tasked to implement a feature. Instructions are as follows:
  
  Instructions for the output format:
  - Output code without descriptions, unless it is important.
  - Minimize prose, comments and empty lines.
  - Only show the relevant code that needs to be modified. Use comments to represent the parts that are not modified.
  - Make it easy to copy and paste.
  - Consider other possibilities to achieve the result, do not be limited by the prompt.`,
    },
    {
      id: 'fix',
      label: 'Fix',
      description: 'Fix a bug or issue',
      prompt: `You are tasked to fix an issue. Instructions are as follows:
  
  Instructions for the output format:
  - Output code without descriptions, unless it is important.
  - Minimize prose, comments and empty lines.
  - Only show the relevant code that needs to be modified. Use comments to represent the parts that are not modified.
  - Make it easy to copy and paste.
  - Consider other possibilities to achieve the result, do not be limited by the prompt.`,
    },
    {
      id: 'question',
      label: 'Question',
      description: 'Ask a question about the codebase',
      prompt: `You are tasked to answer a question. :
      Instructions for the output format:
  - Output code without descriptions, unless it is important.
  - Minimize prose, comments and empty lines.
  - Only show the relevant code that needs to be modified. Use comments to represent the parts that are not modified.
  - Make it easy to copy and paste.
  - Consider other possibilities to achieve the result, do not be limited by the prompt.`,
    },
    {
      id: 'refactor',
      label: 'Refactor',
      description: 'Improve existing code without changing functionality',
      prompt: `You are tasked to refactor code. Instructions are as follows:
  
  Instructions for the output format:
  - Output code without descriptions, unless it is important.
  - Minimize prose, comments and empty lines.
  - Only show the relevant code that needs to be modified. Use comments to represent the parts that are not modified.
  - Make it easy to copy and paste.
  - Consider other possibilities to achieve the result, do not be limited by the prompt.`,
    },
    {
      id: 'analyze',
      label: 'Analyze',
      description: 'Analyze code architecture or patterns',
      prompt: `You are tasked to analyze code. Instructions are as follows:
  Instructions for the output format:
  - Output code without descriptions, unless it is important.
  - Minimize prose, comments and empty lines.
  - Only show the relevant code that needs to be modified. Use comments to represent the parts that are not modified.
  - Make it easy to copy and paste.
  - Consider other possibilities to achieve the result, do not be limited by the prompt.`,
    },
  ];
  
  export const STORAGE_KEY_TASK_TYPE = 'pastemax-selected-task-type';
  