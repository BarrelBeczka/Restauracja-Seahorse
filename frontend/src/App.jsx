import { useState } from 'react';
import FloorPlan from './components/FloorPlan';
import ReservationForm from './components/ReservationForm';
import StaffPanel from './components/StaffPanel';
import './styles/main.scss';

function App() {
  const [view, setView] = useState('client'); // 'client' lub 'staff'
  const [selectedTable, setSelectedTable] = useState(null);
  const [confirmationNumber, setConfirmationNumber] = useState(null);

  const handleReservationSuccess = (confNum) => {
    setConfirmationNumber(confNum);
    setSelectedTable(null);
  };

  const handleReset = () => {
    setConfirmationNumber(null);
    setSelectedTable(null);
  };

  return (
    <div>
      <nav>
        <div className="logo-container" onClick={handleReset} style={{ cursor: 'pointer' }}>
          <img src="/SEAHORSE_logo.png" alt="Seahorse Logo" className="nav-logo" />
        </div>
        <div className="nav-buttons">
          <button 
            onClick={() => setView('client')} 
            className={`nav-btn ${view === 'client' ? 'active' : ''}`}
          >
            REZERWACJA STOLIKA 予約
          </button>
          <button 
            onClick={() => setView('staff')} 
            className={`nav-btn ${view === 'staff' ? 'active' : ''}`}
          >
            PANEL PRACOWNIKA スタッフ
          </button>
        </div>
      </nav>
      
      <div className="container">
        {view === 'client' ? (
          confirmationNumber ? (
            <div className="success-screen card">
              <div className="success-icon">🎉</div>
              <h2>Rezerwacja złożona pomyślnie!</h2>
              <p>Dziękujemy za skorzystanie z naszych usług. Twój unikalny numer potwierdzenia to:</p>
              <div className="confirmation-badge">{confirmationNumber}</div>
              <p style={{color: '#666', marginTop: '1rem'}}>
                Prosimy o zachowanie tego numeru w celu ewentualnej edycji lub anulowania rezerwacji.
              </p>
              <button onClick={handleReset} className="primary-btn" style={{marginTop: '2rem'}}>
                Złóż kolejną rezerwację
              </button>
            </div>
          ) : (
            <div>
              <div className="welcome-text">
                <h2>Witaj w naszym systemie rezerwacji online!</h2>
                <p>Wybierz interesujący Cię stolik bezpośrednio z interaktywnej mapy restauracji, a następnie uzupełnij prosty formularz poniżej.</p>
              </div>
              
              <div className="app-grid">
                <div className="grid-left">
                  <FloorPlan selectedTable={selectedTable} onSelectTable={setSelectedTable} />
                </div>
                <div className="grid-right">
                  <ReservationForm selectedTable={selectedTable} onReservationSuccess={handleReservationSuccess} />
                </div>
              </div>
            </div>
          )
        ) : (
          <StaffPanel />
        )}
      </div>
    </div>
  )
}

export default App;
