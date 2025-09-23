// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './components/auth/Login';
import QuestionMakerLayout from './components/question-maker/QuestionMakerLayout';
import DataEntryLayout from './components/data-entry/DataEntryLayout';
import MetadataLayout from './components/metadata/MetadataLayout';
import QCPage from './components/qc/QCPage';
import AdminDashboard from './components/administrator/AdminDashboard';
import UserRegistration from './components/admin/UserRegistration'; // New import

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />

            <Route
              path="/question-maker"
              element={
                <ProtectedRoute requiredRole="question_maker">
                  <QuestionMakerLayout />
                </ProtectedRoute>
              }
            />

            <Route
              path="/data-entry"
              element={
                <ProtectedRoute requiredRole="data_entry">
                  <DataEntryLayout />
                </ProtectedRoute>
              }
            />

            <Route
              path="/qc"
              element={
                <ProtectedRoute requiredRole="qc_data">
                  <QCPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/metadata"
              element={
                <ProtectedRoute requiredRole="metadata">
                  <MetadataLayout />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="administrator">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* New Admin User Registration Route */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="administrator">
                  <UserRegistration />
                </ProtectedRoute>
              }
            />

            {/* Question Bank Editor Demo */}
            <Route path="/editor-demo" element={<QbDemo />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;