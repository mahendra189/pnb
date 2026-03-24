import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SOCPage from './pages/SOCPage';
import HeatmapPage from './pages/HeatmapPage';
import ForecastPage from './pages/ForecastPage';
import DocsPage from './pages/DocsPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  // Simple auth check simulation (could be expanded)
  const isAuthenticated = true; 

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="soc" element={<SOCPage />} />
        <Route path="heatmap" element={<HeatmapPage />} />
        <Route path="forecast" element={<ForecastPage />} />
        <Route path="docs" element={<DocsPage />} />
        
        {/* Placeholder routes for sidebar links */}
        <Route path="assets" element={<PlaceholderPage title="Asset Management" />} />
        <Route path="scan" element={<PlaceholderPage title="Run Scan" />} />
        <Route path="results" element={<PlaceholderPage title="Scan Results" />} />
        <Route path="cbom" element={<PlaceholderPage title="CBOM Records" />} />
        <Route path="risk" element={<PlaceholderPage title="Risk Analysis" />} />
        <Route path="pqc" element={<PlaceholderPage title="PQC Classification" />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="users" element={<PlaceholderPage title="User Management" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
