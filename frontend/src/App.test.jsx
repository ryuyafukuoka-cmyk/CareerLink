import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
    it('sends a logged-out visitor to the login screen', () => {
        render(<App />);
        expect(screen.getByRole('heading', { level: 1, name: 'ログイン' })).toBeInTheDocument();
    });
});
