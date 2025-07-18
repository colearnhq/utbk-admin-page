import React, { useState, useEffect } from 'react';
import { getQCUsers, submitQCReview, releaseQuestionFromReview, getCurrentQuestion } from '../../services/supabase';
import QuestionPreview from '../data-entry/QuestionPreview';
import { useAuth } from '../../hooks/useAuth';

const QuestionReviewModal = ({ question, onClose, onSubmit, onQuestionReleased }) => {
  const { userData } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [qcUsers, setQCUsers] = useState([]);
  const [formData, setFormData] = useState({
    reviewerId: '',
    difficulty: '',
    reviewNotes: '',
    rejectionNotes: '',
    keywords: [''],
    evidenceFiles: []
  });
  const [step, setStep] = useState(1); // 1: Basic info, 2: Decision, 3: Details
  const [decision, setDecision] = useState(''); // 'accept', 'reject'
  const [loading, setLoading] = useState(false);

  const keywordOptions = [
    'Coding & Formatting Error',
    'Conceptual Error',
    'Typo/Grammar Error',
    'Answer/Explanation Mismatch',
    'Incomplete Question/Explanation',
    'Ambiguous Wording',
    'Visual/Graphical Errors'
  ];

  useEffect(() => {
    fetchQCUsers();

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleClose = () => {
    if (isClosing) return;

    if (question.qc_status === 'under_qc_review' && question.qc_reviewer_id === userData.id) {
      setShowCancelConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleCancelReview = async () => {
    setIsClosing(true);
    try {
      const { currentQuestion, fetchError } = await getCurrentQuestion(question.id);

      if (fetchError) {
        throw new Error('Failed to verify question status: ' + fetchError.message);
      }

      if (currentQuestion.qc_status !== 'under_qc_review' || currentQuestion.qc_reviewer_id !== userData.id) {
        throw new Error('This question is no longer under your review.');
      }

      await releaseQuestionFromReview(question.id, userData.id);
      console.log(`Question ${question.id} released from review.`);

      if (onQuestionReleased) {
        onQuestionReleased();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error releasing question from review:', error);
      alert(error.message || 'Failed to release question. Please try again.');
    } finally {
      setIsClosing(false);
      setShowCancelConfirmation(false);
    }
  };

  const handleContinueReview = () => {
    setShowCancelConfirmation(false);
    // Tetap di modal, tidak menutup
  };

  const handleDirectClose = () => {
    // Untuk case dimana question bukan under_qc_review oleh user saat ini
    onClose();
  };

  const fetchQCUsers = async () => {
    try {
      const users = await getQCUsers();
      setQCUsers(users);
    } catch (error) {
      console.error('Error fetching QC users:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleKeywordChange = (index, value) => {
    const newKeywords = [...formData.keywords];
    newKeywords[index] = value;
    setFormData(prev => ({
      ...prev,
      keywords: newKeywords
    }));
  };

  const addKeyword = () => {
    setFormData(prev => ({
      ...prev,
      keywords: [...prev.keywords, '']
    }));
  };

  const removeKeyword = (index) => {
    const newKeywords = formData.keywords.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      keywords: newKeywords
    }));
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setFormData(prev => ({
      ...prev,
      evidenceFiles: [...prev.evidenceFiles, ...files]
    }));
  };

  const removeFile = (index) => {
    const newFiles = formData.evidenceFiles.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      evidenceFiles: newFiles
    }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.reviewerId || !formData.difficulty) {
        alert('Please fill in all required fields');
        return;
      }
      if (formData.difficulty === 'easy') {
        setStep(3); // Skip decision step for easy questions
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      if (!decision) {
        alert('Please make a decision');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      let finalStatus = 'pending_review';
      let targetRole = null;

      if (formData.difficulty === 'easy') {
        finalStatus = 'revision_requested';
        targetRole = 'question_maker';
      } else {
        if (decision === 'accept') {
          finalStatus = 'approved';
        } else if (decision === 'reject') {
          finalStatus = 'rejected';

          const hasDataEntryKeywords = formData.keywords.some(keyword =>
            ['Coding & Formatting Error', 'Visual/Graphical Errors'].includes(keyword)
          );
          targetRole = hasDataEntryKeywords ? 'data_entry' : 'question_maker';
        }
      }

      await submitQCReview({
        questionId: question.id,
        reviewerId: formData.reviewerId,
        difficulty: formData.difficulty,
        status: finalStatus,
        reviewNotes: formData.reviewNotes,
        rejectionNotes: formData.rejectionNotes,
        keywords: formData.keywords.filter(k => k.length > 0),
        evidenceFiles: formData.evidenceFiles,
        targetRole
      });

      onSubmit();
    } catch (error) {
      console.error('Error submitting QC review:', error);
      alert('Error submitting review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="qc-form-step">
      <h3>Basic Information</h3>

      <div className="form-group">
        <label>QC Reviewer *</label>
        <select
          value={formData.reviewerId}
          onChange={(e) => handleInputChange('reviewerId', e.target.value)}
          required
        >
          <option value="">Select QC Reviewer</option>
          {qcUsers.map(user => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Question Difficulty *</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="difficulty"
              value="easy"
              checked={formData.difficulty === 'easy'}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
            />
            Easy
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="difficulty"
              value="hard"
              checked={formData.difficulty === 'hard'}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
            />
            Hard
          </label>
        </div>
      </div>

      {formData.difficulty === 'easy' && (
        <div className="form-group">
          <label>Revision Notes *</label>
          <textarea
            value={formData.reviewNotes}
            onChange={(e) => handleInputChange('reviewNotes', e.target.value)}
            placeholder="Provide notes for why this question needs revision..."
            rows="4"
            required
          />
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="qc-form-step">
      <h3>QC Decision</h3>
      <p>This question is marked as <strong>hard</strong>. What is your decision?</p>

      <div className="decision-buttons">
        <button
          className={`decision-btn accept ${decision === 'accept' ? 'active' : ''}`}
          onClick={() => setDecision('accept')}
        >
          ✅ Accept
        </button>
        <button
          className={`decision-btn reject ${decision === 'reject' ? 'active' : ''}`}
          onClick={() => setDecision('reject')}
        >
          ❌ Reject
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="qc-form-step">
      <h3>Review Details</h3>

      {formData.difficulty === 'easy' && (
        <div className="info-message">
          <p><strong>Note:</strong> Easy questions will be sent back to Question Maker for revision.</p>
        </div>
      )}

      {formData.difficulty === 'hard' && decision === 'accept' && (
        <div className="success-message">
          <p><strong>Note:</strong> This question will be approved and marked as ready.</p>
        </div>
      )}

      {formData.difficulty === 'hard' && decision === 'reject' && (
        <>
          <div className="form-group">
            <label>Rejection Notes *</label>
            <textarea
              value={formData.rejectionNotes}
              onChange={(e) => handleInputChange('rejectionNotes', e.target.value)}
              placeholder="Provide detailed notes for rejection..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Keywords *</label>
            <div className="keywords-container">
              {formData.keywords.map((keyword, index) => (
                <div key={index} className="keyword-row">
                  <select
                    value={keyword}
                    onChange={(e) => handleKeywordChange(index, e.target.value)}
                    required
                  >
                    <option value="">Select keyword</option>
                    {keywordOptions.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {formData.keywords.length > 1 && (
                    <button
                      type="button"
                      className="remove-keyword-btn"
                      onClick={() => removeKeyword(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="add-keyword-btn"
                onClick={addKeyword}
              >
                + Add Keyword
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Evidence Attachments</label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="file-input"
            />
            {formData.evidenceFiles.length > 0 && (
              <div className="file-list">
                {formData.evidenceFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => removeFile(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderCancelConfirmation = () => (
    <div className="cancel-confirmation-overlay" onClick={handleContinueReview}>
      <div className="cancel-confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚠️ Cancel Review?</h3>
          <button
            className="close-btn"
            onClick={handleContinueReview}
            disabled={isClosing}
          >
            ×
          </button>
        </div>
        <div className="modal-content">
          <p>
            Are you sure you want to cancel reviewing this question?
            This will release the question back to the available pool, allowing other reviewers to claim it.
          </p>
          {question.qc_review_started_at && (
            <p>
              <strong>Review started:</strong>
              {new Date(question.qc_review_started_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="confirmation-actions">
          <button
            className="btn btn-secondary"
            onClick={handleContinueReview}
            disabled={isClosing}
          >
            Continue Review
          </button>
          <button
            className="btn btn-danger"
            onClick={handleCancelReview}
            disabled={isClosing}
          >
            {isClosing ? 'Releasing...' : 'Yes, Cancel Review'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="question-review-modal-overlay" onClick={handleClose}>
      <div className="question-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>QC Review - {question.inhouse_id}</h2>
          <div className="modal-actions">
            <button
              className="preview-btn"
              onClick={() => setShowPreview(true)}
            >
              👁️ Preview Question
            </button>
            <button
              className="close-btn"
              onClick={handleClose}
              disabled={isClosing}
            >
              ×
            </button>
          </div>
        </div>

        <div className="modal-content">
          <div className="question-summary">
            <h3>Question Summary</h3>
            <div className="summary-grid">
              <div><strong>Subject:</strong> {question.subject_name}</div>
              <div><strong>Chapter:</strong> {question.chapter_name}</div>
              <div><strong>Topic:</strong> {question.topic_name}</div>
              <div><strong>Concept:</strong> {question.concept_title_name}</div>
              <div><strong>Type:</strong> {question.question_type}</div>
              <div><strong>Creator:</strong> {question.creator_name}</div>
            </div>
          </div>

          <div className="qc-form">
            <div className="step-indicator">
              <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Basic Info</div>
              {formData.difficulty === 'hard' && (
                <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Decision</div>
              )}
              <div className={`step ${step >= 3 ? 'active' : ''}`}>
                {formData.difficulty === 'hard' ? '3. Details' : '2. Details'}
              </div>
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </div>
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button
              className="btn btn-secondary"
              onClick={() => setStep(step - 1)}
            >
              Previous
            </button>
          )}

          {step < 3 ? (
            <button
              className="btn btn-primary"
              onClick={handleNextStep}
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          )}
        </div>
      </div>

      {showPreview && (
        <QuestionPreview
          data={question}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showCancelConfirmation && renderCancelConfirmation()}
    </div>
  );
};

export default QuestionReviewModal;