// File: src/App.jsx
import React from 'react';
import MainThing from './MainThing'; // import your current main app component
import './App.css';
import { CursorifyProvider } from '@cursorify/react'

function App() {
  return (
    <CursorifyProvider w-full h-full>
      <div className="fixed-screen">
        <MainThing />  {/* Use the imported component */}
      </div>
    </CursorifyProvider>
  );
}

export default App;