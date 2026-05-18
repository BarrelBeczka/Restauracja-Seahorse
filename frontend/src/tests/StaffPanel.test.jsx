import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import StaffPanel from '../components/StaffPanel';
import axios from 'axios';

// Mockowanie biblioteki axios do zapytań HTTP
vi.mock('axios');

describe('StaffPanel Component - RBAC & Authentication Tests', () => {
  beforeEach(() => {
    // Czyszczenie localStorage i mocków przed każdym testem
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('powinien wyrenderować formularz logowania, gdy użytkownik nie jest zalogowany', () => {
    render(<StaffPanel />);
    
    expect(screen.getByText('Panel Pracownika')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('np. admin lub kelner')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('np. admin123 lub kelner123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zaloguj się' })).toBeInTheDocument();
  });

  it('powinien wyrenderować panel managera ze wszystkimi 5 zakładkami dla roli manager', async () => {
    // Ustawiamy sesję managera w localStorage
    localStorage.setItem('token', 'mock-manager-token');
    localStorage.setItem('user', JSON.stringify({
      first_name: 'Bartłomiej',
      roles: ['manager']
    }));

    // Mockujemy zapytanie o rezerwacje z useEffect
    axios.get.mockResolvedValue({ data: [] });

    render(<StaffPanel />);

    // Weryfikacja powitania i roli managera (użycie regex do uodpornienia na białe znaki)
    expect(screen.getByText(/Witaj,\s*Bartłomiej/i)).toBeInTheDocument();
    expect(screen.getByText(/rola:\s*manager/i)).toBeInTheDocument();

    // Weryfikacja obecności 5 zakładek nawigacji
    expect(screen.getByRole('button', { name: '📅 Rezerwacje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📊 Analizy i Raporty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🛠️ Projektant Sali' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '👤 Pracownicy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '👥 Baza Gości' })).toBeInTheDocument();
  });

  it('powinien wyrenderować panel kelnera i ukryć zakładki nawigacji dla roli kelner', async () => {
    // Ustawiamy sesję kelnera w localStorage
    localStorage.setItem('token', 'mock-waiter-token');
    localStorage.setItem('user', JSON.stringify({
      first_name: 'Jan',
      roles: ['kelner']
    }));

    axios.get.mockResolvedValue({ data: [] });

    render(<StaffPanel />);

    // Weryfikacja powitania i roli kelnera
    expect(screen.getByText(/Witaj,\s*Jan/i)).toBeInTheDocument();
    expect(screen.getByText(/rola:\s*kelner/i)).toBeInTheDocument();

    // Weryfikacja ukrycia zakładek managera (kelner nie może widzieć raportów, mapy, pracowników itp.)
    expect(screen.queryByRole('button', { name: '📊 Analizy i Raporty' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '🛠️ Projektant Sali' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '👤 Pracownicy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '👥 Baza Gości' })).not.toBeInTheDocument();
  });
});
