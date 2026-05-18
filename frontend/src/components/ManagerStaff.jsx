import { useState, useEffect } from 'react';
import axios from 'axios';

const ManagerStaff = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modale
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Stan nowego użytkownika
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    roles: ['kelner']
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    setError('');
    axios.get('http://localhost:5000/api/users')
      .then(response => {
        setUsers(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Błąd pobierania listy pracowników.');
        setLoading(false);
      });
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    axios.post('http://localhost:5000/api/users', newUser)
      .then(() => {
        setSuccess(`Pracownik ${newUser.username} został dodany pomyślnie!`);
        setShowAddModal(false);
        setNewUser({
          username: '',
          password: '',
          first_name: '',
          last_name: '',
          email: '',
          roles: ['kelner']
        });
        fetchUsers();
      })
      .catch(err => {
        setError(err.response?.data?.msg || 'Nie udało się dodać pracownika.');
      });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Wysyłamy tylko niepuste hasło, jeśli było edytowane
    const updateData = { ...editingUser };
    if (!updateData.password) {
      delete updateData.password;
    }

    axios.put(`http://localhost:5000/api/users/${editingUser.id}`, updateData)
      .then(() => {
        setSuccess('Dane pracownika zostały zaktualizowane.');
        setEditingUser(null);
        fetchUsers();
      })
      .catch(err => {
        setError(err.response?.data?.msg || 'Błąd zapisu danych pracownika.');
      });
  };

  if (loading) return <p style={{ padding: '2rem 0' }}>Wczytywanie listy pracowników...</p>;

  return (
    <div className="manager-staff-container card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Zarządzanie Pracownikami</h3>
        <button onClick={() => setShowAddModal(true)} className="primary-btn">
          Dodaj pracownika
        </button>
      </div>

      {success && <div className="success-message" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="staff-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Login</th>
              <th>Imię i Nazwisko</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><strong>#{u.id}</strong></td>
                <td>{u.username}</td>
                <td>{u.first_name} {u.last_name}</td>
                <td>{u.email || <em style={{ color: '#999' }}>brak</em>}</td>
                <td>
                  {u.roles.map(role => (
                    <span key={role} className="role-badge" style={{ marginRight: '4px' }}>
                      {role}
                    </span>
                  ))}
                </td>
                <td>
                  <span className={`status-pill pill-${u.is_active ? 'obecny' : 'anulowana'}`}>
                    {u.is_active ? 'aktywny' : 'nieaktywny'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    onClick={() => setEditingUser({ ...u, password: '' })} 
                    className="action-btn primary"
                  >
                    Edytuj
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: DODAWANIE PRACOWNIKA */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Nowy pracownik</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Login (username)</label>
                <input 
                  type="text" 
                  value={newUser.username} 
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Hasło</label>
                <input 
                  type="password" 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Imię</label>
                <input 
                  type="text" 
                  value={newUser.first_name} 
                  onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Nazwisko</label>
                <input 
                  type="text" 
                  value={newUser.last_name} 
                  onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Rola systemowa</label>
                <select 
                  value={newUser.roles[0]} 
                  onChange={(e) => setNewUser({...newUser, roles: [e.target.value]})}
                >
                  <option value="kelner">Kelner</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="primary-btn">Utwórz konto</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="outline-btn">Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDYCJA PRACOWNIKA */}
      {editingUser && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edycja pracownika: {editingUser.username}</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Imię</label>
                <input 
                  type="text" 
                  value={editingUser.first_name} 
                  onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Nazwisko</label>
                <input 
                  type="text" 
                  value={editingUser.last_name} 
                  onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={editingUser.email || ''} 
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Nowe Hasło (zostaw puste, jeśli bez zmian)</label>
                <input 
                  type="password" 
                  value={editingUser.password} 
                  placeholder="Zostaw puste aby nie zmieniać"
                  onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Rola systemowa</label>
                <select 
                  value={editingUser.roles[0] || 'kelner'} 
                  onChange={(e) => setEditingUser({...editingUser, roles: [e.target.value]})}
                >
                  <option value="kelner">Kelner</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <input 
                  type="checkbox" 
                  id="user_active_chk"
                  checked={editingUser.is_active} 
                  onChange={(e) => setEditingUser({...editingUser, is_active: e.target.checked})}
                />
                <label htmlFor="user_active_chk" style={{ margin: 0, cursor: 'pointer' }}>Konto jest aktywne</label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="primary-btn">Zapisz zmiany</button>
                <button type="button" onClick={() => setEditingUser(null)} className="outline-btn">Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerStaff;
