import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import './index.css';
import App from './App.tsx';
import { ClerkBusinessProvider, DevBusinessProvider } from './context/BusinessContext.tsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#5e6ad2',
            colorBackground: '#0b0c0e',
            colorInputBackground: '#141516',
            colorText: '#f7f8f8',
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
  </StrictMode>
);
