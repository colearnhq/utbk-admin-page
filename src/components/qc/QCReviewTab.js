import React, { useState, useEffect } from 'react';
import { getQuestionsForQC, getSubjects, getChapters, getTopics } from '../../services/supabase';
import QuestionCard from './QuestionCard';
import QuestionReviewModal from './QuestionReviewModal';

const QCReviewTab = ({ status, title }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    subject: '',
    chapter: '',
    topic: ''
  });
  
  const [filterOptions, setFilterOptions] = useState({
    subjects: [],
    chapters: [],
    topics: []
  });

  useEffect(() => {
    fetchQuestions();
    fetchFilterOptions();
  }, [status, filters]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await getQuestionsForQC(status, filters);
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [subjects, chapters, topics] = await Promise.all([
        getSubjects(),
        getChapters(),
        getTopics()
      ]);
      
      setFilterOptions({
        subjects,
        chapters,
        topics
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleQuestionClick = (question) => {
    setSelectedQuestion(question);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedQuestion(null);
  };

  const handleQCSubmit = async () => {
    setShowModal(false);
    setSelectedQuestion(null);
    await fetchQuestions(); // Refresh the list
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      subject: '',
      chapter: '',
      topic: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading questions...</div>;
  }

  return (
    <div className="qc-review-tab">
      <div className="tab-header">
        <h2>{title}</h2>
        <p className="tab-description">
          {status === 'pending_review' && 'New questions from Data Entry team awaiting QC review'}
          {status === 'revision_requested' && 'Questions marked for revision that need re-review'}
          {status === 'under_review' && 'Questions currently being reviewed'}
          {status === 'approved' && 'Questions that have been approved by QC'}
        </p>
      </div>

      <div className="filters-container">
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

          <div className="filter-group">
            <label>Chapter:</label>
            <select
              value={filters.chapter}
              onChange={(e) => handleFilterChange('chapter', e.target.value)}
            >
              <option value="">All Chapters</option>
              {filterOptions.chapters
                .filter(chapter => !filters.subject || chapter.subject_id === filters.subject)
                .map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Topic:</label>
            <select
              value={filters.topic}
              onChange={(e) => handleFilterChange('topic', e.target.value)}
            >
              <option value="">All Topics</option>
              {filterOptions.topics
                .filter(topic => !filters.chapter || topic.chapter_id === filters.chapter)
                .map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
            </select>
          </div>

          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      <div className="questions-stats">
        <span className="questions-count">
          Showing {questions.length} question{questions.length !== 1 ? 's' : ''}
        </span>
      </div>

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

      {showModal && selectedQuestion && (
        <QuestionReviewModal
          question={selectedQuestion}
          onClose={handleCloseModal}
          onSubmit={handleQCSubmit}
        />
      )}
    </div>
  );
};

export default QCReviewTab;