import { useState, useEffect } from 'react';
import axios from 'axios';

const ManagerClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modale
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Stan nowego klienta
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = () => {
    setLoading(true);
    setError('');
    axios.get('http://localhost:5000/api/clients')
      .then(response => {
        setClients(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Błąd pobierania bazy klientów.');
        setLoading(false);
      });
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    axios.post('http://localhost:5000/api/clients', newClient)
      .then(() => {
        setSuccess(`Klient ${newClient.first_name} ${newClient.last_name} dodany pomyślnie!`);
        setShowAddModal(false);
        setNewClient({
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          notes: ''
        });
        fetchClients();
      })
      .catch(err => {
        setError('Nie udało się dodać klienta. Upewnij się, że dane są poprawne.');
      });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    axios.put(`http://localhost:5000/api/clients/${editingClient.id}`, editingClient)
      .then(() => {
        setSuccess('Dane klienta zostały zaktualizowane.');
        setEditingClient(null);
        fetchClients();
      })
      .catch(err => {
        setError('Nie udało się zaktualizować danych klienta.');
      });
  };

  if (loading) return <p style={{ padding: '2rem 0' }}>Wczytywanie bazy gości...</p>;

  return (
    <div className="manager-clients-container card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Zarządzanie Gośćmi (Klienci)</h3>
        <button onClick={() => setShowAddModal(true)} className="primary-btn">
          Dodaj nowego klienta
        </button>
      </div>

      {success && <div className="success-message" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="staff-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Imię i Nazwisko</th>
              <th>Telefon</th>
              <th>Email</th>
              <th>Notatki</th>
              <th style={{ textAlign: 'right' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td><strong>#{c.id}</strong></td>
                <td>{c.first_name} {c.last_name}</td>
                <td>{c.phone}</td>
                <td>{c.email || <em style={{ color: '#999' }}>brak</em>}</td>
                <td>{c.notes || <em style={{ color: '#999' }}>brak uwag</em>}</td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    onClick={() => setEditingClient(c)} 
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

      {/* MODAL: DODAWANIE KLIENTA */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Dodaj klienta</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Imię</label>
                <input 
                  type="text" 
                  value={newClient.first_name} 
                  onChange={(e) => setNewClient({...newClient, first_name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Nazwisko</label>
                <input 
                  type="text" 
                  value={newClient.last_name} 
                  onChange={(e) => setNewClient({...newClient, last_name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Telefon</label>
                <input 
                  type="text" 
                  value={newClient.phone} 
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={newClient.email} 
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Notatki / Alergie</label>
                <textarea 
                  value={newClient.notes} 
                  onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                  placeholder="np. Alergia na orzechy, preferuje stolik VIP"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="primary-btn">Zapisz klienta</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="outline-btn">Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDYCJA KLIENTA */}
      {editingClient && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edytuj klienta #{editingClient.id}</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Imię</label>
                <input 
                  type="text" 
                  value={editingClient.first_name} 
                  onChange={(e) => setEditingClient({...editingClient, first_name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Nazwisko</label>
                <input 
                  type="text" 
                  value={editingClient.last_name} 
                  onChange={(e) => setEditingClient({...editingClient, last_name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Telefon</label>
                <input 
                  type="text" 
                  value={editingClient.phone} 
                  onChange={(e) => setEditingClient({...editingClient, phone: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={editingClient.email || ''} 
                  onChange={(e) => setEditingClient({...editingClient, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Notatki / Alergie</label>
                <textarea 
                  value={editingClient.notes || ''} 
                  onChange={(e) => setEditingClient({...editingClient, notes: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="primary-btn">Zapisz zmiany</button>
                <button type="button" onClick={() => setEditingClient(null)} className="outline-btn">Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerClients;
