import React, { useEffect, useState, useCallback } from 'react';
import QCReviewTab from './QCReviewTab';
import { getQuestionsCountByQCStatus, getQuestionsCountByStatus } from '../../services/supabase';

const NewQuestionsTab = () => {
    const [activeSubTab, setActiveSubTab] = useState('available');
    const [countQuestions, setCountQuestions] = useState({
        available: 0,
        under_review: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleQuestionMoved = (action) => {
        setRefreshKey(prev => prev + 1);

        if (action === 'moved_to_under_review') {
            setActiveSubTab('under-qc-review');
        }

        if (action === 'released') {
            setActiveSubTab('under-qc-review');
        }
    };

    // Optimized count function using the new efficient method
    const countQuestionBasedOnStatus = useCallback(async (filters = {}) => {
        try {
            setLoading(true);
            setError(null);

            // Use the optimized count function that only counts without fetching data
            const counts = await getQuestionsCountByQCStatus(filters);

            setCountQuestions({
                available: counts.available,
                under_review: counts.under_review
            });

        } catch (e) {
            console.error('Failed to count questions:', e);
            setError(`Failed to count questions: ${e.message}`);

            setCountQuestions({
                available: 0,
                under_review: 0
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Alternative method for single status count (if needed for specific use cases)
    const countSingleStatus = useCallback(async (status, filters = {}) => {
        try {
            const count = await getQuestionsCountByStatus(status, filters);
            return count;
        } catch (e) {
            console.error(`Failed to count ${status} questions:`, e);
            return 0;
        }
    }, []);

    useEffect(() => {
        countQuestionBasedOnStatus();
    }, [refreshKey, countQuestionBasedOnStatus]);

    const renderSubTabContent = () => {
        switch (activeSubTab) {
            case 'available':
                return (
                    <QCReviewTab
                        key={`available-${refreshKey}`}
                        status="pending_review"
                        title="Available Questions"
                        excludeUnderReview={true}
                        onQuestionMoved={handleQuestionMoved}
                        onCountChange={(count) => {
                            // Optional: Update count when QCReviewTab reports changes
                            setCountQuestions(prev => ({
                                ...prev,
                                available: count
                            }));
                        }}
                    />
                );
            case 'under-qc-review':
                return (
                    <QCReviewTab
                        key={`under-review-${refreshKey}`}
                        status="under_qc_review"
                        title="Under QC Review"
                        showOnlyMyReviews={false}
                        onQuestionMoved={handleQuestionMoved}
                        onCountChange={(count) => {
                            // Optional: Update count when QCReviewTab reports changes
                            setCountQuestions(prev => ({
                                ...prev,
                                under_review: count
                            }));
                        }}
                    />
                );
            default:
                return (
                    <QCReviewTab
                        key={`default-${refreshKey}`}
                        status="pending_review"
                        title="Available Questions"
                        excludeUnderReview={true}
                        onQuestionMoved={handleQuestionMoved}
                        onCountChange={(count) => {
                            setCountQuestions(prev => ({
                                ...prev,
                                available: count
                            }));
                        }}
                    />
                );
        }
    };

    const refreshCounts = useCallback(() => {
        countQuestionBasedOnStatus();
    }, [countQuestionBasedOnStatus]);

    return (
        <div className="new-questions-tab">
            {error && (
                <div className="error-message" style={{
                    padding: '10px',
                    backgroundColor: '#fee',
                    color: '#c33',
                    marginBottom: '10px',
                    borderRadius: '4px'
                }}>
                    {error}
                    <button
                        onClick={refreshCounts}
                        style={{
                            marginLeft: '10px',
                            padding: '2px 8px',
                            backgroundColor: '#c33',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="sub-tab-navigation">
                <button
                    className={`sub-tab-btn ${activeSubTab === 'available' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('available')}
                    disabled={loading}
                >
                    📋 Available Questions ({loading ? '...' : countQuestions.available})
                </button>
                <button
                    className={`sub-tab-btn ${activeSubTab === 'under-qc-review' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('under-qc-review')}
                    disabled={loading}
                >
                    👤 Under QC Review ({loading ? '...' : countQuestions.under_review})
                </button>

                {/* Optional refresh button */}
                <button
                    className="refresh-btn"
                    onClick={refreshCounts}
                    disabled={loading}
                    style={{
                        marginLeft: 'auto',
                        padding: '8px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                    }}
                    title="Refresh counts"
                >
                    {loading ? '🔄' : '↻'} Refresh
                </button>
            </div>

            <div className="sub-tab-content">
                {renderSubTabContent()}
            </div>
        </div>
    );
};

export default NewQuestionsTab;