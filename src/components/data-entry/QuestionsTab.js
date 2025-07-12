import { useState, useEffect } from 'react';
import { getQuestions, getSubjects } from '../../services/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import QuestionPreview from './QuestionPreview';
import '../../styles/pages/revision-tab.css';

const QuestionsTab = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        success: 0,
        revised: 0
    });
    const [filters, setFilters] = useState({
        status: 'all',
        subject: 'all',
        questionType: 'all'
    });
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [filters]);

    const fetchInitialData = async () => {
        try {
            const subjectsData = await getSubjects();
            setSubjects(subjectsData);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);

            const apiFilters = {};
            if (filters.status !== 'all') {
                apiFilters.status = filters.status === 'success' ? 'active' : filters.status;
            }
            if (filters.subject !== 'all') {
                apiFilters.subject_id = filters.subject;
            }
            if (filters.questionType !== 'all') {
                apiFilters.question_type = filters.questionType;
            }

            const questionsData = await getQuestions(apiFilters);
            setQuestions(questionsData);

            const totalQuestions = questionsData.length;
            const successCount = questionsData.filter(q => q.status === 'active').length;
            const revisedCount = questionsData.filter(q => q.status === 'revised').length;

            setStats({
                total: totalQuestions,
                success: successCount,
                revised: revisedCount
            });
        } catch (err) {
            setError('Failed to fetch questions');
            console.error('Error fetching questions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = (question) => {
        setPreviewData({
            ...question,
            subject_id: question.subject.id,
            chapter_id: question.chapter.id,
            topic_id: question.topic.id,
            concept_title_id: question.concept_title.id
        });
        setShowPreview(true);
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'green';
            case 'revised': return 'orange';
            default: return 'gray';
        }
    };

    const getQuestionTypeColor = (type) => {
        switch (type) {
            case 'MCQ': return 'blue';
            case 'Essay': return 'green';
            case 'Short Answer': return 'orange';
            default: return 'gray';
        }
    };

    const filteredQuestions = questions;

    if (loading) return <LoadingSpinner message="Loading questions..." />;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="questions-tab">
            <div className="questions-header">
                <h2>All Questions</h2>
                <p>View and manage all created questions</p>
            </div>

            <div className="questions-stats-data-entry">
                <div className="stat-card">
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-label">Total Questions</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-number">{stats.success}</div>
                    <div className="stat-label">Success</div>
                </div>
                <div className="stat-card revised">
                    <div className="stat-number">{stats.revised}</div>
                    <div className="stat-label">Revised</div>
                </div>
            </div>

            <div className="questions-filters">
                <div className="filter-group">
                    <label>Status:</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="success">Success</option>
                        <option value="revised">Revised</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Subject:</label>
                    <select
                        value={filters.subject}
                        onChange={(e) => handleFilterChange('subject', e.target.value)}
                    >
                        <option value="all">All Subjects</option>
                        {subjects.map(subject => (
                            <option key={subject.id} value={subject.id}>
                                {subject.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Type:</label>
                    <select
                        value={filters.questionType}
                        onChange={(e) => handleFilterChange('questionType', e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="MCQ">MCQ</option>
                        <option value="Essay">Essay</option>
                        <option value="Short Answer">Short Answer</option>
                    </select>
                </div>
            </div>

            {filteredQuestions.length === 0 ? (
                <div className="empty-state">
                    <p>No questions found with the selected filters.</p>
                </div>
            ) : (
                <div className="questions-list">
                    {filteredQuestions.map((question) => (
                        <div key={question.id} className="question-card">
                            <div className="question-card-header">
                                <div className="question-meta">
                                    <span className="question-id">{question.inhouse_id}</span>
                                    <span
                                        className={`question-type-on-data-entry ${getQuestionTypeColor(question.question_type)}`}
                                    >
                                        {question.question_type}
                                    </span>
                                    <span
                                        className={`question-status ${getStatusColor(question.status)}`}
                                    >
                                        {question.status === 'active' ? '✓ Success' : '⚠ Revised'}
                                    </span>
                                </div>
                                <div className="question-date">
                                    {new Date(question.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="question-content">
                                <div className="tagging-info">
                                    <span className="tag">{question.subject.name}</span>
                                    <span className="tag">{question.chapter.name}</span>
                                    <span className="tag">{question.topic.name}</span>
                                    <span className="tag">{question.concept_title.name}</span>
                                </div>

                                <div className="question-preview">
                                    <p>{question.question.substring(0, 100)}...</p>
                                </div>

                                <div className="question-info">
                                    <span>Created by: {question.created_by_user?.name || 'Unknown'}</span>
                                </div>
                            </div>

                            <div className="question-actions">
                                <button
                                    className="btn btn-outline"
                                    onClick={() => handlePreview(question)}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showPreview && (
                <QuestionPreview
                    data={previewData}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
};

export default QuestionsTab;