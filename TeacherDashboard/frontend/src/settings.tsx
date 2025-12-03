import { useState } from 'react';

// TypeScript Interfaces
interface SettingItemProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  darkMode: boolean;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  darkMode: boolean;
}

// Main Settings Page Component
export default function SettingsPage() {
  // State management for all toggle switches
  const [studentProgress, setStudentProgress] = useState(true);
  const [studentMilestone, setStudentMilestone] = useState(true);
  const [newPuzzle, setNewPuzzle] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showFavoriteMove, setShowFavorite] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-8`}>
      <div className={`max-w-4xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-8`}>
        
        {/* Header with Profile Picture */}
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-5xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Settings
          </h1>
          <div className="w-16 h-16 rounded-full border-4 border-blue-500 overflow-hidden">
            {/* Profile picture goes here - replace src with your image path */}
            <img 
              src="/profile-pic.jpg" 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className={`h-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} mb-8`}></div>

        {/* Notification Preferences Section */}
        <section className="mb-12">
          <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Notification Preference
          </h2>
          
          <SettingItem
            title="Student Progress"
            description="get weekly email on students' progress"
            checked={studentProgress}
            onChange={setStudentProgress}
            darkMode={darkMode}
          />
          
          <SettingItem
            title="Student Milestone"
            description="get notification whenever a student hits a learning milestone"
            checked={studentMilestone}
            onChange={setStudentMilestone}
            darkMode={darkMode}
          />
          
          <SettingItem
            title="New Puzzle"
            description="get notification whenever a new puzzle is released"
            checked={newPuzzle}
            onChange={setNewPuzzle}
            darkMode={darkMode}
          />
        </section>

        {/* Privacy Settings Section */}
        <section className="mb-12">
          <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Privacy Settings
          </h2>
          
          <SettingItem
            title="Show Email"
            description="make email visible to students"
            checked={showEmail}
            onChange={setShowEmail}
            darkMode={darkMode}
          />
          
          <SettingItem
            title="Show Favorite Opening Move"
            description="make your favorite opening move visible to students"
            checked={showFavoriteMove}
            onChange={setShowFavorite}
            darkMode={darkMode}
          />
        </section>

        {/* Appearance Section */}
        <section>
          <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Appearance
          </h2>
          
          <SettingItem
            title="Dark Mode"
            description=""
            checked={darkMode}
            onChange={setDarkMode}
            darkMode={darkMode}
          />
        </section>

      </div>
    </div>
  );
}

// Reusable Setting Item Component
function SettingItem({ title, description, checked, onChange, darkMode }: SettingItemProps) {
  return (
    <div className="flex justify-between items-start mb-6 last:mb-0">
      <div className="flex-1">
        <h3 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        {description && (
          <p className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
        )}
      </div>
      
      <ToggleSwitch 
        checked={checked} 
        onChange={onChange}
        darkMode={darkMode}
      />
    </div>
  );
}

// Reusable Toggle Switch Component
function ToggleSwitch({ checked, onChange, darkMode }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative w-16 h-8 rounded-full transition-colors duration-300 flex-shrink-0 ml-6
        ${checked ? 'bg-green-800' : (darkMode ? 'bg-gray-600' : 'bg-gray-300')}
      `}
      aria-pressed={checked}
    >
      <span
        className={`
          absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300
          ${checked ? 'translate-x-8' : 'translate-x-0'}
        `}
      />
    </button>
  );
}