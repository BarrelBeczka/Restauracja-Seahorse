import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ManagerTables = () => {
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Stany edycji stolika
  const [editingTable, setEditingTable] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTable, setNewTable] = useState({
    table_number: '',
    capacity: 4,
    shape: 'rectangle',
    pos_x: 150,
    pos_y: 150,
    label: ''
  });

  // Stan przeciągania
  const [draggingTableId, setDraggingTableId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = () => {
    setLoading(true);
    setError('');
    axios.get('http://localhost:5000/api/floor_plans')
      .then(response => {
        setFloorPlans(response.data);
        if (response.data.length > 0) {
          setSelectedPlan(response.data[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Błąd pobierania planów sal.');
        setLoading(false);
      });
  };

  // NATIVE DRAG AND DROP (Mouse events)
  const handleMouseDown = (e, table) => {
    e.preventDefault();
    setDraggingTableId(table.id);
    
    // Obliczamy offset kliknięcia względem lewego górnego rogu stolika
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setDragOffset({
      x: mouseX - table.pos_x,
      y: mouseY - table.pos_y
    });
  };

  const handleMouseMove = (e) => {
    if (!draggingTableId) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Nowa pozycja
    let newX = Math.round(mouseX - dragOffset.x);
    let newY = Math.round(mouseY - dragOffset.y);

    // Ograniczenia obszaru roboczego (canvas 800x600)
    newX = Math.max(0, Math.min(newX, selectedPlan.canvas_width - 80));
    newY = Math.max(0, Math.min(newY, selectedPlan.canvas_height - 80));

    // Aktualizujemy stan lokalnie (dla płynności animacji przeciągania)
    setSelectedPlan(prev => ({
      ...prev,
      tables: prev.tables.map(t => 
        t.id === draggingTableId ? { ...t, pos_x: newX, pos_y: newY } : t
      )
    }));
  };

  const handleMouseUp = () => {
    if (!draggingTableId) return;

    // Znajdujemy stolik i wysyłamy współrzędne na serwer do bazy danych!
    const table = selectedPlan.tables.find(t => t.id === draggingTableId);
    if (table) {
      axios.put(`http://localhost:5000/api/tables/${table.id}`, {
        pos_x: table.pos_x,
        pos_y: table.pos_y
      })
      .then(() => {
        console.log('Pozycja stolika zapisana w bazie.');
      })
      .catch(err => {
        setError('Błąd zapisu pozycji stolika w bazie danych.');
      });
    }

    setDraggingTableId(null);
  };

  // Modyfikacja stolika (formularz edycji)
  const handleEditSubmit = (e) => {
    e.preventDefault();
    setError('');
    axios.put(`http://localhost:5000/api/tables/${editingTable.id}`, editingTable)
      .then(() => {
        setEditingTable(null);
        fetchPlans();
      })
      .catch(err => {
        setError('Nie udało się zapisać zmian stolika.');
      });
  };

  // Usuwanie stolika z sali
  const handleDeleteTable = () => {
    if (!editingTable) return;
    
    if (window.confirm(`Czy na pewno chcesz usunąć stolik #${editingTable.table_number}?`)) {
      setError('');
      axios.delete(`http://localhost:5000/api/tables/${editingTable.id}`)
        .then(() => {
          setEditingTable(null);
          fetchPlans();
        })
        .catch(err => {
          setError(err.response?.data?.msg || 'Nie udało się usunąć stolika.');
        });
    }
  };

  // Dodawanie stolika (formularz wstawiania)
  const handleAddSubmit = (e) => {
    e.preventDefault();
    setError('');
    axios.post('http://localhost:5000/api/tables', {
      ...newTable,
      floor_plan_id: selectedPlan.id
    })
    .then(() => {
      setShowAddForm(false);
      setNewTable({
        table_number: '',
        capacity: 4,
        shape: 'rectangle',
        pos_x: 150,
        pos_y: 150,
        label: ''
      });
      fetchPlans();
    })
    .catch(err => {
      setError('Błąd podczas dodawania nowego stolika.');
    });
  };

  if (loading) return <p style={{ padding: '2rem 0' }}>Wczytywanie edytora sali...</p>;

  return (
    <div className="manager-tables-container card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Projektant Sali i Stolików (Manager)</h3>
        <button onClick={() => setShowAddForm(true)} className="primary-btn">
          Dodaj nowy stolik
        </button>
      </div>

      <p className="tip-box">
        <strong>Wskazówka:</strong> Możesz <strong>przeciągać stoliki myszką</strong>, aby ustawić ich pozycję na sali. Zmiany zostaną automatycznie zapisane. Kliknij stolik dwukrotnie, aby edytować jego parametry (pojemność, kształt, etykietę).
      </p>

      {error && <div className="error-message" style={{ margin: '1rem 0' }}>{error}</div>}

      {/* Rysowanie planszy (Canvas/SVG) */}
      {selectedPlan && (
        <div 
          ref={canvasRef}
          className="floor-plan-canvas-editor"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: 'relative',
            width: `${selectedPlan.canvas_width}px`,
            height: `${selectedPlan.canvas_height}px`,
            background: selectedPlan.background_color || '#f3f4f6',
            border: '2px dashed #ccc',
            borderRadius: '8px',
            overflow: 'hidden',
            margin: '0 auto',
            userSelect: 'none'
          }}
        >
          {/* Dekoracyjne elementy architektoniczne (Kuchnia + Bar, Wejście) */}
          <div className="floor-plan-kitchen-bar">
            <span>KUCHNIA + BAR</span>
          </div>
          
          <div className="floor-plan-entrance-label">WEJŚCIE</div>
          <div className="floor-plan-entrance-door"></div>

          {selectedPlan.tables.map(table => {
            const isCircle = table.shape === 'circle';
            return (
              <div
                key={table.id}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onDoubleClick={() => setEditingTable(table)}
                style={{
                  position: 'absolute',
                  left: `${table.pos_x}px`,
                  top: `${table.pos_y}px`,
                  width: '80px',
                  height: '80px',
                  borderRadius: isCircle ? '50%' : '8px',
                  background: draggingTableId === table.id ? '#60a5fa' : '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: draggingTableId === table.id ? 'grabbing' : 'grab',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  transition: draggingTableId === table.id ? 'none' : 'background 0.2s',
                  zIndex: draggingTableId === table.id ? 100 : 10
                }}
              >
                <strong style={{ fontSize: '1.1rem' }}>#{table.table_number}</strong>
                <small style={{ fontSize: '0.8rem' }}>{table.capacity} os.</small>
                {table.label && <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginTop: '2px' }}>{table.label}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* FORMULARZ MODYFIKACJI STOLIKA (Modal) */}
      {editingTable && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edytuj stolik #{editingTable.table_number}</h3>
            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Pojemność (miejsca)</label>
                <input 
                  type="number" 
                  value={editingTable.capacity} 
                  onChange={(e) => setEditingTable({...editingTable, capacity: parseInt(e.target.value)})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Kształt</label>
                <select 
                  value={editingTable.shape} 
                  onChange={(e) => setEditingTable({...editingTable, shape: e.target.value})}
                >
                  <option value="rectangle">Prostokątny</option>
                  <option value="circle">Okrągły</option>
                </select>
              </div>
              <div className="form-group">
                <label>Etykieta (np. Przy Oknie)</label>
                <input 
                  type="text" 
                  value={editingTable.label || ''} 
                  onChange={(e) => setEditingTable({...editingTable, label: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
                <button type="submit" className="primary-btn">Zapisz</button>
                <button 
                  type="button" 
                  onClick={handleDeleteTable} 
                  className="outline-btn"
                  style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }}
                >
                  Usuń stolik
                </button>
                <button type="button" onClick={() => { setEditingTable(null); setError(''); }} className="outline-btn" style={{ marginLeft: 'auto' }}>Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORMULARZ WSTAWIANIA NOWEGO STOLIKA (Modal) */}
      {showAddForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Dodaj nowy stolik</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Numer stolika</label>
                <input 
                  type="number" 
                  value={newTable.table_number} 
                  onChange={(e) => setNewTable({...newTable, table_number: parseInt(e.target.value)})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Pojemność (miejsca)</label>
                <input 
                  type="number" 
                  value={newTable.capacity} 
                  onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value)})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Kształt</label>
                <select 
                  value={newTable.shape} 
                  onChange={(e) => setNewTable({...newTable, shape: e.target.value})}
                >
                  <option value="rectangle">Prostokątny</option>
                  <option value="circle">Okrągły</option>
                </select>
              </div>
              <div className="form-group">
                <label>Etykieta (np. VIP)</label>
                <input 
                  type="text" 
                  value={newTable.label} 
                  onChange={(e) => setNewTable({...newTable, label: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="primary-btn">Dodaj</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="outline-btn">Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTables;
