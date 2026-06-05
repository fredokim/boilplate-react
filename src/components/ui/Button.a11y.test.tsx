import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button accessibility', () => {
  it('has no basic accessibility violations', async () => {
    const { container } = render(<Button>Save</Button>);
    const result = await axe(container);

    expect(result.violations).toHaveLength(0);
  });
});
