import React, { useState, useEffect } from 'react';
import { getQuestionsForQC, getSubjects, getQCReviewersFromQuestions, markQuestionAsUnderReview } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import QuestionCard from './QuestionCard';
import QuestionReviewModal from './QuestionReviewModal';
import Pagination from './Pagination';

const QCReviewTab = ({ status, title, excludeUnderReview = false, showOnlyMyReviews = false, onQuestionMoved }) => {
  const { userData } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [itemsPerPage] = useState(5);

  const [filters, setFilters] = useState({
    subject: '',
    qc_reviewer: '',
    search: '',
  });

  const [filterOptions, setFilterOptions] = useState({
    subjects: [],
    qcReviewers: [],
  });

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchInput
      }));
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchInput]);

  useEffect(() => {
    fetchQuestions(true);
    fetchFilterOptions();
  }, [status, filters, excludeUnderReview, showOnlyMyReviews, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, status, excludeUnderReview, showOnlyMyReviews]);

  useEffect(() => {
    setSelectedQuestion(null);
    setShowModal(false);
  }, [status, excludeUnderReview, showOnlyMyReviews]);

  const createUniqueMetadata = (values) => {
    if (!Array.isArray(values)) return [];
    return [...new Map(values.map(object => [object["name"], object])).values()];
  };

  const fetchQuestions = async (isRefresh = false) => {
    try {
      if (questions.length === 0 && !isRefresh) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }

      const data = await getQuestionsForQC(status, filters, {
        excludeUnderReview,
        showOnlyMyReviews,
        reviewerId: userData?.id,
        page: currentPage,
        limit: itemsPerPage
      });

      if (data && data.questions) {
        setQuestions(data.questions);
        setTotalQuestions(data.total);
      } else {
        setQuestions(data || []);
        setTotalQuestions(data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
      setTotalQuestions(0);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [subjects, qcReviewers] = await Promise.all([
        getSubjects(),
        getQCReviewersFromQuestions(),
      ]);

      setFilterOptions({
        subjects: subjects || [],
        qcReviewers: qcReviewers || [],
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
      setFilterOptions({
        subjects: [],
        qcReviewers: [],
      });
    }
  };

  const handleQuestionClick = async (question) => {
    try {
      if ((question.qc_status === 'under_qc_review' || question.qc_status === 'under_review') && question.qc_reviewer_id !== userData.id) {
        alert(`This question is currently being reviewed by ${question.qc_reviewer_name}`);
        return;
      }

      if ((question.qc_status === 'under_qc_review' || question.qc_status === 'under_review') && question.qc_reviewer_id === userData.id) {
        setSelectedQuestion(question);
        setShowModal(true);
        return;
      }

      if (status === 'pending_review' && excludeUnderReview) {
        const updatedQuestion = await markQuestionAsUnderReview(question.id, userData.id);

        const questionWithReviewer = {
          ...question,
          qc_status: 'under_qc_review',
          qc_reviewer_id: userData.id,
          qc_reviewer_name: userData.name,
          qc_review_started_at: updatedQuestion.qc_review_started_at
        };

        setSelectedQuestion(questionWithReviewer);
        setShowModal(true);

        await fetchQuestions();

        if (onQuestionMoved) {
          onQuestionMoved('moved_to_under_review');
        }
      } else {
        const canShowModal = status === 'pending_review' || status === 'under_qc_review' || status === 'under_review';

        if (canShowModal) {
          setSelectedQuestion(question);
          setShowModal(true);
        } else {
          console.log('Modal tidak tersedia untuk status ini:', status);
        }
      }
    } catch (error) {
      console.error('Error handling question click:', error);
      alert('Failed to start review. Question may have already been taken by another reviewer.');
      await fetchQuestions();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedQuestion(null);
  };

  const handleQCSubmit = async () => {
    setShowModal(false);
    setSelectedQuestion(null);
    await fetchQuestions();

    if (onQuestionMoved) {
      onQuestionMoved('submitted');
    }
  };

  const handleQuestionReleased = async () => {
    setShowModal(false);
    setSelectedQuestion(null);
    await fetchQuestions();

    if (onQuestionMoved) {
      onQuestionMoved('released');
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getActiveFilters = () => {
    const activeFilters = [];

    if (filters.subject) {
      const subject = filterOptions.subjects.find(s => s.id === filters.subject);
      activeFilters.push({
        key: 'subject',
        label: `Subject: ${subject?.name || filters.subject}`,
        value: filters.subject
      });
    }

    if (filters.qc_reviewer) {
      const reviewer = filterOptions.qcReviewers.find(r => r.id === filters.qc_reviewer);
      activeFilters.push({
        key: 'qc_reviewer',
        label: `Reviewer: ${reviewer?.name || filters.qc_reviewer}`,
        value: filters.qc_reviewer
      });
    }

    if (filters.search) {
      activeFilters.push({
        key: 'search',
        label: `Search: ${filters.search}`,
        value: filters.search
      });
    }

    return activeFilters;
  };

  const removeFilter = (filterKey) => {
    if (filterKey === 'search') {
      setSearchInput('');
    }
    setFilters(prev => ({
      ...prev,
      [filterKey]: ''
    }));
  };

  const clearFilters = () => {
    setFilters({
      subject: '',
      qc_reviewer: '',
      search: '',
    });
    setSearchInput('');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getDescription = () => {
    if (status === 'pending_review' && excludeUnderReview) {
      return 'New questions available for review. Click to start reviewing.';
    }
    if (status === 'under_qc_review') {
      return 'Questions that are currently reviewing.';
    }
    if (Array.isArray(status) && status.includes('revision_requested') && status.includes('rejected')) {
      return 'Questions that were sent back to Question Maker or rejected but not yet revised';
    }
    if (status === 'under_review') {
      return 'Questions that have been recreated by Data Entry and need re-review';
    }
    if (status === 'approved') {
      return 'Questions that have been approved by QC';
    }
    return 'Questions awaiting QC review';
  };

  const totalPages = Math.ceil(totalQuestions / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalQuestions);

  if (initialLoading) {
    return <div className="loading">Loading questions...</div>;
  }

  return (
    <div className="qc-review-tab">
      <div className="tab-header">
        <h2>{title}</h2>
        <p className="tab-description">{getDescription()}</p>
      </div>

      <div className="filters-container">
        <div className="search-bar">
          <label htmlFor="search-input">Search:</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by Question ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Subject:</label>
            <select
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {status !== "pending_review" && <div className="filter-group">
            <label>QC Reviewer:</label>
            <select
              value={filters.qc_reviewer}
              onChange={(e) => handleFilterChange('qc_reviewer', e.target.value)}
            >
              <option value="">All Reviewers</option>
              {filterOptions.qcReviewers.map(reviewer => (
                <option key={reviewer.id} value={reviewer.id}>
                  {reviewer.name}
                </option>
              ))}
            </select>
          </div>}

          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        {getActiveFilters().length > 0 && (
          <div className="active-filters">
            {getActiveFilters().map((filter) => (
              <span key={filter.key} className="filter-badge">
                {filter.label}
                <span
                  className="filter-badge-remove"
                  onClick={() => removeFilter(filter.key)}
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={totalQuestions}
          itemsPerPage={itemsPerPage}
        />
      )}

      <div className="questions-list">
        {questions.length === 0 ? (
          <div className="empty-state">
            <p>No questions found for this filter.</p>
          </div>
        ) : (
          questions.map(question => (
            <QuestionCard
              key={question.id}
              question={question}
              onClick={handleQuestionClick}
              showQCStatus={true}
            />
          ))
        )}
      </div>

      {
        showModal && selectedQuestion && (
          status === 'pending_review' ||
          status === 'under_qc_review' ||
          status === 'under_review'
        ) && (
          <QuestionReviewModal
            question={selectedQuestion}
            onClose={handleCloseModal}
            onSubmit={handleQCSubmit}
            onQuestionReleased={handleQuestionReleased}
          />
        )
      }
    </div>
  );
};

export default QCReviewTab;