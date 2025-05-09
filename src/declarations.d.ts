// Type declarations for external modules
declare module 'react';
declare module 'react-dom/client';
declare module 'react/jsx-runtime';
declare module 'electron';
declare module 'tiktoken';
declare module 'ignore';
declare module 'gpt-3-encoder';

// Allow importing CSS files
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}


interface IElectronAPI {
  checkForUpdates: () => Promise<UpdateCheckResultFromMain>;
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  ipcRenderer: {
    send: (channel: string, data: any) => void;
    on: (channel: string, func: (...args: any[]) => void) => void;
    removeListener: (channel: string, func: (...args: any[]) => void) => void;
    invoke: (channel: string, data: any) => Promise<any>;
  };
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}

// Allow importing various file types
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}
