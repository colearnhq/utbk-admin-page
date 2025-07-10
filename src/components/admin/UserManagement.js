// src/components/admin/UserManagement.js
import { useState, useEffect } from 'react';
import { getAllUsers, addUser, updateUserRole, deleteUser } from '../../services/supabase';
import '../../styles/components/user-management.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'question_maker'
    });
    const [processing, setProcessing] = useState(false);

    const roles = [
        { value: 'question_maker', label: 'Question Maker' },
        { value: 'data_entry', label: 'Data Entry' },
        { value: 'qc_data', label: 'QC Correctness and Difficultness' },
        { value: 'metadata', label: 'Metadata Team' },
        { value: 'administrator', label: 'Administrator' }
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const usersData = await getAllUsers();
            setUsers(usersData);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();

        if (!newUser.name || !newUser.email || !newUser.role) {
            setError('All fields are required');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUser.email)) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            setProcessing(true);
            setError(null);

            await addUser(newUser);

            // Refresh users list
            await fetchUsers();

            // Reset form
            setNewUser({ name: '', email: '', role: 'question_maker' });
            setShowAddForm(false);

        } catch (err) {
            setError(err.message);
            console.error('Error adding user:', err);
        } finally {
            setProcessing(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            setError(null);
            await updateUserRole(userId, newRole);

            // Update local state
            setUsers(users.map(user =>
                user.id === userId ? { ...user, role: newRole } : user
            ));

        } catch (err) {
            setError(err.message);
            console.error('Error updating role:', err);
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        const confirmDelete = window.confirm(
            `Are you sure you want to delete user: ${userEmail}?\n\nThis action cannot be undone.`
        );

        if (!confirmDelete) return;

        try {
            setError(null);
            await deleteUser(userId);

            // Remove from local state
            setUsers(users.filter(user => user.id !== userId));

        } catch (err) {
            setError(err.message);
            console.error('Error deleting user:', err);
        }
    };

    const getRoleLabel = (roleValue) => {
        const role = roles.find(r => r.value === roleValue);
        return role ? role.label : roleValue;
    };

    if (loading) {
        return (
            <div className="user-management-container">
                <h2>Loading users...</h2>
            </div>
        );
    }

    return (
        <div className="user-management-container">
            <div className="user-management-header">
                <h2>User Management</h2>
                <p>Manage system users and their roles</p>
                <button
                    className="add-user-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? 'Cancel' : 'Add New User'}
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {showAddForm && (
                <div className="add-user-form">
                    <h3>Add New User</h3>
                    <form onSubmit={handleAddUser}>
                        <div className="form-group">
                            <label htmlFor="name">Full Name *</label>
                            <input
                                type="text"
                                id="name"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                placeholder="Enter full name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email Address *</label>
                            <input
                                type="email"
                                id="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="Enter email address"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="role">Role *</label>
                            <select
                                id="role"
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                required
                            >
                                {roles.map(role => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-actions">
                            <button type="submit" disabled={processing} className="submit-btn">
                                {processing ? 'Adding...' : 'Add User'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="users-table-container">
                <h3>Current Users ({users.length})</h3>

                {users.length === 0 ? (
                    <div className="no-users">
                        <p>No users found. Add the first user to get started.</p>
                    </div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="user-name">{user.name}</td>
                                    <td className="user-email">{user.email}</td>
                                    <td className="user-role">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className="role-select"
                                        >
                                            {roles.map(role => (
                                                <option key={role.value} value={role.value}>
                                                    {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="user-created">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="user-actions">
                                        <button
                                            onClick={() => handleDeleteUser(user.id, user.email)}
                                            className="delete-btn"
                                            title="Delete User"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="user-stats">
                <h3>User Statistics</h3>
                <div className="stats-grid">
                    {roles.map(role => {
                        const count = users.filter(user => user.role === role.value).length;
                        return (
                            <div key={role.value} className="stat-item">
                                <span className="stat-count">{count}</span>
                                <span className="stat-label">{role.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;