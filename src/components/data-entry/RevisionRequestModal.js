import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { createRevision, uploadFileToSupabase } from '../../services/supabase';

const RevisionRequestModal = ({ package: pkg, onClose, onSubmit, questionId = null }) => {
    const { userData } = useAuth();
    const [formData, setFormData] = useState({
        role_name: 'question_maker',
        revision_notes: '',
        evidence_file: null
    });
    const [submitting, setSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData(prev => ({
            ...prev,
            evidence_file: file
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            let evidenceFileUrl = null;
            if (formData.evidence_file) {
                const bucketName = 'revision-evidence';
                const timestamp = Date.now();
                const cleanFileName = formData.evidence_file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `${userData.id}/${timestamp}-${cleanFileName}`;

                const uploadResult = await uploadFileToSupabase(
                    formData.evidence_file,
                    bucketName,
                    filePath
                );
                if (!uploadResult.publicUrl) {
                    throw new Error('Failed to upload evidence file.');
                }
                evidenceFileUrl = uploadResult.publicUrl;
            }

            const revisionData = {
                package_id: pkg.id,
                question_id: questionId,
                target_role: formData.role_name,
                notes: formData.revision_notes,
                evidence_file_url: evidenceFileUrl,
                requested_by: userData.id,
                status: 'pending'
            };

            console.log('Submitting revision request:', revisionData);

            await createRevision(revisionData);

            alert('Revision request submitted successfully!');
            onSubmit(revisionData);
        } catch (error) {
            console.error('Error submitting revision request:', error);
            alert('Failed to submit revision request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h3>Request Revision</h3>
                    <button
                        className="close-btn"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div className="package-info">
                        <h4>{pkg.title}</h4>
                        <p>{pkg.subject} • Package #{pkg.question_package_number}</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="role_name">Target Role</label>
                            <select
                                id="role_name"
                                name="role_name"
                                value={formData.role_name}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="question_maker">Question Maker</option>
                                <option value="administrator">Administrator</option>
                                <option value="metadata">Metadata</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="revision_notes">Revision Notes</label>
                            <textarea
                                id="revision_notes"
                                name="revision_notes"
                                value={formData.revision_notes}
                                onChange={handleInputChange}
                                required
                                rows={6}
                                placeholder="Please describe the issues found and what needs to be revised..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="evidence_file">Evidence (Optional)</label>
                            <input
                                type="file"
                                id="evidence_file"
                                name="evidence_file"
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.doc,.docx"
                            />
                            <small className="form-help">
                                Upload screenshots or documents that support your revision request
                            </small>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || !formData.revision_notes.trim()}
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RevisionRequestModal;