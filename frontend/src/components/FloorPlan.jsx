import { useEffect, useState } from 'react';
import axios from 'axios';

const FloorPlan = ({ selectedTable, onSelectTable }) => {
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/api/floor_plans')
      .then(response => {
        setFloorPlans(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Błąd pobierania planów:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Ładowanie układu sali...</p>;
  if (floorPlans.length === 0) return <p>Brak dostępnych planów sali.</p>;

  const plan = floorPlans[0];

  return (
    <div className="floor-plan-container">
      <h2>{plan.name}</h2>
      <p style={{marginBottom: '1rem', color: '#666'}}>
        Kliknij na stolik, aby wybrać go do rezerwacji.
      </p>
      
      <div 
        className="canvas-area"
        style={{ 
          width: `${plan.canvas_width}px`, 
          height: `${plan.canvas_height}px`,
          backgroundColor: plan.background_color || '#f3f4f6'
        }}
      >
        {/* Dekoracyjne elementy architektoniczne (Kuchnia + Bar, Wejście) */}
        <div className="floor-plan-kitchen-bar">
          <span>KUCHNIA + BAR</span>
        </div>
        
        <div className="floor-plan-entrance-label">WEJŚCIE</div>
        <div className="floor-plan-entrance-door"></div>

        {plan.tables.map(table => {
          const baseSize = 50;
          const size = baseSize + (table.capacity * 8); 
          const isSelected = selectedTable && selectedTable.id === table.id;
          
          return (
            <div
              key={table.id}
              className={`table-element table-${table.shape} ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${table.pos_x}px`,
                top: `${table.pos_y}px`,
                width: table.shape === 'circle' ? `${size}px` : `${size * 1.35}px`,
                height: `${size}px`
              }}
              onClick={() => onSelectTable(table)}
              title={`Stolik ${table.label || table.table_number} (Pojemność: ${table.capacity} os.)`}
            >
              {table.label || table.table_number}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FloorPlan;
