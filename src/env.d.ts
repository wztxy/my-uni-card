/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ElectronAPI {
  saveImage: (dataUrl: string, defaultName: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  ssoLogin: (stuNo: string, password: string) => Promise<{ success: boolean; name?: string; cookies?: string[]; error?: string }>;
  fetchCardData: (minDate: string, maxDate: string, stuNo: string, cookies?: string[]) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  openExternal: (url: string) => Promise<void>;
  isElectron: boolean;
  platform: string;
}

interface Window {
  electronAPI?: ElectronAPI;
}
