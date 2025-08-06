import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard.jsx';
import Deals from './components/Deals.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/">
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/deals" element={<Deals />} />
      <Route path="/opportunities" element={<div>Opportunities Page</div>} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  </BrowserRouter>
);
