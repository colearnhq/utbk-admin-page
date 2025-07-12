import { useState, useEffect, useRef } from 'react';
import { getSubjects, getChapters, getTopics, getConceptTitles, uploadFileToGoogleDrive, generateUniqueFileName } from '../../services/supabase';
import { uploadFileToSupabase, checkBucketExists, createBucket } from '../../services/supabase-storage';
import LoadingSpinner from '../common/LoadingSpinner';

const QuestionForm = ({ onSubmit, onPreview, initialData = null }) => {
    const [formData, setFormData] = useState({
        exam: 'UTBK-SNBT',
        subject_id: '',
        chapter_id: '',
        topic_id: '',
        concept_title_id: '',
        question_type: 'MCQ',
        question: '',
        question_attachments: [],
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        option_e: '',
        correct_option: 'A',
        correct_answer: '',
        solution: '',
        solution_attachments: []
    });

    const [dropdownData, setDropdownData] = useState({
        subjects: [],
        chapters: [],
        topics: [],
        conceptTitles: []
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const questionTextareaRef = useRef(null);
    const solutionTextareaRef = useRef(null);

    useEffect(() => {
        loadSubjects();
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    useEffect(() => {
        if (formData.subject_id) {
            loadChapters(formData.subject_id);
        } else {
            setDropdownData(prev => ({
                ...prev,
                chapters: [],
                topics: [],
                conceptTitles: []
            }));
        }
    }, [formData.subject_id]);

    useEffect(() => {
        if (formData.chapter_id) {
            loadTopics(formData.chapter_id);
        } else {
            setDropdownData(prev => ({
                ...prev,
                topics: [],
                conceptTitles: []
            }));
        }
    }, [formData.chapter_id]);

    useEffect(() => {
        if (formData.topic_id) {
            loadConceptTitles(formData.topic_id);
        } else {
            setDropdownData(prev => ({
                ...prev,
                conceptTitles: []
            }));
        }
    }, [formData.topic_id]);

    const loadSubjects = async () => {
        try {
            const subjects = await getSubjects();
            setDropdownData(prev => ({ ...prev, subjects }));
        } catch (error) {
            console.error('Error loading subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChapters = async (subjectId) => {
        try {
            const chapters = await getChapters(subjectId);
            setDropdownData(prev => ({ ...prev, chapters }));
        } catch (error) {
            console.error('Error loading chapters:', error);
        }
    };

    const loadTopics = async (chapterId) => {
        try {
            const topics = await getTopics(chapterId);
            setDropdownData(prev => ({ ...prev, topics }));
        } catch (error) {
            console.error('Error loading topics:', error);
        }
    };

    const loadConceptTitles = async (topicId) => {
        try {
            const conceptTitles = await getConceptTitles(topicId);
            setDropdownData(prev => ({ ...prev, conceptTitles }));
        } catch (error) {
            console.error('Error loading concept titles:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'subject_id') {
            setFormData(prev => ({
                ...prev,
                chapter_id: '',
                topic_id: '',
                concept_title_id: ''
            }));
        } else if (name === 'chapter_id') {
            setFormData(prev => ({
                ...prev,
                topic_id: '',
                concept_title_id: ''
            }));
        } else if (name === 'topic_id') {
            setFormData(prev => ({
                ...prev,
                concept_title_id: ''
            }));
        }
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: [...(prev[name] || []), ...Array.from(files)]
        }));
    };

    const handleRemoveAttachment = (fieldName, indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: prev[fieldName].filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleInsertPlaceholder = (textareaRef, fileName) => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            const placeholder = `[attachment:${fileName}]`;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newText = text.substring(0, start) + placeholder + text.substring(end);
            
            setFormData(prev => ({
                ...prev,
                [textarea.name]: newText
            }));

            // Move cursor to after the inserted placeholder
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
                textarea.focus();
            }, 0);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            let processedFormData = { ...formData };

            const uploadAttachments = async (attachments, type) => {
                const uploadedAttachments = [];
                for (const file of attachments) {
                    if (file.publicUrl) { // Already uploaded
                        uploadedAttachments.push(file);
                        continue;
                    }
                    const fileName = generateUniqueFileName(file.name, `${type}_`);
                    
                    const supabaseUpload = await uploadFileToSupabase(file, `${type}-attachments`, fileName, null);
                    const googleDriveResult = await uploadFileToGoogleDrive(file, fileName);

                    uploadedAttachments.push({
                        fileName: fileName,
                        publicUrl: supabaseUpload.publicUrl,
                        googleDriveId: googleDriveResult.fileId,
                        googleDriveUrl: googleDriveResult.fileUrl,
                        originalName: file.name
                    });
                }
                return uploadedAttachments;
            };

            processedFormData.question_attachments = await uploadAttachments(formData.question_attachments, 'question');
            processedFormData.solution_attachments = await uploadAttachments(formData.solution_attachments, 'solution');

            await onSubmit(processedFormData);

            // Reset form
            setFormData({
                exam: 'UTBK-SNBT',
                subject_id: '',
                chapter_id: '',
                topic_id: '',
                concept_title_id: '',
                question_type: 'MCQ',
                question: '',
                question_attachments: [],
                option_a: '',
                option_b: '',
                option_c: '',
                option_d: '',
                option_e: '',
                correct_option: 'A',
                correct_answer: '',
                solution: '',
                solution_attachments: []
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit question. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePreview = () => {
        const subject = dropdownData.subjects.find(s => s.id === formData.subject_id);
        onPreview({
            ...formData,
            subject_name: subject ? subject.name : ''
        });
    };

    if (loading) return <LoadingSpinner message="Loading form data..." />;

    return (
        <div className="question-form">
            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="exam">Exam</label>
                        <select
                            id="exam"
                            name="exam"
                            value={formData.exam}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="UTBK-SNBT">UTBK-SNBT</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="subject_id">Subject</label>
                        <select
                            id="subject_id"
                            name="subject_id"
                            value={formData.subject_id}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Subject</option>
                            {dropdownData.subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="chapter_id">Chapter</label>
                        <select
                            id="chapter_id"
                            name="chapter_id"
                            value={formData.chapter_id}
                            onChange={handleInputChange}
                            required
                            disabled={!formData.subject_id}
                        >
                            <option value="">Select Chapter</option>
                            {dropdownData.chapters.map(chapter => (
                                <option key={chapter.id} value={chapter.id}>
                                    {chapter.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="topic_id">Topic</label>
                        <select
                            id="topic_id"
                            name="topic_id"
                            value={formData.topic_id}
                            onChange={handleInputChange}
                            required
                            disabled={!formData.chapter_id}
                        >
                            <option value="">Select Topic</option>
                            {dropdownData.topics.map(topic => (
                                <option key={topic.id} value={topic.id}>
                                    {topic.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="concept_title_id">Concept Title</label>
                        <select
                            id="concept_title_id"
                            name="concept_title_id"
                            value={formData.concept_title_id}
                            onChange={handleInputChange}
                            required
                            disabled={!formData.topic_id}
                        >
                            <option value="">Select Concept Title</option>
                            {dropdownData.conceptTitles.map(concept => (
                                <option key={concept.id} value={concept.id}>
                                    {concept.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="question_type">Question Type</label>
                        <select
                            id="question_type"
                            name="question_type"
                            value={formData.question_type}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="MCQ">Multiple Choice (MCQ)</option>
                            <option value="Essay">Essay</option>
                            <option value="Short Answer">Short Answer</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="question">Question</label>
                    <textarea
                        ref={questionTextareaRef}
                        id="question"
                        name="question"
                        value={formData.question}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        placeholder="Enter the question text (supports LaTeX). Use the 'Insert' button to place attachments."
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="question_attachments">Question Attachments</label>
                    <input
                        type="file"
                        id="question_attachments"
                        name="question_attachments"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        multiple
                    />
                    <div className="attachments-list">
                        {formData.question_attachments.map((file, index) => (
                            <div key={index} className="attachment-item">
                                <span>{file.name}</span>
                                <button type="button" className="btn-insert" onClick={() => handleInsertPlaceholder(questionTextareaRef, file.name)}>Insert</button>
                                <button type="button" className="btn-remove" onClick={() => handleRemoveAttachment('question_attachments', index)}>Remove</button>
                            </div>
                        ))}
                    </div>
                </div>

                {formData.question_type === 'MCQ' && (
                    <>
                        <div className="options-section">
                            <h4>Answer Options</h4>
                            <div className="options-grid">
                                {['A', 'B', 'C', 'D', 'E'].map(option => (
                                    <div key={option} className="form-group">
                                        <label htmlFor={`option_${option.toLowerCase()}`}>
                                            Option {option}
                                        </label>
                                        <textarea
                                            id={`option_${option.toLowerCase()}`}
                                            name={`option_${option.toLowerCase()}`}
                                            value={formData[`option_${option.toLowerCase()}`]}
                                            onChange={handleInputChange}
                                            required
                                            rows={2}
                                            placeholder={`Enter option ${option}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="correct_option">Correct Option</label>
                            <select
                                id="correct_option"
                                name="correct_option"
                                value={formData.correct_option}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                            </select>
                        </div>
                    </>
                )}

                {(formData.question_type === 'Essay' || formData.question_type === 'Short Answer') && (
                    <div className="form-group">
                        <label htmlFor="correct_answer">Correct Answer</label>
                        <textarea
                            id="correct_answer"
                            name="correct_answer"
                            value={formData.correct_answer}
                            onChange={handleInputChange}
                            required
                            rows={4}
                            placeholder="Enter the correct answer"
                        />
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="solution">Solution including Concepts</label>
                    <textarea
                        ref={solutionTextareaRef}
                        id="solution"
                        name="solution"
                        value={formData.solution}
                        onChange={handleInputChange}
                        required
                        rows={8}
                        placeholder="Enter the solution with detailed explanation. Use the 'Insert' button to place attachments."
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="solution_attachments">Solution Attachments</label>
                    <input
                        type="file"
                        id="solution_attachments"
                        name="solution_attachments"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        multiple
                    />
                    <div className="attachments-list">
                        {formData.solution_attachments.map((file, index) => (
                            <div key={index} className="attachment-item">
                                <span>{file.name}</span>
                                <button type="button" className="btn-insert" onClick={() => handleInsertPlaceholder(solutionTextareaRef, file.name)}>Insert</button>
                                <button type="button" className="btn-remove" onClick={() => handleRemoveAttachment('solution_attachments', index)}>Remove</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handlePreview}
                        disabled={submitting}
                    >
                        Preview Question
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit Question'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default QuestionForm;