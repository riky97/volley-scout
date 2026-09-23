import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('toggles when the label text is tapped, not only the box', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange}>Vittoria con due punti di scarto</Checkbox>);

    await user.click(screen.getByText('Vittoria con due punti di scarto'));

    expect(screen.getByRole('checkbox', { name: 'Vittoria con due punti di scarto' })).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('hands its ref to the native input, as react-hook-form needs', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Checkbox ref={ref}>Libero</Checkbox>);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });
});
