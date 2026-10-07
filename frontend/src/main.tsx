import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { SessionProvider } from '@/auth/session';
import App from './App';
// Fonts are bundled with the site (no third-party request). Tamil and Hindi files download only when that text appears.
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/noto-sans-tamil/400.css';
import '@fontsource/noto-sans-devanagari/400.css';
import './styles/index.css';

// VITE_ROUTER=memory keeps navigation inside the page, for hosts that own the URL (an embedded demo).
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Don't retry answers the server gave on purpose (not found, forbidden, validation).
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider>
        <Router>
          <SessionProvider>
            <App />
          </SessionProvider>
        </Router>
      </Tooltip.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
