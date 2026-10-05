import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the home page with the main navigation', () => {
    render(<App />);
    expect(screen.getAllByText('Accueil').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stations & Carte').length).toBeGreaterThan(0);
  });
});
