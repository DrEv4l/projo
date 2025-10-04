// File: src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // CORRECT: Import 'createRoot' API from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// 1. Get the root DOM element
const rootElement = document.getElementById('root');

// 2. Create a root.
const root = ReactDOM.createRoot(rootElement);

// 3. Render the application using the root's render method.
root.render(
  // <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  // </React.StrictMode>
);

reportWebVitals();