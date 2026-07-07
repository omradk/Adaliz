/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Returns from './pages/Returns';
import CommissionRates from './pages/CommissionRates';

import LivePerformance from './pages/LivePerformance';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="canli" element={<LivePerformance />} />
          <Route path="komisyon-tarifesi" element={<CommissionRates />} />
          <Route path="iadeler" element={<Returns />} />
          <Route path="ayarlar" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
