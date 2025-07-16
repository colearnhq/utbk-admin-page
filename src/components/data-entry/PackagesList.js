import { useState, useEffect } from 'react';
import { getPackagesWithProgress } from '../../services/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import QuestionCreator from './QuestionCreator';
import RevisionRequestModal from './RevisionRequestModal';

const PackagesList = () => {
    const [packages, setPackages] = useState([]);
    const [filteredPackages, setFilteredPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionPackage, setRevisionPackage] = useState(null);
    const [subjectFilter, setSubjectFilter] = useState('');
    const [progressFilter, setProgressFilter] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');
    const [vendorFilter, setVendorFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const data = await getPackagesWithProgress();
            setPackages(data);
            setFilteredPackages(data);
        } catch (err) {
            setError('Failed to fetch packages');
            console.error('Error fetching packages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuestion = (pkg) => {
        setSelectedPackage(pkg);
    };

    const handleRevisionRequest = (pkg) => {
        setRevisionPackage(pkg);
        setShowRevisionModal(true);
    };

    const getProgressStatus = (percentage) => {
        if (percentage === 0) return 'not-started';
        if (percentage > 0 && percentage < 100) return 'on-progress';
        if (percentage === 100) return 'completed';
        return 'not-started';
    };

    const getUniqueSubjects = () => {
        return [...new Set(packages.map(pkg => pkg.subject))];
    };

    const getUniqueVendors = () => {
        return [...new Set(packages.map(pkg => pkg.vendor_name))];
    };

    const applyFiltersAndSort = () => {
        let filtered = [...packages];

        // Filter by search query (title)
        if (searchQuery.trim()) {
            filtered = filtered.filter(pkg =>
                pkg.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by subject
        if (subjectFilter) {
            filtered = filtered.filter(pkg => pkg.subject === subjectFilter);
        }

        // Filter by vendor
        if (vendorFilter) {
            filtered = filtered.filter(pkg => pkg.vendor_name === vendorFilter);
        }

        // Filter by progress
        if (progressFilter) {
            filtered = filtered.filter(pkg => {
                const status = getProgressStatus(pkg.progress.percentage);
                return status === progressFilter;
            });
        }

        // Sort by progress
        filtered.sort((a, b) => {
            const aProgress = a.progress.percentage;
            const bProgress = b.progress.percentage;
            return sortDirection === 'asc' ? aProgress - bProgress : bProgress - aProgress;
        });

        setFilteredPackages(filtered);
    };


    useEffect(() => {
        applyFiltersAndSort();
    }, [packages, subjectFilter, vendorFilter, progressFilter, sortDirection, searchQuery]);

    const handleSubjectFilterChange = (e) => {
        setSubjectFilter(e.target.value);
    };

    const handleProgressFilterChange = (e) => {
        setProgressFilter(e.target.value);
    };

    const handleSortToggle = () => {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    const handleVendorFilterChange = (e) => {
        setVendorFilter(e.target.value);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
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

            <div className="filters-section">
                <div className="search-group">
                    <label htmlFor="search-input">Search by Title:</label>
                    <input
                        id="search-input"
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search packages by title..."
                        className="search-input"
                    />
                </div>

                <div className="filter-group">
                    <label htmlFor="subject-filter">Subject:</label>
                    <select
                        id="subject-filter"
                        value={subjectFilter}
                        onChange={handleSubjectFilterChange}
                        className="filter-select"
                    >
                        <option value="">All Subjects</option>
                        {getUniqueSubjects().map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="vendor-filter">Vendor:</label>
                    <select
                        id="vendor-filter"
                        value={vendorFilter}
                        onChange={handleVendorFilterChange}
                        className="filter-select"
                    >
                        <option value="">All Vendors</option>
                        {getUniqueVendors().map(vendor => (
                            <option key={vendor} value={vendor}>{vendor}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="progress-filter">Progress:</label>
                    <select
                        id="progress-filter"
                        value={progressFilter}
                        onChange={handleProgressFilterChange}
                        className="filter-select"
                    >
                        <option value="">All Progress</option>
                        <option value="not-started">Not Started Yet</option>
                        <option value="on-progress">On Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <div className="sort-group">
                    <button
                        onClick={handleSortToggle}
                        className="sort-btn"
                    >
                        Sort by Progress {sortDirection === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {packages.length === 0 ? (
                <div className="empty-state">
                    <p>No approved packages available for data entry.</p>
                </div>
            ) : filteredPackages.length === 0 ? (
                <div className="empty-state">
                    <p>No packages match the current filters.</p>
                </div>
            ) : (
                <div className="packages-grid">
                    {filteredPackages.map((pkg) => {
                        const { progress } = pkg;
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