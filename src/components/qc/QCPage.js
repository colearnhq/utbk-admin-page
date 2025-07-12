import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import QCDashboard from './QCDashboard';
import QCReviewTab from './QCReviewTab';
import '../../styles/pages/data-entry.css';
import '../../styles/pages/qc-data.css';

const QCPage = () => {
  const { userData, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <QCDashboard />;
      case 'new-questions':
        return <QCReviewTab status="pending_review" title="New Questions" />;
      case 'not-revised':
        return <QCReviewTab status="revision_requested" title="Not Revised" />;
      case 'revised':
        return <QCReviewTab status="under_review" title="Revised Questions" />;
      case 'approved':
        return <QCReviewTab status="approved" title="Approved Questions" />;
      default:
        return <QCDashboard />;
    }
  };

  return (
    <div className="data-entry-layout">
      <header className="app-header">
        <div className="header-left">
          <h1>UTBK Questions Admin</h1>
          <span className="role-badge">QC Data</span>
          {userData && userData.role === 'administrator' && (
            <Link to="/admin" className="btn btn-secondary back-button">
              Back to Admin Dashboard
            </Link>
          )}
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{userData.name}</span>
            <span className="user-email">{userData.email}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'new-questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-questions')}
        >
          🆕 New Questions
        </button>
        <button
          className={`tab-btn ${activeTab === 'not-revised' ? 'active' : ''}`}
          onClick={() => setActiveTab('not-revised')}
        >
          ⚠️ Not Revised
        </button>
        <button
          className={`tab-btn ${activeTab === 'revised' ? 'active' : ''}`}
          onClick={() => setActiveTab('revised')}
        >
          🔄 Revised
        </button>
        <button
          className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          ✅ Approved
        </button>
      </nav>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default QCPage;
