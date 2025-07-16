import { useState } from 'react';

const useQuestionEditor = (initialQuestion = null) => {
    const [editingQuestion, setEditingQuestion] = useState(initialQuestion);
    const [isEditing, setIsEditing] = useState(false);

    const startEdit = (question) => {
        setEditingQuestion(question);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setEditingQuestion(null);
        setIsEditing(false);
    };

    const saveEdit = async (formData, saveCallback) => {
        try {
            if (saveCallback) {
                await saveCallback(formData);
            }
            setEditingQuestion(null);
            setIsEditing(false);
            return true;
        } catch (error) {
            console.error('Error saving question:', error);
            throw error;
        }
    };

    return {
        editingQuestion,
        isEditing,
        startEdit,
        cancelEdit,
        saveEdit
    };
};

export default useQuestionEditor;