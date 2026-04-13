
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StyleProvider } from './context/StyleContext';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <StyleProvider enableAntiFingerprint={true}>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </StyleProvider>
  </React.StrictMode>
);
