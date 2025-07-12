import React from 'react';

const QuestionCard = ({ question, onClick, showQCStatus = false }) => {
  const getStatusBadge = (status) => {
    const badges = {
      pending_review: { text: 'Pending Review', class: 'pending' },
      under_review: { text: 'Under Review', class: 'under-review' },
      approved: { text: 'Approved', class: 'approved' },
      rejected: { text: 'Rejected', class: 'rejected' },
      revision_requested: { text: 'Revision Requested', class: 'revision' }
    };

    return badges[status] || { text: status, class: 'default' };
  };

  const getDifficultyBadge = (difficulty) => {
    if (!difficulty) return null;
    return {
      easy: { text: 'Easy', class: 'easy' },
      hard: { text: 'Hard', class: 'hard' }
    }[difficulty] || null;
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const statusBadge = getStatusBadge(question.qc_status);
  const difficultyBadge = getDifficultyBadge(question.qc_difficulty_level);

  return (
    <div className="question-card" onClick={() => onClick(question)}>
      <div className="question-header">
        <div className="question-id">
          <strong>ID:</strong> {question.inhouse_id}
        </div>
        <div className="question-badges">
          {showQCStatus && (
            <span className={`status-badge ${statusBadge.class}`}>
              {statusBadge.text}
            </span>
          )}
          {difficultyBadge && (
            <span className={`difficulty-badge ${difficultyBadge.class}`}>
              {difficultyBadge.text}
            </span>
          )}
        </div>
      </div>

      <div className="question-meta">
        <div className="meta-item">
          <strong>Subject:</strong> {question.subject_name}
        </div>
        <div className="meta-item">
          <strong>Chapter:</strong> {question.chapter_name}
        </div>
        <div className="meta-item">
          <strong>Topic:</strong> {question.topic_name}
        </div>
        <div className="meta-item">
          <strong>Concept:</strong> {question.concept_title_name}
        </div>
      </div>

      <div className="question-content">
        <div className="question-text">
          <strong>Question:</strong> {truncateText(question.question)}
        </div>
        <div className="question-type">
          <strong>Type:</strong> {question.question_type}
        </div>
      </div>

      <div className="question-footer">
        <div className="question-dates">
          <span className="created-date">
            Created: {new Date(question.created_at).toLocaleDateString()}
          </span>
          {question.qc_reviewed_at && (
            <span className="reviewed-date">
              Reviewed: {new Date(question.qc_reviewed_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="question-creator-on-qc">
          <strong>Creator:</strong> {question.creator_name}
        </div>
        {question.qc_reviewer_name && (
          <div className="question-reviewer">
            <strong>Reviewer:</strong> {question.qc_reviewer_name}
          </div>
        )}
      </div>

      <div className="question-actions">
        <span className="click-hint">Click to review</span>
      </div>
    </div>
  );
};

export default QuestionCard;