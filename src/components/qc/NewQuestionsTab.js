import React, { useEffect, useState } from 'react';
import QCReviewTab from './QCReviewTab';
import { getQuestions } from '../../services/supabase';

const NewQuestionsTab = () => {
    const [activeSubTab, setActiveSubTab] = useState('available');
    const [countQuestions, setCountQuestions] = useState({
        available: 0,
        under_review: 0
    })
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

    const countQuestionBasedOnStatus = async () => {
        try {
            const availableQuestions = await getQuestions({
                qc_status: 'pending_review'
            });
            const underReviewQuestions = await getQuestions({
                qc_status: 'under_qc_review'
            });

            console.log('Available questions:', availableQuestions);
            console.log('Under review questions:', underReviewQuestions);

            setCountQuestions({
                available: availableQuestions.length,
                under_review: underReviewQuestions.length
            });
        } catch (e) {
            throw new Error(`failed to count the questions: ${e.message}`)
        }
    };

    useEffect(() => {
        countQuestionBasedOnStatus();
    }, [refreshKey]);

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
                    />
                );
        }
    };

    return (
        <div className="new-questions-tab">
            <div className="sub-tab-navigation">
                <button
                    className={`sub-tab-btn ${activeSubTab === 'available' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('available')}
                >
                    📋 Available Questions ({countQuestions.available})
                </button>
                <button
                    className={`sub-tab-btn ${activeSubTab === 'under-qc-review' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('under-qc-review')}
                >
                    👤 Under QC Review ({countQuestions.under_review})
                </button>
            </div>

            <div className="sub-tab-content">
                {renderSubTabContent()}
            </div>
        </div>
    );
};

export default NewQuestionsTab;