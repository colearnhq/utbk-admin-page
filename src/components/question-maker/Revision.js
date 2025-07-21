import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, getRevisions, updateRevisionStatus, updateQuestion, approveQuestionMakerRevision, getVendors } from '../../services/supabase';
import { uploadFileToSupabase } from '../../services/supabase-storage';
import Pagination from '../qc/Pagination';
import QuestionPreview from '../data-entry/QuestionPreview';
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
    const [showAttachment, setShowAttachment] = useState(null);

    const [showQuestionPreview, setShowQuestionPreview] = useState(false);
    const [previewQuestionData, setPreviewQuestionData] = useState(null);

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [totalInquiries, setTotalInquiries] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    const [filters, setFilters] = useState({
        vendor: '',
    });

    const [filterOptions, setFilterOptions] = useState({
        vendors: [],
    });

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const vendorsData = await getVendors();
                setFilterOptions(prev => ({ ...prev, vendors: vendorsData }));
            } catch (error) {
                console.error('Failed to fetch filter options:', error);
            }
        };

        fetchFilterOptions();
    }, []);

    useEffect(() => {
        const fetchRevisions = async () => {
            if (!userData) return;

            setLoading(true);
            setError(null);

            try {
                let fetchedRevisions;
                const baseFilters = {
                    target_role: 'question_maker',
                };

                if (filters.vendor) {
                    baseFilters.vendor = filters.vendor;
                }

                if (activeTab === 'pending') {
                    fetchedRevisions = await getRevisions({
                        ...baseFilters,
                        status: 'pending'
                    });
                } else {
                    const approvedRevisions = await getRevisions({
                        ...baseFilters,
                        status: 'approved'
                    });
                    const rejectedRevisions = await getRevisions({
                        ...baseFilters,
                        status: 'rejected'
                    });
                    const handoverRevisions = await getRevisions({
                        ...baseFilters,
                        status: 'send to data-entry'
                    });
                    fetchedRevisions = [...handoverRevisions, ...approvedRevisions, ...rejectedRevisions]
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                }
                setRevisions(fetchedRevisions);
                setTotalInquiries(fetchedRevisions.length)
            } catch (err) {
                setError(`Error fetching revisions: ${err.message}`);
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRevisions();
    }, [userData, activeTab, filters]);

    const totalPages = Math.ceil(totalInquiries / itemsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const getCurrentPageData = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return revisions.slice(startIndex, endIndex);
    };

    const handleViewAttachment = (attachment) => {
        setShowAttachment(attachment);
    };

    const getFileType = (url) => {
        const fileName = url;
        const extension = fileName.split('.').pop().toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
            return 'image';
        } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
            return 'document';
        } else {
            return 'file';
        }
    };

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

            const revision = revisions.find(r => r.id === revisionId);
            if (newStatus === 'approved' && (revision?.remarks === 'EASY_QUESTION_REVISION' || revision?.remarks === 'SEND_TO_QUESTION_MAKER')) {
                await approveQuestionMakerRevision(revisionId, responseNotes, fileData, userData.id);
            } else {
                await updateRevisionStatus(revisionId, newStatus, responseNotes, userData.id, fileData);
            }

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

    const handleQuestionPreview = (revision) => {
        if (!revision.question) return;

        const questionData = {
            ...revision.question,
            subject_name: revision.question.subject?.name || 'Unknown',
            exam: revision.question.exam || 'UTBK-SNBT'
        };

        setPreviewQuestionData(questionData);
        setShowQuestionPreview(true);
    };

    const closeQuestionPreview = () => {
        setShowQuestionPreview(false);
        setPreviewQuestionData(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const truncateText = (text, maxLength = 100) => {
        if (!text) return null;
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const renderKeywords = (keywords) => {
        if (!keywords || keywords.length === 0) return null;
        return (
            <div className="keywords-container">
                {keywords.map((keyword, index) => (
                    <span key={index} className="keyword-tag">
                        {keyword}
                    </span>
                ))}
            </div>
        );
    };

    const renderEvidenceAttachment = (revision) => {
        const hasEvidenceFile = revision.evidence_file_url;
        const hasRevisionAttachments = revision.revision_attachment_urls;

        if (!hasEvidenceFile && !hasRevisionAttachments) {
            return null;
        }

        return (
            <div className="evidence-attachments">
                {hasEvidenceFile && (
                    <a
                        href={revision.evidence_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="evidence-link"
                    >
                        Evidence File
                    </a>
                )}
                {hasRevisionAttachments && (() => {
                    try {
                        const attachments = JSON.parse(revision.revision_attachment_urls);
                        return attachments.map((attachment, index) => (
                            <a
                                key={index}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="evidence-link"
                            >
                                {attachment.name}
                            </a>
                        ));
                    } catch (e) {
                        return null;
                    }
                })()}
            </div>
        );
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            vendor: '',
        });
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

            <div className='filters-container'>
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Vendor:</label>
                        <select
                            value={filters.vendor}
                            onChange={(e) => handleFilterChange('vendor', e.target.value)}
                        >
                            <option value="">All Vendors</option>
                            {filterOptions.vendors.map(vendor => (
                                <option key={vendor.id} value={vendor.id}>
                                    {vendor.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button className="clear-filters-btn" onClick={clearFilters}>
                        Clear Filters
                    </button>
                </div>
            </div>

            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={totalInquiries}
                    itemsPerPage={itemsPerPage}
                />
            )}

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <p>Loading...</p>
            ) : (
                <table className="revision-table">
                    <thead>
                        <tr>
                            <th>Package</th>
                            <th>Vendor</th>
                            <th>Question Preview</th>
                            <th>Keywords</th>
                            <th>Previous Package</th>
                            <th>Evidence Attachment</th>
                            <th>Notes</th>
                            <th>Requested By</th>
                            <th>Status</th>
                            <th>Type</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getCurrentPageData().map(revision => (
                            <tr key={revision.id}>
                                <td>{revision.package?.title || 'N/A'}</td>
                                <td>{revision?.package?.vendor_name || 'N/A'}</td>
                                <td className="question-preview-cell">
                                    {revision.question?.question ? (
                                        <button
                                            className="btn btn-preview"
                                            onClick={() => handleQuestionPreview(revision)}
                                            title="View full question with options and solution"
                                        >
                                            Preview
                                        </button>
                                    ) : (
                                        <span className="null-value">-</span>
                                    )}
                                </td>
                                <td className="keywords-cell">
                                    {revision.keywords ? renderKeywords(revision.keywords) : <span className="null-value">-</span>}
                                </td>
                                <td className="question-package-cell">
                                    {revision.package ? <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => handleViewAttachment({
                                            url: revision?.package?.public_url,
                                            type: getFileType(revision?.package?.public_url),
                                            name: 'Question Package File'
                                        })}
                                    >
                                        View Previous Package
                                    </button> : <span className="null-value">-</span>}
                                </td>
                                <td className="evidence-cell">
                                    {renderEvidenceAttachment(revision) || <span className="null-value">-</span>}
                                </td>
                                <td>{revision.notes}</td>
                                <td>{revision.requested_by_user?.name || 'N/A'}</td>
                                <td>
                                    <span className={`status-badge ${revision.remarks === 'EASY_QUESTION_REVISION' ? 'revision-requested' : revision.status}`}>
                                        {revision.status}
                                    </span>
                                </td>
                                <td>
                                    <span className={`revision-type ${revision.remarks === 'EASY_QUESTION_REVISION' ? 'easy' : 'normal'}`}>
                                        {revision.remarks === 'EASY_QUESTION_REVISION' ? 'Easy' : 'Normal'}
                                    </span>
                                </td>
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
                                                    <strong>Revised Package:</strong>
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
                                    <span className="detail-value">{selectedRevision?.question?.inhouse_id || selectedRevision.question_id || 'N/A'}</span>
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
                                <label className="form-label">Attachment</label>
                                <div className="file-upload-area">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="file-input"
                                        id="file-upload"
                                        accept=".pdf"
                                        required
                                    />
                                    <label htmlFor="file-upload" className="file-upload-label">
                                        <div className="upload-icon">📁</div>
                                        <span>Click to upload file</span><br />
                                        <small>Only receive PDF extenstion</small>
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
                            {(selectedRevision?.remarks === 'EASY_QUESTION_REVISION' || selectedRevision?.remarks === 'SEND_TO_QUESTION_MAKER') ? (
                                <button
                                    className="btn btn-success"
                                    onClick={() => handleResponse(selectedRevision.id, 'approved')}
                                    disabled={isUploading || !responseNotes}
                                >
                                    Approve & Send to Data Entry
                                </button>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showAttachment && (
                <div className="attachment-modal">
                    <div className="attachment-modal-content">
                        <div className="attachment-modal-header">
                            <h3>Attachment: {showAttachment.name}</h3>
                            <button
                                className="btn btn-close"
                                onClick={() => setShowAttachment(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="attachment-viewer">
                            {showAttachment.type === 'image' ? (
                                <img
                                    src={showAttachment.url}
                                    alt={showAttachment.name}
                                    style={{ maxWidth: '100%', maxHeight: '80vh' }}
                                />
                            ) : showAttachment.type === 'document' ? (
                                <iframe
                                    src={showAttachment.url}
                                    title={showAttachment.name}
                                    style={{ width: '100%', height: '80vh' }}
                                />
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
            {showQuestionPreview && previewQuestionData && (
                <QuestionPreview
                    data={previewQuestionData}
                    onClose={closeQuestionPreview}
                />
            )}
        </div>
    );
};

export default Revision;
