import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { isLoggedIn, logoutAdmin } from '../services/api';

export function AdminLayout() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">🔧 TukangNDeso</div>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
              📊 Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/workers" className={({ isActive }) => isActive ? 'active' : ''}>
              👷 Tukang
            </NavLink>
          </li>
          <li>
            <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>
              📋 Orders
            </NavLink>
          </li>
          <li>
            <NavLink to="/disputes" className={({ isActive }) => isActive ? 'active' : ''}>
              ⚠️ Disputes
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
              📈 Laporan
            </NavLink>
          </li>
        </ul>
        <div style={{ padding: '16px 24px' }}>
          <button className="btn btn-outline" style={{ width: '100%', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={() => { logoutAdmin(); window.location.href = '/login'; }}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
