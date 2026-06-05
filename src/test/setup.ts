import 'reflect-metadata';
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './msw/server';

HTMLCanvasElement.prototype.getContext = vi.fn();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation((callback: IntersectionObserverCallback) => ({
    observe: vi.fn(() => callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver)),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })),
});
