import { useState, useEffect, useMemo } from 'react';
import { getRevisionRequests, getRevisionAcceptances, updateRevisionRequest, updateRevisionAcceptance, getRevisionsByUser, getRevisionsByTargetRole } from '../../services/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import QuestionForm from './QuestionForm';
import QuestionPreview from './QuestionPreview';
import PDFViewer from './PDFViewer';
import Pagination from '../qc/Pagination';
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
    const [pdfWidth, setPdfWidth] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [picFilter, setPicFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [allRevisionRequests, setAllRevisionRequests] = useState([]);
    const [allRevisionAcceptances, setAllRevisionAcceptances] = useState([]);
    const { userData } = useAuth();
    const ITEMS_PER_PAGE = 5;
    const currentUserId = userData.id;

    const getFilteredRequests = () => {
        let filtered = allRevisionRequests;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(request => request.status === statusFilter);
        }

        return filtered;
    };

    const getFilteredAcceptances = () => {
        let filtered = allRevisionAcceptances;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(acceptance => acceptance.status === statusFilter);
        }

        if (picFilter !== 'all') {
            filtered = filtered.filter(acceptance => {
                const picName = acceptance.question?.created_by_user?.name;
                return picName === picFilter;
            });
        }

        return filtered;
    };

    const filteredRequests = useMemo(() => getFilteredRequests(), [allRevisionRequests, statusFilter]);
    const filteredAcceptances = useMemo(() => getFilteredAcceptances(), [allRevisionAcceptances, statusFilter, picFilter]);

    const paginatedFilteredRequests = useMemo(() =>
        filteredRequests.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        ),
        [filteredRequests, currentPage]
    );

    const paginatedFilteredAcceptances = useMemo(() =>
        filteredAcceptances.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        ),
        [filteredAcceptances, currentPage]
    );

    const totalFilteredRequests = filteredRequests.length;
    const totalFilteredAcceptances = filteredAcceptances.length;

    const getAvailableStatuses = (data) => {
        const statuses = [...new Set(data.map(item => item.status))];
        return statuses.sort();
    };

    const getAvailablePICs = (data) => {
        const pics = [...new Set(data.map(item => item.question.created_by_user.name))];
        return pics.sort();
    }

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setStatusFilter('all');
        setPicFilter('all');
    };

    const clearAllFilters = () => {
        setStatusFilter('all');
        setPicFilter('all');
    };

    const RequestFilterSection = ({ data, filteredData, onStatusFilterChange, currentStatusFilter }) => {
        const availableStatuses = getAvailableStatuses(data);
        const hasActiveFilters = currentStatusFilter !== 'all';
        return (
            <div className="filter-section">
                <div className="filter-controls">
                    <div className="filter-group">
                        <label htmlFor="status-filter">Filter by Status:</label>
                        <select
                            id="status-filter"
                            value={currentStatusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Statuses</option>
                            {availableStatuses.map(status => (
                                <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="filter-results">
                    <span className="results-count">
                        Showing {filteredData.length} of {data.length} questions
                    </span>
                    {hasActiveFilters && (
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => onStatusFilterChange('all')}
                            style={{ marginLeft: '10px' }}
                        >
                            Clear Filter
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const AcceptanceFilterSection = ({ data, filteredData, onStatusFilterChange, onPicFilterChange, currentStatusFilter, currentPicFilter }) => {
        const availableStatuses = getAvailableStatuses(data);
        const availablePICs = getAvailablePICs(data);
        const hasActiveFilters = currentStatusFilter !== 'all' || currentPicFilter !== 'all';

        return (
            <div className="filter-section">
                <div className="filter-controls">
                    <div className="filter-group">
                        <label htmlFor="status-filter">Filter by Status:</label>
                        <select
                            id="status-filter"
                            value={currentStatusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Statuses</option>
                            {availableStatuses.map(status => (
                                <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="pic-filter">Filter by PIC:</label>
                        <select
                            id="pic-filter"
                            value={currentPicFilter}
                            onChange={(e) => onPicFilterChange(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All PICs</option>
                            {availablePICs.map(pic => (
                                <option key={pic} value={pic}>
                                    {pic}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="filter-results">
                    <span className="results-count">
                        Showing {filteredData.length} of {data.length} questions
                    </span>
                    {hasActiveFilters && (
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={clearAllFilters}
                            style={{ marginLeft: '10px' }}
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            </div>
        );
    };

    useEffect(() => {
        fetchAllRevisionData();
    }, []);

    const fetchAllRevisionData = async () => {
        try {
            setLoading(true);

            const [requestsData, acceptancesData] = await Promise.all([
                getRevisionsByUser(currentUserId, { revision_type: 'request' }),
                getRevisionsByTargetRole('data_entry', { revision_type: ['acceptance', 'recreation'] })
            ]);

            setAllRevisionRequests(requestsData);
            setAllRevisionAcceptances(acceptancesData);
            setRevisionRequests(requestsData.slice(0, ITEMS_PER_PAGE));
            setRevisionAcceptances(acceptancesData.slice(0, ITEMS_PER_PAGE));
            setTotalItems(activeTab === 'request' ? requestsData.length : acceptancesData.length);

        } catch (err) {
            setError('Failed to fetch revision data');
            console.error('Error fetching revision data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRevisionData = async () => {
        try {
            setLoading(true);

            if (activeTab === 'request') {
                const from = (currentPage - 1) * ITEMS_PER_PAGE;
                const to = from + ITEMS_PER_PAGE - 1;

                const data = await getRevisionsByUser(currentUserId, {
                    revision_type: 'request'
                }, { from, to });

                setRevisionRequests(data);
                setTotalItems(allRevisionRequests.length);
            } else {
                const from = (currentPage - 1) * ITEMS_PER_PAGE;
                const to = from + ITEMS_PER_PAGE - 1;

                const data = await getRevisionsByTargetRole('data_entry', {
                    revision_type: ['acceptance', 'recreation']
                }, { from, to });

                setRevisionAcceptances(data);
                setTotalItems(allRevisionAcceptances.length);
            }
        } catch (err) {
            setError(`Failed to fetch revision ${activeTab}s`);
            console.error(`Error fetching revision ${activeTab}s:`, err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentPage === 1) return;
        fetchRevisionData();
    }, [currentPage]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    useEffect(() => {
        setCurrentPage(1);
        fetchRevisionData();
    }, [statusFilter, picFilter, activeTab]);

    const hasPendingAcceptances = () => {
        return revisionAcceptances.some(acceptance => acceptance.status === 'pending');
    };

    const handleEditItem = (item) => {
        setEditingItem(item);
    };

    const handleUpdateItem = async (formData) => {
        try {
            if (activeTab === 'request') {
                await updateRevisionRequest(editingItem.id, formData);
            } else {
                const updateData = {
                    ...formData,
                    status: 'active',
                    revision_notes: null,
                    revised_by: null,
                    revised_at: null
                };
                await updateRevisionAcceptance(editingItem.id, updateData, currentUserId);
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

    const handleMouseDown = (e) => {
        setIsDragging(true);
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const container = e.currentTarget.closest('.revision-edit');
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newWidth = (x / rect.width) * 100;

        const constrainedWidth = Math.max(20, Math.min(80, newWidth));
        setPdfWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleViewAttachment = (attachment) => {
        setShowAttachment(attachment);
    };

    const parseAttachmentUrls = (attachmentUrls) => {
        if (!attachmentUrls) return [];

        try {
            if (Array.isArray(attachmentUrls)) {
                return attachmentUrls;
            }

            if (typeof attachmentUrls === 'string') {
                return JSON.parse(attachmentUrls);
            }

            return [];
        } catch (error) {
            console.error('Error parsing attachment URLs:', error);
            return [];
        }
    };

    const getFileType = (url, name) => {
        const fileName = name || url;
        const extension = fileName.split('.').pop().toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
            return 'image';
        } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
            return 'document';
        } else {
            return 'file';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'orange';
            case 'approved': return 'blue';
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

    const getRevisionStatusColor = (type) => {
        switch (type) {
            case 'approved': return 'blue';
            case 'completed': return 'green';
            case 'pending': return 'orange';
            default: return 'gray';
        }
    };

    if (loading) return <LoadingSpinner message={`Loading revision ${activeTab}s...`} />;
    if (error) return <div className="error-message">{error}</div>;

    const getAttachmentUrl = () => {
        try {
            const urls = JSON.parse(editingItem?.revision_attachment_urls || '[]');

            if (urls.length === 0 || !urls[0]?.url) {
                return editingItem?.package?.public_url || null;
            }

            return urls[0].url;

        } catch (error) {
            console.error('Error parsing revision attachment URLs:', error);
            return editingItem?.package?.public_url || null;
        }
    };
    const attachmentUrl = getAttachmentUrl();
    if (editingItem && activeTab === 'acceptance') {
        return (
            <div
                className="revision-edit"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
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
                    {attachmentUrl && <div className="creator-actions">
                        <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline"
                        >
                            📥 Download PDF
                        </a>
                    </div>}
                </div>

                <div className="creator-content">
                    {attachmentUrl && <div
                        className="pdf-section"
                        style={{ width: `${pdfWidth}%` }}
                    >
                        <PDFViewer url={attachmentUrl} />
                    </div>}

                    <div
                        className="resize-handle"
                        onMouseDown={handleMouseDown}
                        style={{ cursor: isDragging ? 'ew-resize' : 'col-resize' }}
                    >
                        <div className="resize-line"></div>
                    </div>

                    <div
                        className="form-section"
                        style={{ width: `${100 - pdfWidth}%` }}
                    >
                        <div className="form-container">
                            <h3>Edit Question</h3>
                            <QuestionForm
                                initialData={{
                                    exam: 'UTBK-SNBT',
                                    subject_id: editingItem.question.subject.id,
                                    chapter_id: editingItem.question.chapter.id,
                                    topic_id: editingItem.question.topic.id,
                                    concept_title_id: editingItem.question.concept_title.id,
                                    question_type: editingItem.question.question_type,
                                    question_number: editingItem.question.question_number,
                                    question: editingItem.question.question,
                                    option_a: editingItem.question.option_a,
                                    option_b: editingItem.question.option_b,
                                    option_c: editingItem.question.option_c,
                                    option_d: editingItem.question.option_d,
                                    option_e: editingItem.question.option_e,
                                    correct_option: editingItem.question.correct_option,
                                    correct_answer: editingItem.question.correct_answer,
                                    solution: editingItem.question.solution,
                                    question_attachments: editingItem.question.question_attachments || [],
                                    solution_attachments: editingItem.question.solution_attachments || []
                                }}
                                onSubmit={handleUpdateItem}
                                onPreview={handlePreview}
                            />
                        </div>
                    </div>
                </div>

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
                        onClick={() => handleTabChange('request')}
                    >
                        Requests ({allRevisionRequests.length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'acceptance' ? 'active' : ''}`}
                        onClick={() => handleTabChange('acceptance')}
                        style={{ position: 'relative' }}
                    >
                        Acceptances ({allRevisionAcceptances.length})
                        {hasPendingAcceptances() && activeTab !== 'acceptance' && (
                            <span
                                className="pending-indicator"
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: '#ff4444',
                                    borderRadius: '50%',
                                    border: '1px solid white'
                                }}
                            />
                        )}
                    </button>
                </div>
            </div>

            {activeTab === 'request' ? (
                <div className="request-section">
                    <div className="section-description">
                        <p>Monitor progress of revision requests submitted to other teams</p>
                    </div>

                    <RequestFilterSection
                        data={allRevisionRequests}
                        filteredData={filteredRequests}
                        onStatusFilterChange={setStatusFilter}
                        currentStatusFilter={statusFilter}
                    />

                    {filteredRequests.length === 0 ? (
                        <div className="empty-state">
                            <p>
                                {statusFilter === 'all'
                                    ? 'No revision requests found.'
                                    : `No revision requests with status "${statusFilter}" found.`
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(totalFilteredRequests / ITEMS_PER_PAGE)}
                                onPageChange={handlePageChange}
                                totalItems={totalFilteredRequests}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                            <div className="revision-list">
                                {paginatedFilteredRequests.map((request) => {
                                    const attachments = parseAttachmentUrls(request.revision_attachment_urls);

                                    return (
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
                                                        <strong>Subject:</strong> {request.question?.subject?.name || request.package?.subject || 'N/A'}
                                                    </div>
                                                    <div className="info-item">
                                                        <strong>Target Role:</strong> {request.target_role}
                                                    </div>
                                                    <div className="info-item">
                                                        <strong>Package:</strong> {request.package?.title || 'N/A'}
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

                                                {request.remarks && (
                                                    <div className="request-remarks">
                                                        <h4>Remarks:</h4>
                                                        <p>{request.remarks}</p>
                                                    </div>
                                                )}

                                                {(request.evidence_file_url || attachments.length > 0) && (
                                                    <div className="attachment-section">
                                                        <h4>Evidence:</h4>
                                                        <div className="attachment-list">
                                                            {/* Legacy single attachment */}
                                                            {request.evidence_file_url && !attachments.length && (
                                                                <button
                                                                    className="btn btn-outline btn-sm"
                                                                    onClick={() => handleViewAttachment({
                                                                        url: request.evidence_file_url,
                                                                        type: getFileType(request.evidence_file_url),
                                                                        name: 'Evidence File'
                                                                    })}
                                                                >
                                                                    View Evidence
                                                                </button>
                                                            )}

                                                            {/* New multiple attachments */}
                                                            {attachments.map((attachment, index) => (
                                                                <button
                                                                    key={index}
                                                                    className="btn btn-outline btn-sm"
                                                                    onClick={() => handleViewAttachment({
                                                                        url: attachment.url,
                                                                        type: getFileType(attachment.url, attachment.name),
                                                                        name: attachment.name
                                                                    })}
                                                                >
                                                                    {attachment.name}
                                                                </button>
                                                            ))}
                                                        </div>
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
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="acceptance-section">
                    <div className="section-description">
                        <p>Handle revision requests received from other teams</p>
                    </div>

                    <AcceptanceFilterSection
                        data={allRevisionAcceptances}
                        filteredData={filteredAcceptances}
                        onStatusFilterChange={setStatusFilter}
                        onPicFilterChange={setPicFilter}
                        currentStatusFilter={statusFilter}
                        currentPicFilter={picFilter}
                    />

                    {filteredAcceptances.length === 0 ? (
                        <div className="empty-state">
                            <p>
                                {statusFilter === 'all' && picFilter === 'all'
                                    ? 'No revision acceptances found.'
                                    : `No revision acceptances with status "${statusFilter}" found.`
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(totalFilteredAcceptances / ITEMS_PER_PAGE)}
                                onPageChange={handlePageChange}
                                totalItems={totalFilteredAcceptances}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                            <div className="revision-list">
                                {paginatedFilteredAcceptances.map((acceptance) => {
                                    const attachments = parseAttachmentUrls(acceptance.revision_attachment_urls);

                                    return (
                                        <div key={acceptance.id} className="revision-card acceptance-card">
                                            <div className="revision-card-header">
                                                <div className="acceptance-meta">
                                                    <span className="question-id">{acceptance.question.inhouse_id}</span>
                                                    <span
                                                        className={`question-type-on-data-entry ${getQuestionTypeColor(acceptance.question.question_type)}`}
                                                    >
                                                        {acceptance.question.question_type}
                                                    </span>
                                                    <span
                                                        className={`revision-status-type-on-data-entry ${getRevisionStatusColor(acceptance.status)}`}
                                                    >
                                                        {String(acceptance.status).toUpperCase()}
                                                    </span>
                                                    <span
                                                        className={`pic-question`}
                                                    >
                                                        {`question created by: ${acceptance.question?.created_by_user?.name}`}
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

                                                {acceptance.remarks && (
                                                    <div className="acceptance-remarks">
                                                        <h4>Remarks:</h4>
                                                        <p>{acceptance.remarks}</p>
                                                    </div>
                                                )}

                                                {/* Updated attachment handling */}
                                                {(acceptance.evidence_file_url || attachments.length > 0) && (
                                                    <div className="attachment-section">
                                                        <h4>Evidence:</h4>
                                                        <div className="attachment-list">
                                                            {/* Legacy single attachment */}
                                                            {acceptance.evidence_file_url && !attachments.length && (
                                                                <button
                                                                    className="btn btn-outline btn-sm"
                                                                    onClick={() => handleViewAttachment({
                                                                        url: acceptance.evidence_file_url,
                                                                        type: getFileType(acceptance.evidence_file_url),
                                                                        name: 'Evidence File'
                                                                    })}
                                                                >
                                                                    View Evidence
                                                                </button>
                                                            )}

                                                            {/* New multiple attachments */}
                                                            {attachments.map((attachment, index) => (
                                                                <button
                                                                    key={index}
                                                                    className="btn btn-outline btn-sm"
                                                                    onClick={() => handleViewAttachment({
                                                                        url: attachment.url,
                                                                        type: getFileType(attachment.url, attachment.name),
                                                                        name: attachment.name
                                                                    })}
                                                                >
                                                                    {attachment.name}
                                                                </button>
                                                            ))}
                                                        </div>
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
                                                {acceptance.status === 'pending' && <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleEditItem(acceptance)}
                                                >
                                                    Edit Question
                                                </button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Attachment Viewer Modal */}
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