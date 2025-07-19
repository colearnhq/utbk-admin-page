import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const QuestionCard = ({ question, onClick, showQCStatus = false }) => {
  const { userData } = useAuth();

  const handleClick = () => {
    if (question.qc_status === 'under_qc_review' && question.qc_reviewer_id !== userData?.id) {
      return;
    }
    onClick(question);
  };

  const renderQCStatusBadge = () => {
    if (question.qc_status === 'under_qc_review') {
      const isMyReview = question.qc_reviewer_id === userData?.id;
      return (
        <div className={`qc-status-badge on-review ${isMyReview ? 'my-review' : 'other-review'}`}>
          <span className="badge-text">🔍 On Review</span>
          <span className="reviewer-info">
            {isMyReview ? 'By Me' : `By ${question.qc_reviewer_name || 'Unknown'}`}
          </span>
        </div>
      );
    }
    return null;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending_review: { text: 'Pending Review', class: 'pending' },
      under_qc_review: { text: 'Under QC Review', class: 'under-qc-review' },
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

  const getClickHint = () => {
    if (question.qc_status === 'under_qc_review' || question.qc_status === 'under_review') {
      if (question.qc_reviewer_id === userData?.id) {
        return 'Click to continue review';
      } else {
        return 'Currently being reviewed by another user';
      }
    };
  };

  const isClickable = () => {
    // Clickable jika bukan under_qc_review, atau jika under_qc_review oleh user saat ini
    return question.qc_status !== 'under_qc_review' || question.qc_reviewer_id === userData?.id;
  };

  const statusBadge = getStatusBadge(question.qc_status);
  const difficultyBadge = getDifficultyBadge(question.qc_difficulty_level);

  return (
    <div
      className={`question-card ${!isClickable() ? 'disabled' : ''}`}
      onClick={handleClick}
    >
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

      {renderQCStatusBadge()}

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
          {question.qc_review_started_at && (
            <span className="review-started-date">
              Review Started: {new Date(question.qc_review_started_at).toLocaleDateString()}
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
        <span className={`click-hint ${!isClickable() ? 'disabled' : ''}`}>
          {getClickHint()}
        </span>
      </div>
    </div>
  );
};

export default QuestionCard;