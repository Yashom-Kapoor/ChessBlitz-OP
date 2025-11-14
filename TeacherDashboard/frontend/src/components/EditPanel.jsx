import { FaImage } from "react-icons/fa";

export default function EditPanel() {
  const colors = [
    "#E74C3C", "#E67E22", "#F39C12", "#F1C40F", "#2ECC71",
    "#27AE60", "#16A085", "#3498DB", "#2980B9", "#34495E",
    "#7F8C8D", "#95A5A6", "#C0392B", "#D35400", "#E74C3C",
    "#9B59B6", "#8E44AD", "#5D6D7E", "#4A148C", "#E91E63"
  ];

  return (
    <div className="edit-panel">
      {/* Checkbox and Input */}
      <div className="edit-section">
        <div className="edit-checkbox">
          <input 
            type="checkbox" 
            defaultChecked 
          />
          <label>Classroom Name</label>
        </div>
        <input 
          type="text" 
          placeholder="Enter classroom name"
          className="edit-input"
        />
      </div>

      {/* Background Section */}
      <div className="edit-section">
        <h3 className="edit-section-title">Background</h3>
        
        {/* Color Palette */}
        <div className="color-palette">
          {colors.map((color, index) => (
            <div
              key={index}
              className="color-swatch"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Image/Import Button */}
        <button className="import-button">
          <FaImage />
          Image/Import
        </button>
      </div>
    </div>
  );
}
