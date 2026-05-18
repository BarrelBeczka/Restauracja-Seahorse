import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ManagerTables from '../components/ManagerTables';
import axios from 'axios';

vi.mock('axios');

describe('ManagerTables Component - Interactive Canvas Map Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('powinien załadować plany sali i stoliki oraz wyrenderować mapę z opisami', async () => {
    // Mockujemy odpowiedź API pobierania planów sali i stolików
    axios.get.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Sala Główna',
          polygon_points: [[0,0],[800,0],[800,600],[0,600]],
          canvas_width: 800,
          canvas_height: 600,
          background_color: '#ffffff',
          tables: [
            {
              id: 1,
              table_number: 1,
              capacity: 4,
              shape: 'rectangle',
              pos_x: 100,
              pos_y: 150,
              label: 'Przy Oknie VIP'
            }
          ]
        }
      ]
    });

    render(<ManagerTables />);

    // Czekamy na załadowanie planu sali
    await waitFor(() => {
      expect(screen.getByText('Projektant Sali i Stolików (Manager)')).toBeInTheDocument();
    });

    // Weryfikacja obecności przycisku dodawania stolika (użycie regex, aby pominąć emoji)
    expect(screen.getByRole('button', { name: /Dodaj nowy stolik/i })).toBeInTheDocument();

    // Weryfikacja renderowania stolika i jego właściwości (numer, miejsca, etykieta)
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('4 os.')).toBeInTheDocument();
    expect(screen.getByText('Przy Oknie VIP')).toBeInTheDocument();
  });
});
