import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/pages/admin-dashboard.css';

const AdminDashboard = () => {
    const { userData, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <h1>Administrator Dashboard</h1>
                <p>Welcome, {userData.name}. Select a module to manage.</p>
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </header>
            <div className="dashboard-grid">
                <Link to="/question-maker" className="dashboard-card">
                    <h3>Question Maker</h3>
                    <p>Review and manage question submissions from users.</p>
                </Link>

                <Link to="/data-entry" className="dashboard-card">
                    <h3>Data Entry</h3>
                    <p>Enter new questions and manage question packages.</p>
                </Link>

                <Link to="/qc" className="dashboard-card">
                    <h3>QC Data</h3>
                    <p>Quality control and data validation tools.</p>
                </Link>

                <Link to="/metadata" className="dashboard-card">
                    <h3>Metadata Management</h3>
                    <p>Manage subjects, chapters, topics, and concepts.</p>
                </Link>

                <Link to="/admin/users" className="dashboard-card">
                    <h3>User Management</h3>
                    <p>Register new users and manage user roles and vendors.</p>
                </Link>
            </div>
        </div>
    );
};

export default AdminDashboard;
