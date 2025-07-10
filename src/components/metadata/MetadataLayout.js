// src/components/metadata/MetadataLayout.js
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import MetadataManagement from './MetadataManagement';
import '../../styles/pages/metadata.css';

const MetadataLayout = () => {
    const { userData, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('management');

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'management':
                return <MetadataManagement />;
            default:
                return <MetadataManagement />;
        }
    };

    return (
        <div className="metadata-layout">
            <header className="app-header">
                <div className="header-left">
                    <h1>UTBK Questions Admin</h1>
                    <span className="role-badge">Metadata Team</span>
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
                    className={`tab-btn ${activeTab === 'management' ? 'active' : ''}`}
                    onClick={() => setActiveTab('management')}
                >
                    📊 Metadata Management
                </button>
            </nav>

            <main className="main-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default MetadataLayout;