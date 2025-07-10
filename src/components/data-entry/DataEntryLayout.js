import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import PackagesList from './PackagesList';
import RevisionTab from './RevisionTab';
import QuestionsTab from './QuestionsTab';
import '../../styles/pages/data-entry.css';

const DataEntryLayout = () => {
    const { userData, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('packages');

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'packages':
                return <PackagesList />;
            case 'revision':
                return <RevisionTab />;
            case 'questions':
                return <QuestionsTab />;
            default:
                return <PackagesList />;
        }
    };


    return (
        <div className="data-entry-layout">
            <header className="app-header">
                <div className="header-left">
                    <h1>UTBK Questions Admin</h1>
                    <span className="role-badge">Data Entry</span>
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
                    className={`tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
                    onClick={() => setActiveTab('packages')}
                >
                    📦 Packages
                </button>
                <button
                    className={`tab-btn ${activeTab === 'revision' ? 'active' : ''}`}
                    onClick={() => setActiveTab('revision')}
                >
                    🔄 Revision
                </button>
                <button
                    className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('questions')}
                >
                    📝 Questions
                </button>
            </nav>

            <main className="main-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default DataEntryLayout;