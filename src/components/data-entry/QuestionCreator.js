import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import PDFViewer from './PDFViewer';
import QuestionForm from './QuestionForm';
import QuestionPreview from './QuestionPreview';
import { createQuestion } from '../../services/supabase';

const QuestionCreator = ({ package: pkg, onBack, onQuestionCreated }) => {
    const { userData } = useAuth();
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [pdfWidth, setPdfWidth] = useState(50);
    const [isDragging, setIsDragging] = useState(false);

    const handlePreview = (formData) => {
        setPreviewData(formData);
        setShowPreview(true);
    };

    const handleSubmit = async (formData) => {
        try {
            if (!userData || !userData.id) {
                alert('User not authenticated. Please login again.');
                return;
            }

            const subjectAbbrev = getSubjectAbbreviation(pkg.subject);
            const packageNumber = String(pkg.question_package_number).padStart(2, '0');
            const sequenceNumber = await getNextSequenceNumber(pkg.id);
            const inhouseId = `${subjectAbbrev}-${packageNumber}-${sequenceNumber}`;

            const questionData = {
                ...formData,
                package_id: pkg.id,
                inhouse_id: inhouseId,
                sequence_number: sequenceNumber,
                created_by: userData.id
            };

            console.log('Creating question:', questionData);
            await createQuestion(questionData);
            alert('Question created successfully!');
            onQuestionCreated();
        } catch (error) {
            console.error('Error creating question:', error);
            alert('Failed to create question. Please try again.');
        }
    };

    const getSubjectAbbreviation = (subject) => {
        const abbreviations = {
            'Literasi Dalam Bahasa Indonesia': 'LBI',
            'Literasi Dalam Bahasa Inggris': 'LBE',
            'Pemahaman Baca dan Menulis': 'PBM',
            'Penalaran Matematika': 'PMK',
            'Penalaran Umum': 'PUM',
            'Pengetahuan dan Pemahaman Umum': 'PPU',
            'Pengetahuan Kuantitatif': 'PKT'
        };
        return abbreviations[subject] || subject;
    };

    const getNextSequenceNumber = async (packageId) => {
        try {
            // ✅ Use the actual function from supabase.js
            const { getNextSequenceNumber } = await import('../../services/supabase');
            return await getNextSequenceNumber(packageId);
        } catch (error) {
            console.error('Error getting sequence number:', error);
            // Fallback to 100 if there's an error
            return 100;
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const container = e.currentTarget.closest('.question-creator');
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newWidth = (x / rect.width) * 100;

        const constrainedWidth = Math.max(20, Math.min(80, newWidth));
        setPdfWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (!userData) {
        return (
            <div className="question-creator">
                <div className="creator-header">
                    <button className="btn btn-secondary" onClick={onBack}>
                        ← Back to Packages
                    </button>
                </div>
                <div className="creator-content">
                    <p>Loading user data...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="question-creator"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="creator-header">
                <button className="btn btn-secondary" onClick={onBack}>
                    ← Back to Packages
                </button>
                <div className="package-info">
                    <h2>{pkg.title}</h2>
                    <span className="package-details">
                        {pkg.subject} • Package #{pkg.question_package_number} • {pkg.amount_of_questions} questions
                    </span>
                </div>
                <div className="creator-actions">
                    <a
                        href={pkg.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                    >
                        📥 Download PDF
                    </a>
                </div>
            </div>

            <div className="creator-content">
                <div
                    className="pdf-section"
                    style={{ width: `${pdfWidth}%` }}
                >
                    <PDFViewer url={pkg.public_url} />
                </div>

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
                        <h3>Create Question</h3>
                        <QuestionForm
                            onSubmit={handleSubmit}
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
};

export default QuestionCreator;