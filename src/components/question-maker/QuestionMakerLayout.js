// src/components/question-maker/QuestionMakerLayout.js
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Dashboard from './Dashboard';
import Submission from './Submission';
import Revision from './Revision';
import '../../styles/pages/question-maker.css';

const QuestionMakerLayout = () => {
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
                return <Dashboard />;
            case 'submission':
                return <Submission />;
            case 'revision':
                return <Revision />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="question-maker-layout">
            <header className="app-header">
                <div className="header-left">
                    <h1>UTBK Questions Admin</h1>
                    <span className="role-badge">Question Maker</span>
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
                    className={`tab-btn ${activeTab === 'submission' ? 'active' : ''}`}
                    onClick={() => setActiveTab('submission')}
                >
                    📤 Submission
                </button>
                <button
                    className={`tab-btn ${activeTab === 'revision' ? 'active' : ''}`}
                    onClick={() => setActiveTab('revision')}
                >
                    🔄 Revision
                </button>
            </nav>

            <main className="main-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default QuestionMakerLayout;