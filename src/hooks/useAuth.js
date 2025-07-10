// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from '../services/firebase';
import { getUserByEmail } from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            setError(null);

            if (firebaseUser) {
                try {
                    console.log('Firebase user detected:', firebaseUser.email);

                    console.log('Checking user in database...');
                    const supabaseUser = await getUserByEmail(firebaseUser.email);

                    if (!supabaseUser) {
                        // User not found in database - deny access
                        console.log('User not found in database, denying access');
                        await logOut();
                        setError('Email Anda tidak terdaftar dalam sistem. Silakan hubungi administrator untuk mendapatkan akses.');
                        setUser(null);
                        setUserData(null);
                        setLoading(false);
                        return;
                    }

                    // User found in database - allow access
                    console.log('User found in database:', supabaseUser);
                    setUser(firebaseUser);
                    setUserData(supabaseUser);

                } catch (err) {
                    console.error('Error checking user in database:', err);
                    await logOut();
                    setError('Tidak dapat mengverifikasi akses Anda. Silakan coba lagi atau hubungi administrator.');
                    setUser(null);
                    setUserData(null);
                }
            } else {
                console.log('No Firebase user, clearing state...');
                setUser(null);
                setUserData(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            setError(null);
            console.log('Starting Google login...');
            const result = await signInWithGoogle();
            console.log('Google login successful for:', result.user.email);

            // Additional validation after login
            console.log('Validating user access in database...');
            const supabaseUser = await getUserByEmail(result.user.email);

            if (!supabaseUser) {
                // User not in database - logout and deny
                await logOut();
                throw new Error('Email Anda tidak terdaftar dalam sistem. Silakan hubungi administrator.');
            }

            console.log('User validation successful:', supabaseUser.role);

        } catch (err) {
            console.error('Login error:', err);
            setError(err.message);
            throw err;
        }
    };

    const logout = async () => {
        try {
            setError(null);
            await logOut();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const hasRole = (requiredRole) => {
        if (!userData) return false;
        if (userData.role === 'administrator') return true;
        return userData.role === requiredRole;
    };

    const isAuthenticated = () => {
        return user && userData;
    };

    const value = {
        user,
        userData,
        loading,
        error,
        login,
        logout,
        hasRole,
        isAuthenticated
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};