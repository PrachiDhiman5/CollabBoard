import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = sessionStorage.getItem('token');
    const user = sessionStorage.getItem('user');

    if (!token || !user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
