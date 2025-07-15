import { useState, useEffect } from 'react';
import { getQuestions, getSubjects } from '../../services/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import QuestionPreview from './QuestionPreview';
import '../../styles/pages/revision-tab.css';
import { UNSAFE_createClientRoutesWithHMRRevalidationOptOut } from 'react-router-dom';

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
        questionType: 'all',
        pic: 'all'
    });
    const [subjects, setSubjects] = useState([]);
    const [allQuestions, setAllQuestions] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 0
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [filters, pagination.currentPage, pagination.itemsPerPage]);

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

            const allQuestionsData = await getQuestions({
                ...(filters.status !== 'all' && { status: filters.status === 'success' ? 'active' : filters.status }),
                ...(filters.subject !== 'all' && { subject_id: filters.subject }),
                ...(filters.questionType !== 'all' && { question_type: filters.questionType })
            });

            setAllQuestions(allQuestionsData);

            const filteredQuestions = filters.pic === 'all'
                ? allQuestionsData
                : allQuestionsData.filter(q => q.created_by_user?.name === filters.pic);

            setQuestions(filteredQuestions);

            const totalQuestions = filteredQuestions.length;
            const successCount = filteredQuestions.filter(q => q.status === 'active').length;
            const revisedCount = filteredQuestions.filter(q => q.status === 'revised').length;

            const paginationData = calculatePagination(
                filteredQuestions.length,
                pagination.currentPage,
                pagination.itemsPerPage
            );

            setPagination(paginationData);

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


    const getPICs = () => {
        const pics = new Set();
        allQuestions.forEach(question => {
            if (question?.created_by_user?.name) {
                pics.add(question.created_by_user.name);
            }
        });
        return Array.from(pics).sort();
    };

    const calculatePagination = (totalItems, currentPage, itemsPerPage) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        return {
            currentPage,
            itemsPerPage,
            totalItems,
            totalPages,
            startIndex: (currentPage - 1) * itemsPerPage,
            endIndex: Math.min(currentPage * itemsPerPage, totalItems)
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({
                ...prev,
                currentPage: newPage
            }))
        }
    };

    const handleItemsPerPageChange = (newItemsPerPage,) => {
        setPagination(prev => ({
            ...prev,
            itemsPerPage: newItemsPerPage,
            currentPage: 1
        }))
    };

    const getPaginatedQuestions = () => {
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        return questions.slice(startIndex, endIndex)
    }

    const PaginationComponent = () => {
        const { currentPage, totalPages, totalItems, itemsPerPage, startIndex, endIndex } = pagination;

        const getPageNumbers = () => {
            const pages = [];
            const maxVisiblePages = 5;

            if (totalPages <= maxVisiblePages) {
                for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, currentPage + 2);

                if (currentPage <= 3) {
                    endPage = maxVisiblePages;
                } else if (currentPage >= totalPages - 2) {
                    startPage = totalPages - maxVisiblePages + 1;
                }

                for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                }
            }

            return pages;
        };

        if (totalPages <= 1) return null;

        return (
            <div className="pagination-container">
                <div className="pagination-info">
                    <span>
                        Showing {startIndex + 1}-{endIndex} of {totalItems} questions
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                        className="items-per-page-select"
                    >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                    </select>
                </div>

                <div className="pagination-controls">
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                    >
                        First
                    </button>

                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>

                    {getPageNumbers().map(pageNum => (
                        <button
                            key={pageNum}
                            className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                            onClick={() => handlePageChange(pageNum)}
                        >
                            {pageNum}
                        </button>
                    ))}

                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>

                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                    >
                        Last
                    </button>
                </div>
            </div>
        );
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

                <div className="filter-group">
                    <label>PIC:</label>
                    <select
                        value={filters.pic}
                        onChange={(e) => handleFilterChange('pic', e.target.value)}
                    >
                        <option value="all">All PICs</option>
                        {getPICs().map((pic, i) => (
                            <option key={i} value={pic}>
                                {pic}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {questions.length === 0 ? (
                <div className="empty-state">
                    <p>No questions found with the selected filters.</p>
                </div>
            ) : (
                <>
                    <PaginationComponent />
                    <div className="questions-list">
                        {getPaginatedQuestions().map((question) => (
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
                </>
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