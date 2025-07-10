import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const QCPage = () => {
  const { userData } = useAuth();

  return (
    <div className="page-placeholder">
      {userData && userData.role === 'administrator' && (
        <Link to="/admin" className="btn btn-secondary back-button">
          Back to Admin Dashboard
        </Link>
      )}
      <h2>QC Correctness and Difficultness Dashboard</h2>
      <p>Coming soon...</p>
    </div>
  );
};

export default QCPage;
