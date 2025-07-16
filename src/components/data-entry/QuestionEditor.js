import { useState } from 'react';
import QuestionForm from './QuestionForm';
import QuestionPreview from './QuestionPreview';
import PDFViewer from './PDFViewer';

const QuestionEditor = ({
    initialData,
    onSave,
    onCancel,
    showPDF = false,
    pdfUrl = null,
    headerTitle = "Edit Question",
    headerSubtitle = null,
    additionalActions = null
}) => {
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [pdfWidth, setPdfWidth] = useState(50);
    const [isDragging, setIsDragging] = useState(false);

    const handlePreview = (formData) => {
        setPreviewData(formData);
        setShowPreview(true);
    };

    const handleMouseDown = (e) => {
        if (!showPDF) return;
        setIsDragging(true);
        e.preventDefault();
    };
    const question = initialData;
    const handleMouseMove = (e) => {
        if (!isDragging || !showPDF) return;

        const container = e.currentTarget.closest('.question-editor');
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newWidth = (x / rect.width) * 100;

        const constrainedWidth = Math.max(20, Math.min(80, newWidth));
        setPdfWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const prepareInitialData = () => {
        return {
            exam: 'UTBK-SNBT',
            inhouse_id: question.inhouse_id,
            subject_id: question.subject?.id,
            chapter_id: question.chapter?.id,
            topic_id: question.topic?.id,
            concept_title_id: question.concept_title?.id,
            question_type: question.question_type,
            question_number: question.question_number || '',
            question: question.question,
            option_a: question.option_a,
            option_b: question.option_b,
            option_c: question.option_c,
            option_d: question.option_d,
            option_e: question.option_e,
            correct_option: question.correct_option,
            correct_answer: question.correct_answer,
            solution: question.solution,
            question_attachments: question.question_attachments || [],
            solution_attachments: question.solution_attachments || []
        };
    };

    if (showPDF) {
        return (
            <div
                className="question-editor revision-edit"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div className="edit-header">
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        ← Back
                    </button>
                    <div className="question-info">
                        <h3>{headerTitle}: {question?.inhouse_id}</h3>
                        {headerSubtitle && (
                            <div className="header-subtitle">
                                {headerSubtitle}
                            </div>
                        )}
                    </div>
                    <div className="creator-actions">
                        {additionalActions}
                        {pdfUrl && (
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline"
                            >
                                📥 Download PDF
                            </a>
                        )}
                    </div>
                </div>

                <div className="creator-content">
                    <div
                        className="pdf-section"
                        style={{ width: `${pdfWidth}%` }}
                    >
                        <PDFViewer url={pdfUrl} />
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
                            <h3>Edit Question</h3>
                            <QuestionForm
                                initialData={prepareInitialData()}
                                onSubmit={onSave}
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
        <div className="question-editor">
            <div className="edit-header">
                <button
                    className="btn btn-secondary"
                    onClick={onCancel}
                >
                    ← Back
                </button>
                <div className="question-info">
                    <h3>{headerTitle}: {question.inhouse_id}</h3>
                    {headerSubtitle && (
                        <div className="header-subtitle">
                            {headerSubtitle}
                        </div>
                    )}
                </div>
                <div className="creator-actions">
                    {additionalActions}
                </div>
            </div>

            <div className="form-container">
                <QuestionForm
                    initialData={prepareInitialData()}
                    onSubmit={onSave}
                    onPreview={handlePreview}
                />
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

export default QuestionEditor;