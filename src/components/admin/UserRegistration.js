import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createUser, getAllUsers, deleteUser } from '../../services/supabase';
import '../../styles/components/forms.css';
import '../../styles/components/user-management.css';

const UserRegistration = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        vendor_name: '',
        new_vendor_name: '' // Added for "Other" vendor option
    });
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uniqueVendorNames, setUniqueVendorNames] = useState([]); // State for unique vendor names

    const roles = ['question_maker', 'data_entry', 'qc_data', 'metadata', 'administrator'];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const fetchedUsers = await getAllUsers();
            setUsers(fetchedUsers);

            // Extract unique vendor names
            const vendors = [...new Set(fetchedUsers.map(user => user.vendor_name).filter(Boolean))];
            setUniqueVendorNames(vendors);

        } catch (error) {
            console.error('Error fetching users:', error);
            setMessage('Failed to load users.');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setMessageType(null);

        try {
            let finalVendorName = formData.vendor_name;

            if (formData.vendor_name === 'other') {
                if (!formData.new_vendor_name) {
                    setMessage('New Vendor Name is required when "Other" is selected.');
                    setMessageType('error');
                    return;
                }
                finalVendorName = formData.new_vendor_name;
            }

            // Basic validation
            if (!formData.name || !formData.email || !formData.role || !finalVendorName) {
                setMessage('All fields are required.');
                setMessageType('error');
                return;
            }

            // Check if email already exists
            const emailExists = users.some(user => user.email === formData.email);
            if (emailExists) {
                setMessage('User with this email already exists.');
                setMessageType('error');
                return;
            }

            const newUser = await createUser({
                name: formData.name,
                email: formData.email,
                role: formData.role,
                vendor_name: finalVendorName // Use the final vendor name
            });
            setMessage(`User ${newUser.name} registered successfully!`);
            setMessageType('success');
            setFormData({
                name: '',
                email: '',
                role: '',
                vendor_name: '',
                new_vendor_name: '' // Clear this too
            });
            fetchUsers();
        } catch (error) {
            console.error('Error registering user:', error);
            setMessage(`Failed to register user: ${error.message}`);
            setMessageType('error');
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (window.confirm(`Are you sure you want to delete user ${userName}?`)) {
            setMessage(null);
            setMessageType(null);
            try {
                await deleteUser(userId);
                setMessage(`User ${userName} deleted successfully.`);
                setMessageType('success');
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                setMessage(`Failed to delete user: ${error.message}`);
                setMessageType('error');
            }
        }
    };

    return (
        <div className="user-management-container">
            <div className="header-with-back">
                <h2>User Management</h2>
                <Link to="/admin" className="btn btn-secondary back-button">
                    Back to Admin Dashboard
                </Link>
            </div>
            <p>Register new users and view existing ones.</p>

            {message && (
                <div className={`message ${messageType === 'success' ? 'success-message' : 'error-message'}`}>
                    {message}
                </div>
            )}

            <div className="form-section">
                <h3>Register New User</h3>
                <form onSubmit={handleSubmit} className="user-registration-form">
                    <div className="form-group">
                        <label htmlFor="name">Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="role">Role *</label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Role</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="vendor_name">Vendor Name *</label>
                        <select
                            id="vendor_name"
                            name="vendor_name"
                            value={formData.vendor_name}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Vendor</option>
                            {uniqueVendorNames.map(vendor => (
                                <option key={vendor} value={vendor}>{vendor}</option>
                            ))}
                            <option value="other">Other (Specify New Vendor)</option>
                        </select>
                    </div>

                    {formData.vendor_name === 'other' && (
                        <div className="form-group">
                            <label htmlFor="new_vendor_name">New Vendor Name *</label>
                            <input
                                type="text"
                                id="new_vendor_name"
                                name="new_vendor_name"
                                value={formData.new_vendor_name || ''}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            Register User
                        </button>
                    </div>
                </form>
            </div>

            <div className="user-list-section">
                <h3>Existing Users</h3>
                {loading ? (
                    <p>Loading users...</p>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Vendor</th>
                                <th>Actions</th> {/* New column for actions */}
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{user.role}</td>
                                        <td>{user.vendor_name || 'N/A'}</td>
                                        <td>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5">No users found.</td> {/* Updated colspan */}
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default UserRegistration;