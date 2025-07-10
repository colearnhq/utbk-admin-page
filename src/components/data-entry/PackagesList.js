import { useState, useEffect } from 'react';
import { getQuestionPackages, getQuestionsByPackage } from '../../services/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import QuestionCreator from './QuestionCreator';
import RevisionRequestModal from './RevisionRequestModal';

const PackagesList = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionPackage, setRevisionPackage] = useState(null);
    const [packageProgress, setPackageProgress] = useState({});

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const data = await getQuestionPackages();
            const approvedPackages = data.filter(pkg => pkg.status === 'pending');
            setPackages(approvedPackages);

            // Fetch progress for each package
            await fetchPackageProgress(approvedPackages);
        } catch (err) {
            setError('Failed to fetch packages');
            console.error('Error fetching packages:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPackageProgress = async (packages) => {
        try {
            const progressData = {};

            for (const pkg of packages) {
                const questions = await getQuestionsByPackage(pkg.id);
                const totalQuestions = pkg.amount_of_questions;
                const createdQuestions = questions.length;
                const revisedQuestions = questions.filter(q => q.status === 'revised').length;

                progressData[pkg.id] = {
                    created: createdQuestions,
                    total: totalQuestions,
                    revised: revisedQuestions,
                    percentage: totalQuestions > 0 ? (createdQuestions / totalQuestions) * 100 : 0
                };
            }

            setPackageProgress(progressData);
        } catch (error) {
            console.error('Error fetching package progress:', error);
        }
    };

    const handleCreateQuestion = (pkg) => {
        setSelectedPackage(pkg);
    };

    const handleRevisionRequest = (pkg) => {
        setRevisionPackage(pkg);
        setShowRevisionModal(true);
    };

    const getProgressInfo = (pkg) => {
        return packageProgress[pkg.id] || {
            created: 0,
            total: pkg.amount_of_questions,
            revised: 0,
            percentage: 0
        };
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

    if (loading) return <LoadingSpinner message="Loading packages..." />;
    if (error) return <div className="error-message">{error}</div>;

    if (selectedPackage) {
        return (
            <QuestionCreator
                package={selectedPackage}
                onBack={() => setSelectedPackage(null)}
                onQuestionCreated={fetchPackages}
            />
        );
    }

    return (
        <div className="packages-list">
            <div className="packages-header">
                <h2>Question Packages</h2>
                <p>Convert approved packages into individual questions</p>
            </div>

            {packages.length === 0 ? (
                <div className="empty-state">
                    <p>No approved packages available for data entry.</p>
                </div>
            ) : (
                <div className="packages-grid">
                    {packages.map((pkg) => {
                        const progress = getProgressInfo(pkg);
                        const progressPercentage = progress.percentage;

                        return (
                            <div key={pkg.id} className="package-card">
                                <div className="package-header">
                                    <h3>{pkg.title}</h3>
                                    <span className="package-number">
                                        #{pkg.question_package_number}
                                    </span>
                                </div>

                                <div className="package-info">
                                    <div className="info-row">
                                        <span className="label">Subject:</span>
                                        <span className="value">{pkg.subject}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Vendor:</span>
                                        <span className="value">{pkg.vendor_name}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Questions:</span>
                                        <span className="value">{pkg.amount_of_questions}</span>
                                    </div>
                                </div>

                                <div className="progress-section">
                                    <div className="progress-header">
                                        <span>Progress</span>
                                        <span>{progress.created}/{progress.total}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${progressPercentage}%` }}
                                        ></div>
                                    </div>
                                    <div className="progress-details">
                                        <span className="created">✓ {progress.created} Created</span>
                                        {progress.revised > 0 && (
                                            <span className="revised">⚠ {progress.revised} Revised</span>
                                        )}
                                    </div>
                                </div>

                                <div className="package-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleCreateQuestion(pkg)}
                                    >
                                        Create Question
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleRevisionRequest(pkg)}
                                    >
                                        Request Revision
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showRevisionModal && (
                <RevisionRequestModal
                    package={revisionPackage}
                    onClose={() => {
                        setShowRevisionModal(false);
                        setRevisionPackage(null);
                    }}
                    onSubmit={() => {
                        setShowRevisionModal(false);
                        setRevisionPackage(null);
                        fetchPackages();
                    }}
                />
            )}
        </div>
    );
};

export default PackagesList;