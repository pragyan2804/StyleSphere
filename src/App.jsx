// File: src/App.jsx
import React from 'react';
import MainThing from './MainThing'; // import your current main app component
import './App.css';

function App() {
  return (
    <div className="fixed-screen">
      <MainThing />  {/* Use the imported component */}
    </div>
  );
}

export default App;
