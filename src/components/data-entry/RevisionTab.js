import { useState, useEffect } from 'react';
import { getRevisionRequests, getRevisionAcceptances, updateRevisionRequest, updateRevisionAcceptance, getRevisionsByUser, getRevisionsByTargetRole } from '../../services/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import QuestionForm from './QuestionForm';
import QuestionPreview from './QuestionPreview';
import { useAuth } from '../../hooks/useAuth';

const RevisionTab = () => {
    const [activeTab, setActiveTab] = useState('request');
    const [revisionRequests, setRevisionRequests] = useState([]);
    const [revisionAcceptances, setRevisionAcceptances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [showAttachment, setShowAttachment] = useState(null);
    const { userData } = useAuth();

    const currentUserId = userData.id;

    useEffect(() => {
        fetchRevisionData();
    }, [activeTab]);

    const fetchRevisionData = async () => {
        try {
            setLoading(true);
            if (activeTab === 'request') {
                const data = await getRevisionsByUser(currentUserId, { revision_type: 'request' });
                setRevisionRequests(data);
            } else {
                const data = await getRevisionsByTargetRole('question_maker', { revision_type: 'acceptance' });
                setRevisionAcceptances(data);
            }
        } catch (err) {
            setError(`Failed to fetch revision ${activeTab}s`);
            console.error(`Error fetching revision ${activeTab}s:`, err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditItem = (item) => {
        setEditingItem(item);
    };

    const handleUpdateItem = async (formData) => {
        try {
            if (activeTab === 'request') {
                await updateRevisionRequest(editingItem.id, formData);
            } else {
                // For acceptance, update the original question
                const updateData = {
                    ...formData,
                    status: 'active',
                    revision_notes: null,
                    revised_by: null,
                    revised_at: null
                };
                await updateRevisionAcceptance(editingItem.id, updateData);
            }

            alert(`${activeTab === 'request' ? 'Request' : 'Question'} updated successfully!`);
            setEditingItem(null);
            fetchRevisionData();
        } catch (error) {
            console.error(`Error updating ${activeTab}:`, error);
            alert(`Failed to update ${activeTab}. Please try again.`);
        }
    };

    const handlePreview = (formData) => {
        setPreviewData(formData);
        setShowPreview(true);
    };

    const handleViewAttachment = (attachment) => {
        setShowAttachment(attachment);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'orange';
            case 'in_progress': return 'blue';
            case 'completed': return 'green';
            case 'rejected': return 'red';
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

    if (loading) return <LoadingSpinner message={`Loading revision ${activeTab}s...`} />;
    if (error) return <div className="error-message">{error}</div>;

    // Edit mode for acceptance items
    if (editingItem && activeTab === 'acceptance') {
        return (
            <div className="revision-edit">
                <div className="edit-header">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setEditingItem(null)}
                    >
                        ← Back to Revisions
                    </button>
                    <div className="question-info">
                        <h3>Edit Question: {editingItem.question.inhouse_id}</h3>
                        <div className="revision-notes">
                            <strong>Issue Notes:</strong> {editingItem.notes}
                        </div>
                    </div>
                </div>

                <QuestionForm
                    initialData={{
                        exam: 'UTBK-SNBT',
                        subject_id: editingItem.question.subject.id,
                        chapter_id: editingItem.question.chapter.id,
                        topic_id: editingItem.question.topic.id,
                        concept_title_id: editingItem.question.concept_title.id,
                        question_type: editingItem.question.question_type,
                        question: editingItem.question.question,
                        option_a: editingItem.question.option_a,
                        option_b: editingItem.question.option_b,
                        option_c: editingItem.question.option_c,
                        option_d: editingItem.question.option_d,
                        option_e: editingItem.question.option_e,
                        correct_option: editingItem.question.correct_option,
                        correct_answer: editingItem.question.correct_answer,
                        solution: editingItem.question.solution
                    }}
                    onSubmit={handleUpdateItem}
                    onPreview={handlePreview}
                />

                {showPreview && (
                    <QuestionPreview
                        data={previewData}
                        onClose={() => setShowPreview(false)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="revision-tab">
            <div className="revision-header">
                <h2>Revision Management</h2>
                <div className="tab-selector">
                    <button
                        className={`tab-button ${activeTab === 'request' ? 'active' : ''}`}
                        onClick={() => setActiveTab('request')}
                    >
                        Requests ({revisionRequests.length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'acceptance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('acceptance')}
                    >
                        Acceptances ({revisionAcceptances.length})
                    </button>
                </div>
            </div>

            {activeTab === 'request' ? (
                <div className="request-section">
                    <div className="section-description">
                        <p>Monitor progress of revision requests submitted to other teams</p>
                    </div>

                    {revisionRequests.length === 0 ? (
                        <div className="empty-state">
                            <p>No revision requests found.</p>
                        </div>
                    ) : (
                        <div className="revision-list">
                            {revisionRequests.map((request) => (
                                <div key={request.id} className="revision-card request-card">
                                    <div className="revision-card-header">
                                        <div className="request-meta">
                                            <span className="request-id">#{request.id}</span>
                                            <span
                                                className={`status-badge ${getStatusColor(request.status)}`}
                                            >
                                                {request.status}
                                            </span>
                                        </div>
                                        <div className="request-date">
                                            Submitted: {new Date(request.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="revision-content">
                                        <div className="request-info">
                                            <div className="info-item">
                                                <strong>Question ID:</strong> {request.question?.inhouse_id || 'N/A'}
                                            </div>
                                            <div className="info-item">
                                                <strong>Subject:</strong> {request.question?.subject?.name || 'N/A'}
                                            </div>
                                            <div className="info-item">
                                                <strong>Target Role:</strong> {request.target_role}
                                            </div>
                                            <div className="info-item">
                                                <strong>Package:</strong> {request.package?.name || 'N/A'}
                                            </div>
                                        </div>

                                        <div className="request-description">
                                            <h4>Request Notes:</h4>
                                            <p>{request.notes}</p>
                                        </div>

                                        {request.response_notes && (
                                            <div className="request-response">
                                                <h4>Response:</h4>
                                                <p>{request.response_notes}</p>
                                                <small>
                                                    Responded by: {request.responded_by_user?.name || 'Unknown'} on {new Date(request.responded_at).toLocaleDateString()}
                                                </small>
                                            </div>
                                        )}

                                        {request.evidence_file_url && (
                                            <div className="attachment-section">
                                                <h4>Evidence:</h4>
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    onClick={() => handleViewAttachment({
                                                        url: request.evidence_file_url,
                                                        type: request.attachment_type,
                                                        name: request.attachment_name
                                                    })}
                                                >
                                                    View Evidence
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="revision-actions">
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => handlePreview({
                                                ...request.question,
                                                subject_id: request.question?.subject?.id,
                                                chapter_id: request.question?.chapter?.id,
                                                topic_id: request.question?.topic?.id,
                                                concept_title_id: request.question?.concept_title?.id
                                            })}
                                            disabled={!request.question}
                                        >
                                            Preview Question
                                        </button>
                                        {request.status === 'pending' && (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleEditItem(request)}
                                            >
                                                Edit Request
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="acceptance-section">
                    <div className="section-description">
                        <p>Handle revision requests received from other teams</p>
                    </div>

                    {revisionAcceptances.length === 0 ? (
                        <div className="empty-state">
                            <p>No revision acceptances found.</p>
                        </div>
                    ) : (
                        <div className="revision-list">
                            {revisionAcceptances.map((acceptance) => (
                                <div key={acceptance.id} className="revision-card acceptance-card">
                                    <div className="revision-card-header">
                                        <div className="acceptance-meta">
                                            <span className="question-id">{acceptance.question.inhouse_id}</span>
                                            <span
                                                className={`question-type ${getQuestionTypeColor(acceptance.question.question_type)}`}
                                            >
                                                {acceptance.question.question_type}
                                            </span>
                                        </div>
                                        <div className="acceptance-date">
                                            Received: {new Date(acceptance.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="revision-content">
                                        <div className="tagging-info">
                                            <div className="tag-item">
                                                <strong>Subject:</strong> {acceptance.question.subject.name}
                                            </div>
                                            <div className="tag-item">
                                                <strong>Chapter:</strong> {acceptance.question.chapter.name}
                                            </div>
                                            <div className="tag-item">
                                                <strong>Topic:</strong> {acceptance.question.topic.name}
                                            </div>
                                            <div className="tag-item">
                                                <strong>Concept:</strong> {acceptance.question.concept_title.name}
                                            </div>
                                        </div>

                                        <div className="keyword-section">
                                            <h4>Keywords:</h4>
                                            <div className="keyword-tags">
                                                {acceptance.keywords?.map((keyword, index) => (
                                                    <span key={index} className="keyword-tag">
                                                        {keyword}
                                                    </span>
                                                )) || <span className="no-keywords">No keywords</span>}
                                            </div>
                                        </div>

                                        <div className="question-preview">
                                            <h4>Question:</h4>
                                            <p>{acceptance.question.question}</p>
                                        </div>

                                        <div className="rejection-notes">
                                            <h4>Issue Notes:</h4>
                                            <p>{acceptance.notes}</p>
                                            <small>Reported by: {acceptance.requested_by_user?.name || 'Unknown'}</small>
                                        </div>

                                        {acceptance.evidence_file_url && (
                                            <div className="attachment-section">
                                                <h4>Evidence:</h4>
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    onClick={() => handleViewAttachment({
                                                        url: acceptance.evidence_file_url,
                                                        type: acceptance.attachment_type,
                                                        name: acceptance.attachment_name
                                                    })}
                                                >
                                                    View Evidence
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="revision-actions">
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => handlePreview({
                                                ...acceptance.question,
                                                subject_id: acceptance.question.subject.id,
                                                chapter_id: acceptance.question.chapter.id,
                                                topic_id: acceptance.question.topic.id,
                                                concept_title_id: acceptance.question.concept_title.id
                                            })}
                                        >
                                            Preview
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleEditItem(acceptance)}
                                        >
                                            Edit Question
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Attachment Viewer Modal */}
            {showAttachment && (
                <div className="attachment-modal">
                    <div className="attachment-modal-content">
                        <div className="attachment-modal-header">
                            <h3>Attachment</h3>
                            <button
                                className="btn btn-close"
                                onClick={() => setShowAttachment(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="attachment-viewer">
                            {showAttachment.type === 'image' ? (
                                <img src={showAttachment.url} alt="Attachment" />
                            ) : showAttachment.type === 'document' ? (
                                <iframe src={showAttachment.url} title="Document" />
                            ) : (
                                <div className="attachment-info">
                                    <p>File: {showAttachment.name}</p>
                                    <a href={showAttachment.url} target="_blank" rel="noopener noreferrer">
                                        Open in new tab
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Question Preview Modal */}
            {showPreview && (
                <QuestionPreview
                    data={previewData}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
};

export default RevisionTab;