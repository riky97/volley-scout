import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { describedBy, FormField } from './FormField';
import { Input } from './Input';

describe('FormField', () => {
  it('links the label, and announces the error on the field', () => {
    const error = 'Inserisci il nome della squadra.';
    render(
      <FormField id="home" label="Squadra di casa" required error={error}>
        <Input id="home" aria-invalid aria-describedby={describedBy('home', { error })} />
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: /Squadra di casa/u });
    expect(input).toHaveAccessibleDescription(error);
    expect(input).toBeInvalid();
    expect(screen.getByRole('alert')).toHaveTextContent(error);
  });

  it('describes nothing when there is neither hint nor error', () => {
    expect(describedBy('home', {})).toBeUndefined();
  });
});
