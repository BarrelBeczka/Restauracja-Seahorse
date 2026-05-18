import { useState, useEffect } from 'react';
import axios from 'axios';

const ManagerReports = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [popularClients, setPopularClients] = useState([]);
  const [tableUsage, setTableUsage] = useState([]);
  const [cancellations, setCancellations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Słownik miesięcy
  const MONTHS = {
    1: 'Styczeń', 2: 'Luty', 3: 'Marzec', 4: 'Kwiecień',
    5: 'Maj', 6: 'Czerwiec', 7: 'Lipiec', 8: 'Sierpień',
    9: 'Wrzesień', 10: 'Październik', 11: 'Listopad', 12: 'Grudzień'
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = () => {
    setLoading(true);
    setError('');

    // Równoległe pobieranie wszystkich raportów z API bazy danych
    Promise.all([
      axios.get('http://localhost:5000/api/reports/monthly'),
      axios.get('http://localhost:5000/api/reports/popular_clients'),
      axios.get('http://localhost:5000/api/reports/table_usage'),
      axios.get('http://localhost:5000/api/reports/cancellations')
    ])
    .then(([monthlyRes, clientsRes, tablesRes, cancelRes]) => {
      setMonthlyData(monthlyRes.data);
      setPopularClients(clientsRes.data);
      setTableUsage(tablesRes.data);
      setCancellations(cancelRes.data);
      setLoading(false);
    })
    .catch(err => {
      setError('Nie udało się pobrać raportów statystycznych.');
      setLoading(false);
    });
  };

  if (loading) return <p style={{ padding: '2rem 0' }}>Wczytywanie analizy i statystyk bazy...</p>;

  // Obliczanie sumarycznych danych
  const totalReservations = Object.values(cancellations).reduce((sum, val) => sum + val, 0);
  const cancelledCount = cancellations['anulowana'] || 0;
  const cancellationRate = totalReservations > 0 ? ((cancelledCount / totalReservations) * 100).toFixed(1) : 0;

  return (
    <div className="manager-reports-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Dashboard Analizy i Raportów (Manager)</h2>
        <button onClick={fetchReports} className="outline-btn">Odśwież dane</button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* Górne widgety z kluczowymi metrykami */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-box">
          <small>Suma wszystkich rezerwacji w bazie</small>
          <h3>{totalReservations}</h3>
        </div>
        <div className="stat-box">
          <small>Rezerwacje zrealizowane (zakończone)</small>
          <h3 style={{ color: '#10b981' }}>{cancellations['zakończona'] || 0}</h3>
        </div>
        <div className="stat-box">
          <small>Rezerwacje anulowane</small>
          <h3 style={{ color: '#ef4444' }}>{cancelledCount}</h3>
        </div>
        <div className="stat-box">
          <small>Wskaźnik anulowań (Cancellation Rate)</small>
          <h3>{cancellationRate}%</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* TOP 10 KLIENCI - SQL JOIN */}
        <div className="card">
          <h3>Najaktywniejsi Klienci (TOP 10)</h3>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Złączenie tabel Client JOIN Reservation z grupowaniem po ID gościa.
          </p>
          <table className="staff-table">
            <thead>
              <tr>
                <th>Pozycja</th>
                <th>Imię i Nazwisko</th>
                <th>Telefon</th>
                <th style={{ textAlign: 'right' }}>Rezerwacje</th>
              </tr>
            </thead>
            <tbody>
              {popularClients.map((client, idx) => (
                <tr key={client.id}>
                  <td><strong>{idx + 1}.</strong></td>
                  <td>{client.name}</td>
                  <td>{client.phone}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#3b82f6' }}>{client.reservations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* OBŁOŻENIE STOLIKÓW - SQL JOIN */}
        <div className="card">
          <h3>Popularność Stolików</h3>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Złączenie tabel Table JOIN Reservation pokazujące obłożenie stolików na sali.
          </p>
          <table className="staff-table">
            <thead>
              <tr>
                <th>Stolik</th>
                <th>Etykieta</th>
                <th style={{ textAlign: 'right' }}>Udane Rezerwacje</th>
              </tr>
            </thead>
            <tbody>
              {tableUsage.map(table => (
                <tr key={table.id}>
                  <td><strong>Stolik #{table.table_number}</strong></td>
                  <td>{table.label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{table.reservations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORIA MIESIĘCZNA - SQL GROUP BY */}
      <div className="card">
        <h3>Wydajność Miesięczna (Rok 2026)</h3>
        <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Grupowanie rezerwacji SQL GROUP BY po roku i miesiącu z sumowaniem liczby obsłużonych gości.
        </p>
        <div className="monthly-chart-placeholder" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '10px', height: '150px', alignItems: 'flex-end', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '1.5rem' }}>
          {monthlyData.map(m => {
            const maxReservations = Math.max(...monthlyData.map(x => x.reservations), 1);
            const heightPct = (m.reservations / maxReservations) * 100;
            return (
              <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>{m.reservations}</div>
                <div style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  background: 'linear-gradient(to top, #3b82f6, #60a5fa)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '10px'
                }} />
                <div style={{ fontSize: '0.75rem', marginTop: '6px', color: '#666' }}>{MONTHS[m.month].substring(0, 3)}</div>
              </div>
            );
          })}
        </div>

        <table className="staff-table">
          <thead>
            <tr>
              <th>Miesiąc</th>
              <th>Liczba Rezerwacji</th>
              <th>Suma Obsłużonych Gości</th>
              <th>Średnia Gości / Rezerwację</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map(m => (
              <tr key={m.month}>
                <td><strong>{MONTHS[m.month]}</strong></td>
                <td>{m.reservations} rezerwacji</td>
                <td>{m.guests} osób</td>
                <td>{m.reservations > 0 ? (m.guests / m.reservations).toFixed(1) : 0} os.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerReports;
