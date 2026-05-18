import { useState, useEffect } from 'react';
import axios from 'axios';

// Importy nowych modułów zarządczych (Manager)
import ManagerTables from './ManagerTables';
import ManagerReports from './ManagerReports';
import ManagerStaff from './ManagerStaff';
import ManagerClients from './ManagerClients';

const StaffPanel = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  
  // Stany logowania
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Nawigacja (Tylko dla Managera)
  const [activeTab, setActiveTab] = useState('reservations');

  // Stany panelu rezerwacji
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reservations, setReservations] = useState([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Edycja rezerwacji (Modal)
  const [editingRes, setEditingRes] = useState(null);

  useEffect(() => {
    if (token) {
      fetchReservations();
    }
  }, [token, selectedDate]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    axios.post('http://localhost:5000/api/auth/login', { username, password })
      .then(response => {
        const { access_token, roles, first_name } = response.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify({ roles, first_name }));
        
        setToken(access_token);
        setUser({ roles, first_name });
        setUsername('');
        setPassword('');
        setActiveTab('reservations'); // resetuj zakładkę
      })
      .catch(err => {
        setLoginError(err.response?.data?.msg || 'Logowanie nieudane. Spróbuj ponownie.');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setReservations([]);
  };

  const fetchReservations = () => {
    setLoadingRes(true);
    axios.get(`http://localhost:5000/api/reservations?date=${selectedDate}`)
      .then(response => {
        setReservations(response.data);
        setLoadingRes(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingRes(false);
      });
  };

  const updateStatus = (resId, newStatus) => {
    setActionError('');
    setActionSuccess('');
    axios.put(`http://localhost:5000/api/reservations/${resId}/status`, { status: newStatus })
      .then(() => {
        setActionSuccess('Status rezerwacji zaktualizowany pomyślnie.');
        fetchReservations();
      })
      .catch(err => {
        setActionError('Nie udało się zmienić statusu rezerwacji.');
      });
  };

  // Zapis zmian edycji rezerwacji (Manager)
  const handleEditResSubmit = (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    axios.put(`http://localhost:5000/api/reservations/${editingRes.id}`, editingRes)
      .then(() => {
        setActionSuccess('Dane rezerwacji zostały pomyślnie zmodyfikowane.');
        setEditingRes(null);
        fetchReservations();
      })
      .catch(err => {
        setActionError(err.response?.data?.msg || 'Nie udało się edytować rezerwacji.');
      });
  };

  // Obliczanie szybkich statystyk na dany dzień
  const totalGuests = reservations
    .filter(r => r.status !== 'anulowana')
    .reduce((sum, r) => sum + r.guest_count, 0);

  // EKRAN LOGOWANIA
  if (!token) {
    return (
      <div className="login-card card">
        <h2>Panel Pracownika</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Zaloguj się, aby zarządzać rezerwacjami.</p>
        
        {loginError && <div className="error-message">{loginError}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Nazwa użytkownika</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="np. admin lub kelner" 
              required 
            />
          </div>
          <div className="form-group">
            <label>Hasło</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="np. admin123 lub kelner123" 
              required 
            />
          </div>
          <button type="submit" className="submit-btn" style={{ marginTop: '1rem' }}>
            Zaloguj się
          </button>
        </form>
      </div>
    );
  }

  const isManager = user.roles?.includes('manager');

  // GŁÓWNY PANEL PRACUJĄCY
  return (
    <div className="staff-panel-container">
      {/* Zintegrowany Nagłówek i Nawigacja (Unified Header) */}
      <div className="staff-header unified">
        <div className="user-info">
          <h2>Witaj, {user.first_name}!</h2>
          <span className="role-badge">rola: {user.roles?.[0] || 'kelner'}</span>
        </div>

        <div className="nav-and-logout">
          {isManager && (
            <div className="manager-navbar-inline">
              <button 
                className={`nav-tab ${activeTab === 'reservations' ? 'active' : ''}`}
                onClick={() => setActiveTab('reservations')}
              >
                Rezerwacje
              </button>
              <button 
                className={`nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                Analizy i Raporty
              </button>
              <button 
                className={`nav-tab ${activeTab === 'tables' ? 'active' : ''}`}
                onClick={() => setActiveTab('tables')}
              >
                Projektant Sali
              </button>
              <button 
                className={`nav-tab ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => setActiveTab('staff')}
              >
                Pracownicy
              </button>
              <button 
                className={`nav-tab ${activeTab === 'clients' ? 'active' : ''}`}
                onClick={() => setActiveTab('clients')}
              >
                Baza Gości
              </button>
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn">Wyloguj się</button>
        </div>
      </div>

      {/* RENDEROWANIE ZAKŁADEK NA PODSTAWIE WYBORU I ROLI */}
      {activeTab === 'reports' && isManager && <ManagerReports />}
      {activeTab === 'tables' && isManager && <ManagerTables />}
      {activeTab === 'staff' && isManager && <ManagerStaff />}
      {activeTab === 'clients' && isManager && <ManagerClients />}

      {/* ZAKŁADKA REZERWACJI (Dostępna dla każdego pracownika) */}
      {activeTab === 'reservations' && (
        <>
          {/* Szybkie Statystyki (Dla Managera w zakładce Rezerwacje) */}
          {isManager && (
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-box">
                <small>Wszystkie rezerwacje (Dziś)</small>
                <h3>{reservations.length}</h3>
              </div>
              <div className="stat-box">
                <small>Oczekiwana liczba gości</small>
                <h3>{totalGuests} os.</h3>
              </div>
              <div className="stat-box">
                <small>Stoliki w użyciu</small>
                <h3>{reservations.filter(r => r.status === 'obecny').length}</h3>
              </div>
            </div>
          )}

          {/* Kontrolki filtrowania */}
          <div className="filter-area card">
            <div className="form-group" style={{ margin: 0, maxWidth: '300px' }}>
              <label>Wybierz dzień</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </div>
            <button onClick={fetchReservations} className="primary-btn" style={{ height: 'fit-content', alignSelf: 'flex-end' }}>
              Odśwież
            </button>
          </div>

          {actionError && <div className="error-message" style={{ marginTop: '1rem' }}>{actionError}</div>}
          {actionSuccess && <div className="success-message" style={{ marginTop: '1rem' }}>{actionSuccess}</div>}

          {/* Lista rezerwacji */}
          <div className="reservations-list-container card" style={{ marginTop: '1.5rem' }}>
            <h3>Rezerwacje na dzień: {selectedDate}</h3>
            
            {loadingRes ? (
              <p style={{ padding: '2rem 0' }}>Pobieranie listy...</p>
            ) : reservations.length === 0 ? (
              <p style={{ padding: '2rem 0', color: '#666' }}>Brak rezerwacji na ten dzień.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Godzina</th>
                      <th>Klient</th>
                      <th>Stolik</th>
                      <th>Goście</th>
                      <th>Status</th>
                      <th>Akcje kelnera</th>
                      {isManager && <th>Edycja (Manager)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map(res => (
                      <tr key={res.id}>
                        <td><strong>{res.confirmation_number}</strong></td>
                        <td>{res.time.substring(0, 5)}</td>
                        <td>{res.client_name}</td>
                        <td>Stolik #{res.table_id}</td>
                        <td>{res.guest_count} os.</td>
                        <td>
                          <span className={`status-pill pill-${res.status}`}>
                            {res.status}
                          </span>
                        </td>
                        <td>
                          {res.status === 'nowa' && (
                            <div className="action-buttons">
                              <button 
                                onClick={() => updateStatus(res.id, 'obecny')} 
                                className="action-btn success"
                              >
                                Goście są
                              </button>
                              <button 
                                onClick={() => updateStatus(res.id, 'anulowana')} 
                                className="action-btn danger"
                              >
                                Anuluj
                              </button>
                            </div>
                          )}
                          {res.status === 'obecny' && (
                            <button 
                              onClick={() => updateStatus(res.id, 'zakończona')} 
                              className="action-btn primary"
                            >
                              Zakończ
                            </button>
                          )}
                          {res.status === 'anulowana' && <span style={{color: '#999', fontSize: '0.9rem'}}>Brak akcji</span>}
                          {res.status === 'zakończona' && <span style={{color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold'}}>Zrealizowano</span>}
                        </td>
                        {isManager && (
                          <td>
                            <button 
                              onClick={() => setEditingRes({
                                ...res,
                                reservation_date: selectedDate,
                                reservation_time: res.time.substring(0, 5)
                              })} 
                              className="action-btn warning"
                            >
                              Opcje
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL: EDYCJA REZERWACJI (Tylko dla Managera) - Wymaganie [42] */}
      {editingRes && isManager && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edycja rezerwacji {editingRes.confirmation_number}</h3>
            <form onSubmit={handleEditResSubmit}>
              <div className="form-group">
                <label>Data</label>
                <input 
                  type="date" 
                  value={editingRes.reservation_date} 
                  onChange={(e) => setEditingRes({...editingRes, reservation_date: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Godzina</label>
                <input 
                  type="time" 
                  value={editingRes.reservation_time} 
                  onChange={(e) => setEditingRes({...editingRes, reservation_time: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Numer Stolika ID</label>
                <input 
                  type="number" 
                  value={editingRes.table_id} 
                  onChange={(e) => setEditingRes({...editingRes, table_id: parseInt(e.target.value)})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Liczba Gości</label>
                <input 
                  type="number" 
                  value={editingRes.guest_count} 
                  onChange={(e) => setEditingRes({...editingRes, guest_count: parseInt(e.target.value)})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={editingRes.status} 
                  onChange={(e) => setEditingRes({...editingRes, status: e.target.value})}
                >
                  <option value="nowa">nowa</option>
                  <option value="obecny">obecny</option>
                  <option value="zakończona">zakończona</option>
                  <option value="anulowana">anulowana</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notatki kelnerskie</label>
                <textarea 
                  value={editingRes.notes || ''} 
                  onChange={(e) => setEditingRes({...editingRes, notes: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="primary-btn">Zapisz rezerwację</button>
                <button type="button" onClick={() => setEditingRes(null)} className="outline-btn">Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPanel;
