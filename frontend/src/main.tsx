import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { ClerkBusinessProvider, DevBusinessProvider } from './context/BusinessContext.tsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
      {PUBLISHABLE_KEY ? (
        <ClerkProvider
          publishableKey={PUBLISHABLE_KEY}
          afterSignOutUrl="/"
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: '#f4f4f5',
              colorBackground: '#09090b',
              colorInputBackground: '#141416',
              colorText: '#f4f4f5',
            },
          }}
        >
          <ClerkBusinessProvider>
            <App />
          </ClerkBusinessProvider>
        </ClerkProvider>
      ) : (
        <DevBusinessProvider>
          <App />
        </DevBusinessProvider>
      )}
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);

