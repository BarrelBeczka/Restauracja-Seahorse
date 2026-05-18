import { useState } from 'react';
import axios from 'axios';

const ReservationForm = ({ selectedTable, onReservationSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    guestCount: 1,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTable) {
      setError('Proszę najpierw wybrać stolik na planie sali.');
      return;
    }
    setError('');
    setLoading(true);

    const payload = {
      table_id: selectedTable.id,
      reservation_date: formData.date,
      reservation_time: formData.time,
      guest_count: parseInt(formData.guestCount),
      notes: formData.notes,
      client: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        email: formData.email
      }
    };

    axios.post('http://localhost:5000/api/reservations', payload)
      .then(response => {
        setLoading(false);
        onReservationSuccess(response.data.confirmation_number);
        // Reset formularza
        setFormData({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          date: '',
          time: '',
          guestCount: 1,
          notes: ''
        });
      })
      .catch(err => {
        setLoading(false);
        setError(err.response?.data?.msg || 'Wystąpił błąd podczas składania rezerwacji.');
      });
  };

  return (
    <div className="reservation-form-container">
      <h3>Szczegóły rezerwacji</h3>
      
      {selectedTable ? (
        <div className="selected-table-badge">
          Wybrany stolik: <strong>{selectedTable.label || `Numer ${selectedTable.table_number}`}</strong> (miejsc: {selectedTable.capacity})
        </div>
      ) : (
        <div className="selected-table-badge warning">
          Kliknij wolny stolik na planie sali po lewej stronie.
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Imię *</label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Nazwisko *</label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Telefon *</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Data *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Godzina *</label>
            <input type="time" name="time" value={formData.time} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-group">
          <label>Liczba gości *</label>
          <input 
            type="number" 
            name="guestCount" 
            min="1" 
            max={selectedTable ? selectedTable.capacity : 10} 
            value={formData.guestCount} 
            onChange={handleChange} 
            required 
          />
          {selectedTable && formData.guestCount > selectedTable.capacity && (
            <small style={{color: 'red'}}>Liczba gości przekracza pojemność wybranego stolika!</small>
          )}
        </div>

        <div className="form-group">
          <label>Uwagi</label>
          <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange}></textarea>
        </div>

        <button 
          type="submit" 
          disabled={loading || !selectedTable || (selectedTable && formData.guestCount > selectedTable.capacity)}
          className="submit-btn"
        >
          {loading ? 'Rezerwowanie...' : 'Potwierdź rezerwację'}
        </button>
      </form>
    </div>
  );
};

export default ReservationForm;
