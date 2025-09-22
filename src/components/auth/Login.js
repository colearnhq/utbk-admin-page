// src/components/auth/Login.js
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import DebugPanel from '../common/PanelDebug.js';
import '../../styles/pages/login.css';

const Login = () => {
    const { login, isAuthenticated, userData, loading, error } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showDebug, setShowDebug] = useState(false);

    // Redirect if already authenticated
    if (isAuthenticated() && userData) {
        const roleRoutes = {
            'question_maker': '/question-maker',
            'data_entry': '/data-entry',
            'qc_data': '/qc',
            'metadata': '/metadata',
            'administrator': '/admin'
        };

        const redirectPath = roleRoutes[userData.role] || '/question-maker';
        return <Navigate to={redirectPath} replace />;
    }

    const handleGoogleLogin = async () => {
        try {
            setIsLoggingIn(true);
            console.log('Starting login process...');
            await login();
        } catch (err) {
            console.error('Login error:', err);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const toggleDebug = () => {
        setShowDebug(!showDebug);
    };

    if (loading) {
        return (
            <div className="login-container">
                <div className="login-box">
                    <h2>Loading...</h2>
                    <p>Checking authentication status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            {showDebug && <DebugPanel />}

            <div className="login-box">
                <div className="login-header">
                    <h1>UTBK Questions Admin</h1>
                    <p>Silakan login dengan akun Google Anda</p>
                </div>

                {error && (
                    <div className="error-message">
                        <strong>Error:</strong> {error}
                        <br />
                        <small>Check console for more details</small>
                    </div>
                )}

                <button
                    className="google-login-btn"
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                >
                    {isLoggingIn ? (
                        <>
                            <span className="spinner-small"></span>
                            Logging in...
                        </>
                    ) : (
                        <>
                            <img
                                src="https://developers.google.com/identity/images/g-logo.png"
                                alt="Google"
                                className="google-icon"
                            />
                            Login with Google
                        </>
                    )}
                </button>

                <div className="login-footer">
                    <p>Pastikan Anda menggunakan email yang terdaftar dalam sistem</p>
                    <button
                        onClick={toggleDebug}
                        style={{
                            marginTop: '10px',
                            padding: '5px 10px',
                            fontSize: '12px',
                            background: '#f0f0f0',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {showDebug ? 'Hide Debug' : 'Show Debug'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;