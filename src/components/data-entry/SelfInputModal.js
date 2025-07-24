import { useState } from 'react';

const SelfInputModal = ({
    isOpen,
    onClose,
    onSubmit,
    type,
    parentName,
    isSubmitting = false
}) => {
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    const [errors, setErrors] = useState({});

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        onSubmit({
            name: formData.name.trim(),
            description: formData.description.trim() || null
        });
    };

    const handleClose = () => {
        setFormData({ name: '', description: '' });
        setErrors({});
        onClose();
    };

    const getTypeLabel = () => {
        switch (type) {
            case 'chapter': return 'Chapter';
            case 'topic': return 'Topic';
            case 'concept_title': return 'Concept Title';
            default: return 'Item';
        }
    };

    const getParentLabel = () => {
        switch (type) {
            case 'chapter': return 'Subject';
            case 'topic': return 'Chapter';
            case 'concept_title': return 'Topic';
            default: return 'Parent';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="self-input-modal-overlay" onClick={handleClose}>
            <div className="self-input-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="self-input-modal-header">
                    <h3>Add New {getTypeLabel()}</h3>
                    <button
                        type="button"
                        className="self-input-modal-close"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                <div className="self-input-modal-body">
                    <p className="self-input-modal-info">
                        Adding new {getTypeLabel().toLowerCase()} to <strong>{getParentLabel()}: {parentName}</strong>
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">
                                {getTypeLabel()} Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={errors.name ? 'error' : ''}
                                placeholder={`Enter ${getTypeLabel().toLowerCase()} name`}
                                disabled={isSubmitting}
                                autoFocus
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description (Optional)</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder={`Enter ${getTypeLabel().toLowerCase()} description`}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="self-input-modal-actions">
                            <button
                                type="button"
                                className="btn self-input-modal-btn-secondary"
                                onClick={handleClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creating...' : `Create ${getTypeLabel()}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SelfInputModal;