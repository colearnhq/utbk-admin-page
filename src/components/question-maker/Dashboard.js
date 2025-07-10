// src/components/question-maker/Dashboard.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getQuestionPackageStats } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/dashboard.css';

const Dashboard = () => {
    const { userData } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalPackages: 0,
        totalQuestions: 0,
        pendingRevision: 0,
        approved: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, [userData]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const statsData = await getQuestionPackageStats(userData.id);
            setStats(statsData);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <h2>Loading dashboard...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="error-message">
                    Error loading dashboard: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>Dashboard - Question Maker</h2>
                <p>Selamat datang, {userData.name}</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card total-packages">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <h3>{stats.totalPackages}</h3>
                        <p>Total Paket Soal</p>
                    </div>
                </div>

                <div className="stat-card total-questions">
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                        <h3>{stats.totalQuestions}</h3>
                        <p>Total Soal Diupload</p>
                    </div>
                </div>

                <div className="stat-card pending-revision">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>{stats.pendingRevision}</h3>
                        <p>Soal Perlu Revisi</p>
                    </div>
                </div>

                <div className="stat-card approved">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>{stats.approved}</h3>
                        <p>Soal Berhasil ACC</p>
                    </div>
                </div>
            </div>

            <div className="recent-activity">
                <h3>Aktivitas Terbaru</h3>
                <div className="activity-list">
                    <p>Belum ada aktivitas terbaru</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;