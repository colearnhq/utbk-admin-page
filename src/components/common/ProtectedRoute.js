// src/components/common/ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { loading, isAuthenticated, hasRole, userData } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    if (requiredRole && !hasRole(requiredRole)) {
        // Redirect to appropriate dashboard based on user role
        const roleRoutes = {
            'question_maker': '/question-maker',
            'data_entry': '/data-entry',
            'qc_data': '/qc',
            'metadata': '/metadata',
            'administrator': '/admin'
        };

        const redirectPath = roleRoutes[userData.role] || '/';
        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

export default ProtectedRoute;