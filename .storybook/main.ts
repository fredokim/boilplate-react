import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: (config) => ({
    ...config,
    build: {
      ...config.build,
      chunkSizeWarningLimit: 1500,
    },
  }),
};

export default config;
