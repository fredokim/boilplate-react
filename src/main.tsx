import 'reflect-metadata';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { dataMode, shouldStartMocks } from '@core/config/dataMode';
import './styles/tailwind.css';
import './styles/layout.scss';

/**
 * Starts MSW only in mock mode, and only in development.
 *
 * The check is `shouldStartMocks` rather than `import.meta.env.DEV` alone,
 * because a dev session pointed at the real server must not have mock handlers
 * installed: one shadowing a real endpoint would be almost impossible to spot,
 * since the response would look right.
 *
 * Importing the module conditionally also keeps MSW out of the production bundle.
 */
async function enableMocks() {
  /**
   * `import.meta.env.DEV` is tested literally, right here, and not only through
   * `shouldStartMocks`.
   *
   * Vite inlines this expression at build time, so a production build sees
   * `if (!false) return;` and drops the dynamic import below along with all of
   * MSW. Relying on a constant imported from another module does not give the
   * bundler that certainty — doing so put a 157 KB gzip MSW chunk into the
   * production bundle, which the bundle budget caught.
   */
  if (!import.meta.env.DEV) return;

  if (!shouldStartMocks) {
    console.info(`[data] mode=${dataMode} — mocks are not installed.`);
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
