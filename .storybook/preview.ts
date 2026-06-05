import type { Preview } from '@storybook/react-vite';
import '../src/styles/tailwind.css';
import '../src/styles/layout.scss';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
