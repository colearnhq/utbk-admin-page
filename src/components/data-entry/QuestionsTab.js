import { useState, useEffect } from 'react';
import { getQuestions, getSubjects, updateQuestion } from '../../services/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import QuestionPreview from './QuestionPreview';
import QuestionEditor from './QuestionEditor';
import useQuestionEditor from '../../hooks/useQuestionEditor';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/pages/revision-tab.css';

const QuestionsTab = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
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
    const [allQuestions, setAllQuestions] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 0
    });
    const [showEditor, setShowEditor] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const { userData } = useAuth();

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [filters, pagination.currentPage, pagination.itemsPerPage]);

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
                ...(filters.status !== 'all' && { status: filters.status === 'on_review' ? 'active' : filters.status }),
                ...(filters.subject !== 'all' && { subject_id: filters.subject }),
                ...(filters.questionType !== 'all' && { question_type: filters.questionType })
            });

            setAllQuestions(allQuestionsData);

            const filteredQuestions = filters.pic === 'all'
                ? allQuestionsData
                : allQuestionsData.filter(q => q.created_by_user?.name === filters.pic);

            setQuestions(filteredQuestions);

            const totalQuestions = filteredQuestions.length;
            const onReviewCount = filteredQuestions.filter(q => q.status === 'active').length;
            const revisedCount = filteredQuestions.filter(q => q.status === 'revised').length;
            const editedCount = filteredQuestions.filter(q => q.status === 'edited').length;
            const qcPassedCount = filteredQuestions.filter(q => q.status === 'qc_passed').length;

            const paginationData = calculatePagination(
                filteredQuestions.length,
                pagination.currentPage,
                pagination.itemsPerPage
            );

            setPagination(paginationData);

            setStats({
                total: totalQuestions,
                on_review: onReviewCount,
                revised: revisedCount,
                edited: editedCount,
                qc_passed: qcPassedCount
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

    const filteredQuestions = questions;

    if (loading) return <LoadingSpinner message="Loading questions..." />;
    if (error) return <div className="error-message">{error}</div>;
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
            }

            await updateQuestion(editingQuestion.id, updatedQuestion);

            await fetchQuestions();

            setShowEditor(false);
            setEditingQuestion(null);

            console.log('Question updated successfully:', updatedQuestion);

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
        const statutes = {
            "active": "👀 On Review",
            "revised": "⚠ Revised",
            "edited": "✏️ Edited",
            "qc_passed": "✅ QC Passed"
        }

        return statutes[status];
    }

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
                <div className="stat-card on_review">
                    <div className="stat-number">{stats.on_review}</div>
                    <div className="stat-label">On Review</div>
                </div>
                <div className="stat-card revised">
                    <div className="stat-number">{stats.revised}</div>
                    <div className="stat-label">Revised</div>
                </div>
                <div className="stat-card edited">
                    <div className="stat-number">{stats.edited}</div>
                    <div className="stat-label">Edited</div>
                </div>
                <div className="stat-card qc_passed">
                    <div className="stat-number">{stats.qc_passed}</div>
                    <div className="stat-label">QC Passed</div>
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
                                            {getQuestionStatus(question.status)}
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