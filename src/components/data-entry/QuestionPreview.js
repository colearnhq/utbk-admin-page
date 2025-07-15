import { useState } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const QuestionPreview = ({ data, onClose }) => {
    const [showSolution, setShowSolution] = useState(false);

    const renderMathContent = (text) => {
        if (!text) return '';

        const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/);

        return parts.map((part, index) => {
            if (part.startsWith('$$') && part.endsWith('$$')) {
                const mathContent = part.slice(2, -2);
                return (
                    <BlockMath key={index} math={mathContent} />
                );
            } else if (part.startsWith('$') && part.endsWith('$')) {
                const mathContent = part.slice(1, -1);
                return (
                    <InlineMath key={index} math={mathContent} />
                );
            } else {
                // Regular text
                return part;
            }
        });
    };

    const renderContentWithAttachments = (text, attachments) => {
        if (!text) return '';
        if (!attachments || attachments.length === 0) return renderMathContent(text);

        let processedText = text;
        const attachmentElements = [];

        attachments.forEach((attachment, index) => {
            const fileName = attachment.originalName || attachment.name || attachment.fileName;
            const placeholder = `[attachment:${fileName}]`;

            if (processedText.includes(placeholder)) {
                const attachmentElement = (
                    <div key={`attachment-${index}`} className="inline-attachment">
                        <img
                            src={attachment.publicUrl || attachment.googleDriveUrl || (attachment instanceof File ? URL.createObjectURL(attachment) : '')}
                            alt={`Attachment ${fileName}`}
                            style={{ maxWidth: '100%', height: 'auto', margin: '10px 0' }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <div style={{ display: 'none', padding: '10px', backgroundColor: '#f5f5f5', border: '1px dashed #ccc', textAlign: 'center' }}>
                            Image failed to load: {fileName}
                        </div>
                    </div>
                );
                processedText = processedText.replace(placeholder, `__ATTACHMENT_${index}__`);
                attachmentElements[index] = attachmentElement;
            }
        });

        const parts = processedText.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|__ATTACHMENT_\d+__)/);

        return parts.map((part, index) => {
            if (part.startsWith('$$') && part.endsWith('$$')) {
                const mathContent = part.slice(2, -2);
                return <BlockMath key={index} math={mathContent} />;
            } else if (part.startsWith('$') && part.endsWith('$')) {
                const mathContent = part.slice(1, -1);
                return <InlineMath key={index} math={mathContent} />;
            } else if (part.startsWith('__ATTACHMENT_') && part.endsWith('__')) {
                const attachmentIndex = parseInt(part.match(/\d+/)[0]);
                return attachmentElements[attachmentIndex] || null;
            } else {
                return part;
            }
        });
    };


    const renderQuestion = () => {
        const attachments = (() => {
            try {
                if (Array.isArray(data.question_attachments)) {
                    return data.question_attachments;
                }
                return data.question_attachments ? JSON.parse(data.question_attachments) : [];
            } catch {
                return [];
            }
        })();

        const unusedAttachments = attachments.filter(attachment => {
            const fileName = attachment.originalName || attachment.name || attachment.fileName;
            return !data.question.includes(`[attachment:${fileName}]`);
        });

        return (
            <div className="question-content">
                <h3>Question</h3>
                <div className="question-text">
                    {renderContentWithAttachments(data.question, attachments)}
                </div>

                {unusedAttachments.length > 0 && (
                    <div className="question-attachments">
                        <h5>Additional Attachments:</h5>
                        {unusedAttachments.map((attachment, index) => (
                            <div key={index} className="attachment-item">
                                <img
                                    src={attachment.publicUrl || attachment.googleDriveUrl || (attachment instanceof File ? URL.createObjectURL(attachment) : '')}
                                    alt={`Question attachment ${index + 1}`}
                                    style={{ maxWidth: '100%', height: 'auto', margin: '5px 0' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <div style={{ display: 'none', padding: '10px', backgroundColor: '#f5f5f5', border: '1px dashed #ccc', textAlign: 'center' }}>
                                    Image failed to load: {attachment.originalName || attachment.name || attachment.fileName}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderMCQOptions = () => {
        if (data.question_type !== 'MCQ') return null;

        const options = ['A', 'B', 'C', 'D', 'E'];

        return (
            <div className="options-content">
                <h4>Answer Options</h4>
                <div className="options-list">
                    {options.map(option => {
                        const optionText = data[`option_${option.toLowerCase()}`];
                        const isCorrect = data.correct_option === option;

                        return (
                            <div
                                key={option}
                                className={`option-item ${isCorrect ? 'correct' : ''}`}
                            >
                                <span className="option-label">{option}.</span>
                                <span className="option-text">
                                    {renderMathContent(optionText)}
                                </span>
                                {isCorrect && <span className="correct-indicator">✓</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderCorrectAnswer = () => {
        if (data.question_type === 'MCQ') return null;

        return (
            <div className="correct-answer-content">
                <h4>Correct Answer</h4>
                <div className="correct-answer-text">
                    {renderMathContent(data.correct_answer)}
                </div>
            </div>
        );
    };

    const renderSolution = () => {
        if (!showSolution) return null;

        const attachments = (() => {
            try {
                if (Array.isArray(data.solution_attachments)) {
                    return data.solution_attachments;
                }
                return data.solution_attachments ? JSON.parse(data.solution_attachments) : [];
            } catch {
                return [];
            }
        })();

        const unusedAttachments = attachments.filter(attachment => {
            const fileName = attachment.originalName || attachment.name || attachment.fileName;
            return !data.solution.includes(`[attachment:${fileName}]`);
        });

        return (
            <div className="solution-content">
                <h4>Solution</h4>
                <div className="solution-text">
                    {renderContentWithAttachments(data.solution, attachments)}
                </div>

                {unusedAttachments.length > 0 && (
                    <div className="solution-attachments">
                        <h5>Additional Attachments:</h5>
                        {unusedAttachments.map((attachment, index) => (
                            <div key={index} className="attachment-item">
                                <img
                                    src={attachment.publicUrl || attachment.googleDriveUrl || (attachment instanceof File ? URL.createObjectURL(attachment) : '')}
                                    alt={`Solution attachment ${index + 1}`}
                                    style={{ maxWidth: '100%', height: 'auto', margin: '5px 0' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <div style={{ display: 'none', padding: '10px', backgroundColor: '#f5f5f5', border: '1px dashed #ccc', textAlign: 'center' }}>
                                    Image failed to load: {attachment.originalName || attachment.name || attachment.fileName}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="question-preview-overlay">
            <div className="question-preview-modal">
                <div className="modal-header">
                    <h2>Question Preview</h2>
                    <button
                        className="close-btn"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-content">
                    <div className="question-meta">
                        <div className="meta-item">
                            <strong>Exam:</strong> {data?.exam || data?.question?.exam}
                        </div>
                        <div className="meta-item">
                            <strong>Subject:</strong> {data?.subject_name || data.subject?.name || 'Loading...'}
                        </div>
                        <div className="meta-item">
                            <strong>Type:</strong> {data.question_type}
                        </div>
                    </div>

                    {renderQuestion()}
                    {renderMCQOptions()}
                    {renderCorrectAnswer()}

                    <div className="solution-section">
                        <button
                            className="btn btn-outline"
                            onClick={() => setShowSolution(!showSolution)}
                        >
                            {showSolution ? 'Hide Solution' : 'Show Solution'}
                        </button>
                        {renderSolution()}
                    </div>
                </div>

                <div className="modal-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuestionPreview;