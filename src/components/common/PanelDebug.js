// src/components/common/DebugPanel.js
import { useState } from 'react';
import { supabase, testConnection, createUser, getUserByEmail } from '../../services/supabase';

const DebugPanel = () => {
    const [testResults, setTestResults] = useState({});
    const [loading, setLoading] = useState(false);

    const runTests = async () => {
        setLoading(true);
        const results = {};

        // Test 1: Environment Variables
        console.log('=== Testing Environment Variables ===');
        results.envVars = {
            supabaseUrl: process.env.REACT_APP_SUPABASE_URL ? 'Present' : 'Missing',
            supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
            firebaseApiKey: process.env.REACT_APP_FIREBASE_API_KEY ? 'Present' : 'Missing'
        };

        // Test 2: Supabase Connection
        console.log('=== Testing Supabase Connection ===');
        try {
            const connectionOk = await testConnection();
            results.connection = connectionOk ? 'Success' : 'Failed';
        } catch (err) {
            results.connection = `Error: ${err.message}`;
        }

        // Test 3: Table Access
        console.log('=== Testing Table Access ===');
        try {
            const { data, error } = await supabase.from('users').select('*').limit(1);
            if (error) throw error;
            results.tableAccess = 'Success';
            results.sampleData = data;
        } catch (err) {
            results.tableAccess = `Error: ${err.message}`;
        }

        // Test 4: Manual User Creation
        console.log('=== Testing Manual User Creation ===');
        try {
            const testEmail = `test-${Date.now()}@example.com`;
            const testUser = {
                name: 'Test User',
                email: testEmail,
                role: 'question_maker'
            };

            const createdUser = await createUser(testUser);
            results.userCreation = 'Success';
            results.createdUser = createdUser;
        } catch (err) {
            results.userCreation = `Error: ${err.message}`;
        }

        setTestResults(results);
        setLoading(false);
    };

    const clearTests = () => {
        setTestResults({});
    };

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'white',
            border: '1px solid #ccc',
            padding: '1rem',
            borderRadius: '8px',
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'auto',
            zIndex: 9999,
            fontSize: '12px'
        }}>
            <h3>Debug Panel</h3>

            <div style={{ marginBottom: '1rem' }}>
                <button onClick={runTests} disabled={loading} style={{ marginRight: '10px' }}>
                    {loading ? 'Running Tests...' : 'Run Tests'}
                </button>
                <button onClick={clearTests}>Clear</button>
            </div>

            {Object.keys(testResults).length > 0 && (
                <div>
                    <h4>Test Results:</h4>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                        {JSON.stringify(testResults, null, 2)}
                    </pre>
                </div>
            )}

            <div style={{ marginTop: '1rem' }}>
                <h4>Quick Actions:</h4>
                <button
                    onClick={() => window.location.reload()}
                    style={{ display: 'block', marginBottom: '5px', width: '100%' }}
                >
                    Reload Page
                </button>
                <button
                    onClick={() => localStorage.clear()}
                    style={{ display: 'block', marginBottom: '5px', width: '100%' }}
                >
                    Clear Storage
                </button>
                <button
                    onClick={() => console.clear()}
                    style={{ display: 'block', width: '100%' }}
                >
                    Clear Console
                </button>
            </div>
        </div>
    );
};

export default DebugPanel;