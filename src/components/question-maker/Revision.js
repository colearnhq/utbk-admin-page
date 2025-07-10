import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, getRevisions, updateRevisionStatus, updateQuestion } from '../../services/supabase';
import { uploadFileToSupabase } from '../../services/supabase-storage';
import '../../styles/pages/question-maker.css';

const Revision = () => {
    const { userData } = useAuth();
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');
    const [responseNotes, setResponseNotes] = useState('');
    const [selectedRevision, setSelectedRevision] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // File upload states
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    useEffect(() => {
        const fetchRevisions = async () => {
            if (!userData) return;

            setLoading(true);
            setError(null);

            try {
                const statusFilter = activeTab === 'pending' ? 'pending' : 'approved';
                const fetchedRevisions = await getRevisions({
                    target_role: 'question_maker',
                    status: statusFilter
                });
                setRevisions(fetchedRevisions);
            } catch (err) {
                setError(`Error fetching revisions: ${err.message}`);
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRevisions();
    }, [userData, activeTab]);

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (selectedFiles.length === 0) return [];

        setIsUploading(true);
        const uploadedFileData = [];

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filePath = `revision-${selectedRevision.id}/${timestamp}-${file.name}`;

                const result = await uploadFileToSupabase(
                    file,
                    'revision-evidence',
                    filePath,
                    (progress) => {
                        setUploadProgress(Math.round((i / selectedFiles.length) * 100 + progress / selectedFiles.length));
                    }
                );

                if (result.success) {
                    uploadedFileData.push({
                        name: file.name,
                        url: result.publicUrl,
                        path: result.path
                    });
                } else {
                    throw new Error(`Failed to upload ${file.name}: ${result.error}`);
                }
            }

            setUploadedFiles(uploadedFileData);
            return uploadedFileData;
        } catch (error) {
            setError(`Upload failed: ${error.message}`);
            throw error;
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleResponse = async (revisionId, newStatus) => {
        if (!responseNotes) {
            setError('Response notes are required.');
            return;
        }

        try {
            let fileData = [];
            if (selectedFiles.length > 0) {
                fileData = await uploadFiles();
            }

            await updateRevisionStatus(revisionId, newStatus, responseNotes, userData.id, fileData);
            setRevisions(revisions.filter(r => r.id !== revisionId));
            closeModal();
        } catch (err) {
            setError(`Failed to respond to revision: ${err.message}`);
        }
    };

    const openModal = (revision) => {
        setSelectedRevision(revision);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedRevision(null);
        setIsModalOpen(false);
        setResponseNotes('');
        setSelectedFiles([]);
        setUploadedFiles([]);
        setError(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="revision-container">
            <div className="revision-header">
                <h2>Revision Management</h2>
                <p>Respond to revision requests from other teams.</p>
            </div>

            <div className="tabs">
                <button
                    className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Revisions
                </button>
                <button
                    className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Revision History
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <p>Loading...</p>
            ) : (
                <table className="revision-table">
                    <thead>
                        <tr>
                            <th>Package</th>
                            <th>Question ID</th>
                            <th>Notes</th>
                            <th>Requested By</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {revisions.map(revision => (
                            <tr key={revision.id}>
                                <td>{revision.package?.title || 'N/A'}</td>
                                <td>{revision.question_id || 'N/A'}</td>
                                <td>{revision.notes}</td>
                                <td>{revision.requested_by_user?.name || 'N/A'}</td>
                                <td>{revision.status}</td>
                                <td>
                                    {activeTab === 'pending' ? (
                                        <button onClick={() => openModal(revision)}>Respond</button>
                                    ) : (
                                        <div className="response-info">
                                            <div className="response-notes">
                                                <strong>Response:</strong> {revision.response_notes || 'No response notes'}
                                            </div>
                                            {revision.revision_attachment_urls && revision.revision_attachment_urls.length > 0 && (
                                                <div className="response-attachments">
                                                    <strong>Attachments:</strong>
                                                    {JSON.parse(revision.revision_attachment_urls).map((attachment, index) => (
                                                        <a
                                                            key={index}
                                                            href={attachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="attachment-link"
                                                        >
                                                            {attachment.name}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="response-meta">
                                                <small>
                                                    Responded by: {revision.responded_by_user?.name || 'Unknown'} •
                                                    {revision.responded_at ? new Date(revision.responded_at).toLocaleDateString() : 'N/A'}
                                                </small>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {isModalOpen && selectedRevision && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3>Respond to Revision #{selectedRevision.id}</h3>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="revision-details">
                                <div className="detail-item">
                                    <span className="detail-label">Package:</span>
                                    <span className="detail-value">{selectedRevision.package?.title || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Question ID:</span>
                                    <span className="detail-value">{selectedRevision.question_id || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Original Notes:</span>
                                    <span className="detail-value">{selectedRevision.notes}</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Response Notes *</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Enter your response notes..."
                                    value={responseNotes}
                                    onChange={(e) => setResponseNotes(e.target.value)}
                                    rows="4"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Attachments (Optional)</label>
                                <div className="file-upload-area">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="file-input"
                                        id="file-upload"
                                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                                    />
                                    <label htmlFor="file-upload" className="file-upload-label">
                                        <div className="upload-icon">📁</div>
                                        <span>Click to upload files or drag and drop</span>
                                        <small>PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB each)</small>
                                    </label>
                                </div>

                                {selectedFiles.length > 0 && (
                                    <div className="selected-files">
                                        <h4>Selected Files:</h4>
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="file-item">
                                                <div className="file-info">
                                                    <span className="file-name">{file.name}</span>
                                                    <span className="file-size">{formatFileSize(file.size)}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="remove-file"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isUploading && (
                                    <div className="upload-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                        <span className="progress-text">Uploading... {uploadProgress}%</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={closeModal}
                                disabled={isUploading}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleResponse(selectedRevision.id, 'rejected')}
                                disabled={isUploading || !responseNotes}
                            >
                                Reject
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={() => handleResponse(selectedRevision.id, 'approved')}
                                disabled={isUploading || !responseNotes}
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Revision;