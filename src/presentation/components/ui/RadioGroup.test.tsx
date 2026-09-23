import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio } from './Radio';
import { RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  it('names the group with its legend and selects an option by its label', async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup legend="Primo servizio">
        <Radio name="serve" value="us" defaultChecked>
          Nostro
        </Radio>
        <Radio name="serve" value="them">
          Avversario
        </Radio>
      </RadioGroup>,
    );

    const group = screen.getByRole('group', { name: 'Primo servizio' });
    await user.click(screen.getByText('Avversario'));

    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Avversario' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Nostro' })).not.toBeChecked();
  });

  it('keeps a hidden legend for screen readers', () => {
    render(
      <RadioGroup legend="Formato" hideLegend>
        <Radio name="format" value="5">
          Al meglio dei 5
        </Radio>
      </RadioGroup>,
    );

    expect(screen.getByRole('group', { name: 'Formato' })).toBeInTheDocument();
    expect(screen.getByText('Formato')).toHaveClass('sr-only');
  });
});
