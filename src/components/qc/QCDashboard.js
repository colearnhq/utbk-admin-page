import React, { useState, useEffect } from 'react';
import { getQCStatistics } from '../../services/supabase';
import QuotaDashboard from './QuotaDashboard';

const QCDashboard = () => {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    pendingReview: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    recreateQuestion: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const data = await getQCStatistics();
      setStats(data);
    } catch (error) {
      console.error('Error fetching QC statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <h2>QC Data Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Questions</h3>
            <p className="stat-number">{stats.totalQuestions}</p>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">🆕</div>
          <div className="stat-content">
            <h3>Pending Review</h3>
            <p className="stat-number">{stats.pendingReview}</p>
          </div>
        </div>

        <div className="stat-card under-review">
          <div className="stat-icon">👁️</div>
          <div className="stat-content">
            <h3>Under Review</h3>
            <p className="stat-number">{stats.underReview}</p>
          </div>
        </div>

        <div className="stat-card approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Approved</h3>
            <p className="stat-number">{stats.approved}</p>
          </div>
        </div>

        <div className="stat-card rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>Rejected</h3>
            <p className="stat-number">{stats.rejected}</p>
          </div>
        </div>

        <div className="stat-card revision">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <h3>Recreate Question</h3>
            <p className="stat-number">{stats.recreateQuestion}</p>
          </div>
        </div>
      </div>

      <QuotaDashboard maxQuestions={200} />

      <div className="dashboard-actions">
        <div className="action-card">
          <h3>Quick Actions</h3>
          <ul>
            <li>Review new questions from Data Entry team</li>
            <li>Check revised questions from Question Makers</li>
            <li>Monitor overall QC progress</li>
            <li>Generate QC reports</li>
          </ul>
        </div>

        <div className="action-card">
          <h3>QC Guidelines</h3>
          <ul>
            <li>Easy questions must be sent back for revision</li>
            <li>Only hard questions can be approved</li>
            <li>Provide clear feedback for rejections</li>
            <li>Use appropriate keywords for revision routing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QCDashboard;