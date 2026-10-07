/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AUTH_MODE?: 'live' | 'mock';
  readonly VITE_DATA_MODE?: 'api' | 'fixtures';
  readonly VITE_DEV_TOOLS?: string;
  readonly VITE_ROUTER?: 'browser' | 'memory';
}
