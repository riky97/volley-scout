import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createPlayer } from '@domain/index';
import { LiberoRow } from './LiberoRow';

const liberos = [
  createPlayer({ id: 'l1', shirtNumber: 12, name: 'Paolo Neri', shortName: 'Neri', isLibero: true }),
  createPlayer({ id: 'l2', shirtNumber: 15, name: 'Luca Blu', shortName: 'Blu', isLibero: true }),
];

describe('LiberoRow', () => {
  it('renders nothing when there is no libero', () => {
    const { container } = render(
      <LiberoRow liberos={[]} selectedPlayerId={null} onSelectPlayer={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every libero and selects the one tapped', async () => {
    const user = userEvent.setup();
    const onSelectPlayer = vi.fn();
    render(<LiberoRow liberos={liberos} selectedPlayerId="l2" onSelectPlayer={onSelectPlayer} />);

    const row = screen.getByRole('group', { name: 'Libero' });
    const buttons = within(row).getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(within(row).getByRole('button', { name: /15\s*Blu/u })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(row).getByRole('button', { name: /12\s*Neri/u }));
    expect(onSelectPlayer).toHaveBeenCalledWith('l1');
  });
});
