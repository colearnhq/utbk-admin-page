import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { uploadFileToSupabase, checkBucketExists, createBucket } from '../../services/supabase-storage';
import { createQuestionPackage, getSubjects, getExams } from '../../services/supabase'; // Import getExams
import '../../styles/components/forms.css';

const Submission = () => {
    const { userData } = useAuth();
    const [formData, setFormData] = useState({
        subjectId: '',
        examId: '',
        questionPackageNumber: '',
        title: '',
        amountOfQuestions: '',
        file: null
    });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [subjectsList, setSubjectsList] = useState([]);
    const [examsList, setExamsList] = useState([]);

    useEffect(() => {
        loadDropdownData();
    }, []);

    const loadDropdownData = async () => {
        try {
            const fetchedSubjects = await getSubjects();
            setSubjectsList(fetchedSubjects);

            const fetchedExams = await getExams();
            setExamsList(fetchedExams);
        } catch (err) {
            console.error('Error loading dropdown data:', err);
            setError('Failed to load subjects or exams.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['.pdf', '.docx', '.doc', '.zip'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

            if (!allowedTypes.includes(fileExtension)) {
                setError('File type not supported. Please upload PDF, DOCX, DOC, or ZIP files.');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                setError('File size too large. Maximum size is 10MB.');
                return;
            }

            setFormData(prev => ({
                ...prev,
                file: file
            }));
            setError(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!userData || !userData.id) {
            setError('You must be logged in to upload a question package.');
            return;
        }

        // Validate vendor_name from userData
        if (!userData.vendor_name) {
            setError('Your user profile is missing a vendor name. Please contact an administrator.');
            return;
        }

        if (!formData.subjectId || !formData.examId || !formData.questionPackageNumber ||
            !formData.title || !formData.amountOfQuestions || !formData.file) {
            setError('Semua field harus diisi');
            return;
        }

        if (parseInt(formData.amountOfQuestions) <= 0) {
            setError('Jumlah soal harus lebih dari 0');
            return;
        }

        try {
            setUploading(true);
            setError(null);
            setUploadProgress(0);

            console.log('Starting file upload process...');

            const bucketName = 'organization-non-profit';
            const bucketExists = await checkBucketExists(bucketName);

            console.log(bucketExists);

            const handleProgress = (progress) => {
                setUploadProgress(progress);
            };

            const timestamp = Date.now();
            const cleanFileName = formData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${userData.id}/${timestamp}-${cleanFileName}`;

            console.log('Uploading file to path:', filePath);

            const uploadResult = await uploadFileToSupabase(
                formData.file,
                bucketName,
                filePath,
                handleProgress
            );

            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Upload failed');
            }

            console.log('File uploaded successfully:', uploadResult.publicUrl);

            const packageData = {
                vendor_name: userData.vendor_name, // Use vendor_name from userData
                subject_id: formData.subjectId, // Use subjectId
                subject: subjectsList.find(s => s.id === formData.subjectId)?.name, // Add subject name
                exam_name_id: formData.examId, // Use examId
                question_package_number: parseInt(formData.questionPackageNumber), // New field
                title: formData.title,
                amount_of_questions: parseInt(formData.amountOfQuestions),
                public_url: uploadResult.publicUrl,
                file_path: uploadResult.path,
                uploaded_by: userData.id,
                status: 'pending'
            };

            console.log('Saving package data to database:', packageData);

            const savedPackage = await createQuestionPackage(packageData);

            console.log('Package data saved to database:', savedPackage);

            setFormData({
                subjectId: '',
                examId: '',
                questionPackageNumber: '',
                title: '',
                amountOfQuestions: '',
                file: null
            });

            // Reset file input
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setUploadProgress(0);
            }, 5000);

        } catch (err) {
            console.error('Submission error:', err);

            let errorMessage = 'Terjadi kesalahan saat upload';

            if (err.message.includes('Invalid JWT') || err.message.includes('JWT expired')) {
                errorMessage = 'Session expired. Silakan login kembali.';
            } else if (err.message.includes('File size')) {
                errorMessage = 'File terlalu besar. Maksimal 10MB.';
            } else if (err.message.includes('already exists')) {
                errorMessage = 'File dengan nama yang sama sudah ada. Silakan rename file.';
            } else if (err.message.includes('Network') || err.message.includes('network')) {
                errorMessage = 'Koneksi internet bermasalah. Silakan coba lagi.';
            } else if (err.message.includes('permissions') || err.message.includes('unauthorized')) {
                errorMessage = 'Tidak memiliki akses untuk upload. Hubungi administrator.';
            } else if (err.message.includes('Bucket')) {
                errorMessage = 'Storage bucket tidak tersedia. Hubungi administrator.';
            } else if (err.message.includes('relation') && err.message.includes('does not exist')) {
                errorMessage = 'Database table tidak ditemukan. Hubungi administrator.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            setUploadProgress(0);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="submission-container">
            <div className="submission-header">
                <h2>Upload Paket Soal</h2>
                <p>Silakan isi form berikut untuk mengupload paket soal baru</p>
            </div>

            {success && (
                <div className="success-message">
                    ✅ Paket soal berhasil diupload! Data telah disimpan dan file tersedia di Database.
                </div>
            )}

            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="submission-form">
                <div className="form-group">
                    <label htmlFor="examId">Ujian *</label>
                    <select
                        id="examId"
                        name="examId"
                        value={formData.examId}
                        onChange={handleInputChange}
                        disabled={uploading}
                        required
                    >
                        <option value="">Pilih Ujian</option>
                        {examsList.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="subjectId">Subject *</label>
                    <select
                        id="subjectId"
                        name="subjectId"
                        value={formData.subjectId}
                        onChange={handleInputChange}
                        disabled={uploading}
                        required
                    >
                        <option value="">Pilih Subject</option>
                        {subjectsList.map(subject => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="questionPackageNumber">Nomor Paket Soal *</label>
                    <input
                        type="number"
                        id="questionPackageNumber"
                        name="questionPackageNumber"
                        value={formData.questionPackageNumber}
                        onChange={handleInputChange}
                        placeholder="Masukkan nomor paket soal"
                        min="1"
                        disabled={uploading}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="title">Judul Paket Soal *</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Masukkan judul paket soal"
                        disabled={uploading}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="amountOfQuestions">Jumlah Soal *</label>
                    <input
                        type="number"
                        id="amountOfQuestions"
                        name="amountOfQuestions"
                        value={formData.amountOfQuestions}
                        onChange={handleInputChange}
                        placeholder="Masukkan jumlah soal"
                        min="1"
                        disabled={uploading}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="file-input">File Paket Soal *</label>
                    <input
                        type="file"
                        id="file-input"
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.doc,.zip"
                        disabled={uploading}
                        required
                    />
                    <small className="file-info">
                        Format yang didukung: PDF, DOCX, DOC, ZIP (Maksimal 10MB)
                    </small>
                    {formData.file && (
                        <div className="selected-file">
                            📎 Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                    )}
                </div>

                {uploading && uploadProgress > 0 && (
                    <div className="upload-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <div className="progress-text">
                            {uploadProgress < 20 ? 'Mempersiapkan upload...' :
                                uploadProgress < 80 ? 'Mengupload file ke Database...' :
                                    uploadProgress < 100 ? 'Menyimpan data ke database...' :
                                        'Selesai!'}
                        </div>
                    </div>
                )}

                <div className="form-actions">
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <span className="spinner-small"></span>
                                Uploading...
                            </>
                        ) : (
                            'Upload Paket Soal'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Submission;
