import React, { useState, useEffect } from 'react';
import { getUserUnderReviewCount, getUserQuestionsUnderReview } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/pages/quota-dashboard.css';

const QuotaDashboard = ({ onQuotaUpdate, maxQuestions = 10 }) => {
    const { userData } = useAuth();
    const [quotaData, setQuotaData] = useState({
        currentCount: 0,
        maxQuestions: maxQuestions,
        percentage: 0
    });
    const [recentQuestions, setRecentQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData?.id) {
            fetchQuotaData();
        }
    }, [userData?.id, maxQuestions]);

    const fetchQuotaData = async () => {
        try {
            setLoading(true);

            const currentCount = await getUserUnderReviewCount(userData.id);

            const { questions } = await getUserQuestionsUnderReview(userData.id, {
                page: 1,
                limit: 5
            });

            const percentage = (currentCount / maxQuestions) * 100;

            const newQuotaData = {
                currentCount,
                maxQuestions,
                percentage
            };

            setQuotaData(newQuotaData);
            setRecentQuestions(questions);

            if (onQuotaUpdate) {
                onQuotaUpdate(newQuotaData);
            }

        } catch (error) {
            console.error('Error fetching quota data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getQuotaStatus = () => {
        const { percentage } = quotaData;

        if (percentage >= 100) return { status: 'full', color: '#dc3545', message: 'Quota Full' };
        if (percentage >= 80) return { status: 'high', color: '#fd7e14', message: 'Quota High' };
        if (percentage >= 50) return { status: 'medium', color: '#ffc107', message: 'Quota Medium' };
        return { status: 'low', color: '#28a745', message: 'Quota Available' };
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'N/A';

        const now = new Date();
        const date = new Date(dateString);
        const diffInMs = now - date;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInDays > 0) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        } else if (diffInHours > 0) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        } else {
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }
    };

    const refreshQuota = () => {
        fetchQuotaData();
    };

    if (loading) {
        return (
            <div className="quota-dashboard loading">
                <div className="loading-spinner"></div>
                <span>Loading quota...</span>
            </div>
        );
    }

    const quotaStatus = getQuotaStatus();

    return (
        <div className="quota-dashboard">
            <div className="quota-header">
                <h3>Review Quota Status</h3>
                <button
                    className="refresh-btn"
                    onClick={refreshQuota}
                    title="Refresh quota data"
                >
                    🔄
                </button>
            </div>

            <div className="quota-main">
                <div className="quota-circle-container">
                    <div className="quota-circle">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                            <path
                                className="circle-bg"
                                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                                className="circle"
                                strokeDasharray={`${quotaData.percentage}, 100`}
                                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                                style={{ stroke: quotaStatus.color }}
                            />
                        </svg>
                        <div className="quota-text">
                            <span className="quota-number">{quotaData.currentCount}</span>
                            <span className="quota-total">/ {quotaData.maxQuestions}</span>
                        </div>
                    </div>
                </div>

                <div className="quota-info">
                    <div className="quota-status">
                        <span
                            className="status-indicator"
                            style={{ backgroundColor: quotaStatus.color }}
                        ></span>
                        <span className="status-text">{quotaStatus.message}</span>
                    </div>

                    <div className="quota-details">
                        <p className="available-slots">
                            <strong>{quotaData.maxQuestions - quotaData.currentCount}</strong> slots available
                        </p>

                        {quotaData.currentCount >= quotaData.maxQuestions && (
                            <p className="quota-full-message">
                                ⚠️ Complete at least one question to take new ones
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {recentQuestions.length > 0 && (
                <div className="recent-questions">
                    <h4>Currently Under Review</h4>
                    <div className="recent-questions-list">
                        {recentQuestions.map((question) => (
                            <div key={question.id} className="recent-question-item">
                                <div className="question-id-small">{question.inhouse_id}</div>
                                <div className="question-subject">{question.subjects?.name}</div>
                                <div className="question-time">{formatTimeAgo(question.qc_review_started_at)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotaDashboard;