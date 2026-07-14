import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../pages/Login';

// Mock the API calls
vi.mock('../services/authService', () => ({
  login: vi.fn(() => Promise.resolve({ success: true, token: 'mock-token', user: { username: 'testuser' } }))
}));

describe('Login Component', () => {
  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('shows validation error for empty fields', async () => {
    render(<Login />);
    
    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/identifier is required/i)).toBeInTheDocument();
    });
  });

  it('submits login form with valid data', async () => {
    render(<Login />);
    
    const identifierInput = screen.getByPlaceholderText(/email or username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(identifierInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
