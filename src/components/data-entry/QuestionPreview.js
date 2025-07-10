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
                // Block math
                const mathContent = part.slice(2, -2);
                return (
                    <BlockMath key={index} math={mathContent} />
                );
            } else if (part.startsWith('$') && part.endsWith('$')) {
                // Inline math
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

    const getSubjectName = (subjectId) => {
        // TODO: Get actual subject name from context or props
        return 'Subject Name';
    };

    const renderQuestion = () => {
        let attachmentUrl = '';
        if (data.question_attachment) {
            let attachmentData = data.question_attachment;
            if (typeof attachmentData === 'string') {
                try {
                    attachmentData = JSON.parse(attachmentData);
                } catch (e) {
                    console.error("Failed to parse question attachment JSON:", e);
                    attachmentData = null;
                }
            }

            if (attachmentData instanceof File) {
                attachmentUrl = URL.createObjectURL(attachmentData);
            } else if (typeof attachmentData === 'object' && attachmentData && attachmentData.publicUrl) {
                attachmentUrl = attachmentData.publicUrl;
            }
        }

        return (
            <div className="question-content">
                <h3>Question</h3>
                <div className="question-text">
                    {renderMathContent(data.question)}
                </div>

                {attachmentUrl && (
                    <div className="question-attachment">
                        <img
                            src={attachmentUrl}
                            alt="Question attachment"
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
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

        let attachmentUrl = '';
        if (data.solution_attachment) {
            let attachmentData = data.solution_attachment;
            if (typeof attachmentData === 'string') {
                try {
                    attachmentData = JSON.parse(attachmentData);
                } catch (e) {
                    console.error("Failed to parse solution attachment JSON:", e);
                    attachmentData = null;
                }
            }

            if (attachmentData instanceof File) {
                attachmentUrl = URL.createObjectURL(attachmentData);
            } else if (typeof attachmentData === 'object' && attachmentData && attachmentData.publicUrl) {
                attachmentUrl = attachmentData.publicUrl;
            }
        }

        return (
            <div className="solution-content">
                <h4>Solution</h4>
                <div className="solution-text">
                    {renderMathContent(data.solution)}
                </div>

                {attachmentUrl && (
                    <div className="solution-attachment">
                        <img
                            src={attachmentUrl}
                            alt="Solution attachment"
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
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
                            <strong>Exam:</strong> {data.exam}
                        </div>
                        <div className="meta-item">
                            <strong>Subject:</strong> {data.subject ? data.subject.name : 'Loading...'}
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