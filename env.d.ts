/// <reference types="vite/client" />

interface Window {
  novelEngine: {
    getAppInfo: () => Promise<{
      name: string;
      version: string;
      storage: string;
    }>;
  };
}
