import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
    it('shows the title', () => {
        render(<App />);
        expect(screen.getByText('CareerLink')).toBeInTheDocument();
    });
});
