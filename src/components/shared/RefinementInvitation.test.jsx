import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RefinementInvitation from './RefinementInvitation';

describe('RefinementInvitation', () => {
  it('renders pencil icon and "Refine this" label', () => {
    render(<RefinementInvitation onClickRefine={() => {}} />);
    const button = screen.getByRole('button', { name: 'Refine this output' });
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('✏️');
    expect(button.textContent).toContain('Refine this');
  });

  it('calls onClickRefine when clicked', () => {
    const handleClick = jest.fn();
    render(<RefinementInvitation onClickRefine={handleClick} />);
    const button = screen.getByRole('button', { name: 'Refine this output' });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('uses default aria-label "Refine this output" when none provided', () => {
    render(<RefinementInvitation onClickRefine={() => {}} />);
    const button = screen.getByLabelText('Refine this output');
    expect(button).toBeTruthy();
  });

  it('accepts a custom aria-label', () => {
    render(<RefinementInvitation onClickRefine={() => {}} ariaLabel="Refine the focus output" />);
    const button = screen.getByLabelText('Refine the focus output');
    expect(button).toBeTruthy();
  });

  it('renders as a button element for accessibility', () => {
    render(<RefinementInvitation onClickRefine={() => {}} />);
    const button = screen.getByRole('button', { name: 'Refine this output' });
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
  });
});
