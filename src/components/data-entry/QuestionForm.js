import { useState, useEffect } from 'react';
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
        question_attachment: null,
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        option_e: '',
        correct_option: 'A',
        correct_answer: '',
        solution: '',
        solution_attachment: null
    });

    const [dropdownData, setDropdownData] = useState({
        subjects: [],
        chapters: [],
        topics: [],
        conceptTitles: []
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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
            [name]: files[0] || null
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            let processedFormData = { ...formData };

            // Process question attachment
            if (formData.question_attachment) {
                const questionFileName = generateUniqueFileName(
                    formData.question_attachment.name,
                    'question_'
                );

                // Upload to Supabase
                const questionSupabaseUpload = await uploadFileToSupabase(
                    formData.question_attachment,
                    'question-attachments',
                    questionFileName,
                    null
                );

                // Upload to Google Drive
                const questionGoogleDriveResult = await uploadFileToGoogleDrive(
                    formData.question_attachment,
                    questionFileName
                );

                processedFormData.question_attachment = {
                    fileName: questionFileName,
                    publicUrl: questionSupabaseUpload.publicUrl,
                    googleDriveId: questionGoogleDriveResult.fileId,
                    googleDriveUrl: questionGoogleDriveResult.fileUrl,
                    originalName: formData.question_attachment.name
                };
            }

            // Process solution attachment
            if (formData.solution_attachment) {
                const solutionFileName = generateUniqueFileName(
                    formData.solution_attachment.name,
                    'solution_'
                );

                // Upload to Supabase
                const solutionSupabaseUpload = await uploadFileToSupabase(
                    formData.solution_attachment,
                    'solution-attachments',
                    solutionFileName,
                    null
                );

                // Upload to Google Drive
                const solutionGoogleDriveResult = await uploadFileToGoogleDrive(
                    formData.solution_attachment,
                    solutionFileName
                );

                processedFormData.solution_attachment = {
                    fileName: solutionFileName,
                    publicUrl: solutionSupabaseUpload.publicUrl,
                    googleDriveId: solutionGoogleDriveResult.fileId,
                    googleDriveUrl: solutionGoogleDriveResult.fileUrl,
                    originalName: formData.solution_attachment.name
                };
            }

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
                question_attachment: null,
                option_a: '',
                option_b: '',
                option_c: '',
                option_d: '',
                option_e: '',
                correct_option: 'A',
                correct_answer: '',
                solution: '',
                solution_attachment: null
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit question. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePreview = () => {
        onPreview(formData);
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
                        id="question"
                        name="question"
                        value={formData.question}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        placeholder="Enter the question text (supports LaTeX)"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="question_attachment">Question Attachment</label>
                    <input
                        type="file"
                        id="question_attachment"
                        name="question_attachment"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                    />
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
                        id="solution"
                        name="solution"
                        value={formData.solution}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        placeholder="Enter the solution with detailed explanation"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="solution_attachment">Solution Attachment</label>
                    <input
                        type="file"
                        id="solution_attachment"
                        name="solution_attachment"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                    />
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