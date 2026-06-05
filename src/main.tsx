import 'reflect-metadata';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tailwind.css';
import './styles/layout.scss';

async function enableMocks() {
  if (!import.meta.env.DEV) {
    return;
  }

  const { worker } = await import('./test/msw/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
  });
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found.');
}

void enableMocks().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
