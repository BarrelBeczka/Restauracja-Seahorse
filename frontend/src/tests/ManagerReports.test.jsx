import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ManagerReports from '../components/ManagerReports';
import axios from 'axios';

vi.mock('axios');

describe('ManagerReports Component - Analytics Dashboard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('powinien pobrać statystyki z API i wyrenderować kafelki KPI oraz tabele złącz SQL', async () => {
    // Przygotowanie mocków odpowiedzi z 4 endpointów raportowych bazy danych
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/reports/monthly')) {
        return Promise.resolve({
          data: [
            { year: 2026, month: 5, reservations: 15, guests: 45 }
          ]
        });
      }
      if (url.includes('/api/reports/popular_clients')) {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Grzegorz Piotrowski', phone: '799181799', reservations: 7 }
          ]
        });
      }
      if (url.includes('/api/reports/table_usage')) {
        return Promise.resolve({
          data: [
            { table_number: 5, label: 'Bankietowy', reservations: 19 }
          ]
        });
      }
      if (url.includes('/api/reports/cancellations')) {
        return Promise.resolve({
          data: {
            'zakończona': 57,
            'anulowana': 12,
            'nowa': 92
          }
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<ManagerReports />);

    // Czekamy na załadowanie danych z API
    await waitFor(() => {
      expect(screen.getByText('Dashboard Analizy i Raportów (Manager)')).toBeInTheDocument();
    });

    // 1. Weryfikacja poprawności obliczeń KPI w kafelkach
    expect(screen.getByText('161')).toBeInTheDocument();             // Suma (57 + 12 + 92 = 161)
    expect(screen.getByText('57')).toBeInTheDocument();              // Zrealizowane
    expect(screen.getByText('12')).toBeInTheDocument();              // Anulowane
    expect(screen.getByText('7.5%')).toBeInTheDocument();            // Wskaźnik (12 / 161 * 100 = 7.45% -> 7.5%)

    // 2. Weryfikacja danych w tabelach złącz SQL JOIN
    expect(screen.getByText('Grzegorz Piotrowski')).toBeInTheDocument();
    expect(screen.getByText('799181799')).toBeInTheDocument();
    expect(screen.getByText('Bankietowy')).toBeInTheDocument();
    expect(screen.getByText('Stolik #5')).toBeInTheDocument();
  });
});
