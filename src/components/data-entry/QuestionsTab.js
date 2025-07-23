import { useState, useEffect, useCallback } from 'react';
import {
    getSubjects,
    updateQuestion,
    getQuestionsWithFilters,
    getQuestionsStats,
    getQuestionPICs
} from '../../services/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import QuestionPreview from './QuestionPreview';
import QuestionEditor from './QuestionEditor';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/pages/revision-tab.css';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

const QuestionsTab = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        on_review: 0,
        revised: 0,
        edited: 0,
        qc_passed: 0
    });
    const [filters, setFilters] = useState({
        status: 'all',
        subject: 'all',
        questionType: 'all',
        pic: 'all'
    });
    const [subjects, setSubjects] = useState([]);
    const [pics, setPICs] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        itemsPerPage: 5,
        totalItems: 0,
        totalPages: 0
    });
    const [showEditor, setShowEditor] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { userData } = useAuth();

    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    // Fetch questions with current filters and pagination
    const fetchQuestions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await getQuestionsWithFilters(filters, {
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
                search: debouncedSearchQuery
            });

            setQuestions(result.questions);
            setPagination(prev => ({
                ...prev,
                totalItems: result.total,
                totalPages: result.totalPages
            }));

        } catch (err) {
            setError('Failed to fetch questions');
            console.error('Error fetching questions:', err);
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.currentPage, pagination.itemsPerPage, debouncedSearchQuery]);

    const fetchStats = useCallback(async () => {
        try {
            setStatsLoading(true);

            const statsData = await getQuestionsStats({
                subject: filters.subject,
                questionType: filters.questionType,
                pic: filters.pic,
                search: debouncedSearchQuery
            });

            setStats(statsData);
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, [filters.subject, filters.questionType, filters.pic, debouncedSearchQuery]);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [subjectsData, picsData] = await Promise.all([
                    getSubjects(),
                    getQuestionPICs()
                ]);

                setSubjects(subjectsData);
                setPICs(picsData);
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch questions when dependencies change
    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // Fetch stats when dependencies change
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Handle escape key for editor
    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && showEditor) {
                handleCancelEdit();
            }
        };

        if (showEditor) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [showEditor]);

    const getJakartaISOString = () => {
        const now = new Date();
        const jakartaOffset = 7 * 60;
        const jakartaTime = new Date(now.getTime() + (jakartaOffset * 60 * 1000));
        return jakartaTime.toISOString().replace(/Z$/, '+07:00');
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setPagination(prev => ({
            ...prev,
            currentPage: 1
        }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({
                ...prev,
                currentPage: newPage
            }));
        }
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setPagination(prev => ({
            ...prev,
            itemsPerPage: newItemsPerPage,
            currentPage: 1
        }));
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));

        // Reset to first page when filters change
        setPagination(prev => ({
            ...prev,
            currentPage: 1
        }));
    };

    const PaginationComponent = () => {
        const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;

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

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

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

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'yellow';
            case 'revised': return 'orange';
            case 'edited': return 'blue';
            case 'qc_passed': return 'green';
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

    const handleEditQuestion = (question) => {
        setEditingQuestion({
            ...question,
            subject_id: question.subject.id,
            chapter_id: question.chapter.id,
            topic_id: question.topic.id,
            concept_title_id: question.concept_title.id
        });
        setShowEditor(true);
    };

    const handleSaveEditedQuestion = async (questionData) => {
        try {
            setLoading(true);

            const updatedQuestion = {
                ...questionData,
                status: 'edited',
                is_edited: true,
                edited_at: getJakartaISOString(),
                edited_by: userData.id
            };

            await updateQuestion(editingQuestion.id, updatedQuestion);

            await Promise.all([fetchQuestions(), fetchStats()]);

            setShowEditor(false);
            setEditingQuestion(null);

        } catch (error) {
            console.error('Error updating question:', error);
            setError('Failed to update question');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setShowEditor(false);
        setEditingQuestion(null);
    };

    const getQuestionStatus = (status) => {
        const statuses = {
            "active": "👀 On Review",
            "revised": "⚠ Revised",
            "edited": "✏️ Edited",
            "qc_passed": "✅ QC Passed"
        };

        return statuses[status];
    };

    if (loading && questions.length === 0) {
        return <LoadingSpinner message="Loading questions..." />;
    }

    if (error && questions.length === 0) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="questions-tab">
            <div className="questions-header">
                <h2>All Questions</h2>
                <p>View and manage all created questions</p>
            </div>

            <div className="questions-stats-data-entry">
                <div className="stat-card">
                    <div className="stat-number">
                        {statsLoading ? '...' : stats.total}
                    </div>
                    <div className="stat-label">Total Questions</div>
                </div>
                <div className="stat-card on_review">
                    <div className="stat-number">
                        {statsLoading ? '...' : stats.on_review}
                    </div>
                    <div className="stat-label">On Review</div>
                </div>
                <div className="stat-card revised">
                    <div className="stat-number">
                        {statsLoading ? '...' : stats.revised}
                    </div>
                    <div className="stat-label">Revised</div>
                </div>
                <div className="stat-card edited">
                    <div className="stat-number">
                        {statsLoading ? '...' : stats.edited}
                    </div>
                    <div className="stat-label">Edited</div>
                </div>
                <div className="stat-card qc_passed">
                    <div className="stat-number">
                        {statsLoading ? '...' : stats.qc_passed}
                    </div>
                    <div className="stat-label">QC Passed</div>
                </div>
            </div>

            <div className="questions-filters">
                <div className="search-group search-on-question">
                    <label htmlFor="search-input">Search by Package Name:</label>
                    <input
                        id="search-input"
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search by package name..."
                        className="search-input"
                    />
                </div>

                <div className="filter-group">
                    <label>Status:</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="on_review">On Review</option>
                        <option value="revised">Revised</option>
                        <option value="edited">Edited</option>
                        <option value="qc_passed">QC Passed</option>
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
                        {pics.map((pic, i) => (
                            <option key={i} value={pic}>
                                {pic}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && (
                <div className="loading-overlay">
                    <LoadingSpinner message="Loading questions..." />
                </div>
            )}

            {questions.length === 0 && !loading ? (
                <div className="empty-state">
                    <p>No questions found with the selected filters.</p>
                </div>
            ) : (
                <>
                    <PaginationComponent />
                    <div className="questions-list">
                        {questions.map((question) => (
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
                                            {getQuestionStatus(question.status)}
                                        </span>
                                    </div>
                                    <div className="question-note">
                                        {question.question_number && (
                                            <div className="question-number">
                                                Question Number #{question.question_number}
                                            </div>
                                        )}
                                        <div className="question-date">
                                            {new Date(question.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="question-content">
                                    <div className="tagging-info">
                                        <span className="tag">{question.subject.name}</span>
                                        <span className="tag">{question.chapter.name}</span>
                                        <span className="tag">{question.topic.name}</span>
                                        <span className="tag">{question.concept_title.name}</span>
                                        {question.package?.title && (
                                            <span className="tag package-tag">{question.package.title}</span>
                                        )}
                                    </div>

                                    <div className="question-preview">
                                        <p>{question.question.substring(0, 100)}...</p>
                                    </div>

                                    <div className="question-info">
                                        <span>Created by: {question.created_by?.name || 'Unknown'}</span>
                                        {question.package?.title && (
                                            <span> | Package: {question.package.title}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="question-actions">
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => handlePreview(question)}
                                    >
                                        Preview
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleEditQuestion(question)}
                                    >
                                        Edit
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

            {showEditor && editingQuestion && (
                <div className="question-editor-modal">
                    <div className="question-editor-content">
                        <QuestionEditor
                            initialData={editingQuestion}
                            onSave={handleSaveEditedQuestion}
                            onCancel={handleCancelEdit}
                            headerTitle="Edit Question"
                            showPDF={true}
                            pdfUrl={editingQuestion?.package?.public_url}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionsTab;