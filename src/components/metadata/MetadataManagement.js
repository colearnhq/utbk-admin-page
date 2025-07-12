// src/components/metadata/MetadataManagement.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  getSubjects,
  getChapters,
  getTopics,
  getConceptTitles,
  addSubject,
  addChapter,
  addTopic,
  addConceptTitle,
  updateSubject,
  updateChapter,
  updateTopic,
  updateConceptTitle,
  deleteSubject,
  deleteChapter,
  deleteTopic,
  deleteConceptTitle
} from '../../services/supabase';
import '../../styles/pages/metadata.css';

const MetadataManagement = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('subjects');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [conceptTitles, setConceptTitles] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject_id: '',
    chapter_id: '',
    topic_id: ''
  });
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters(selectedSubject);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      fetchTopics(selectedChapter);
    }
  }, [selectedChapter]);

  useEffect(() => {
    if (selectedTopic) {
      fetchConceptTitles(selectedTopic);
    }
  }, [selectedTopic]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const subjectsData = await getSubjects();
      setSubjects(subjectsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async (subjectId) => {
    try {
      const chaptersData = await getChapters(subjectId);
      setChapters(chaptersData);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchTopics = async (chapterId) => {
    try {
      const topicsData = await getTopics(chapterId);
      setTopics(topicsData);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchConceptTitles = async (topicId) => {
    try {
      const conceptsData = await getConceptTitles(topicId);
      setConceptTitles(conceptsData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (editingItem) {
        await handleUpdate();
      } else {
        await handleCreate();
      }

      setFormData({
        name: '',
        description: '',
        subject_id: '',
        chapter_id: '',
        topic_id: ''
      });
      setEditingItem(null);
      setSuccess('Data berhasil disimpan!');

      // Refresh data
      await refreshCurrentData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    switch (activeTab) {
      case 'subjects':
        await addSubject({
          name: formData.name,
          description: formData.description
        });
        break;
      case 'chapters':
        await addChapter({
          name: formData.name,
          description: formData.description,
          subject_id: selectedSubject
        });
        break;
      case 'topics':
        await addTopic({
          name: formData.name,
          description: formData.description,
          chapter_id: selectedChapter
        });
        break;
      case 'concepts':
        await addConceptTitle({
          name: formData.name,
          description: formData.description,
          topic_id: selectedTopic
        });
        break;
    }
  };

  const handleUpdate = async () => {
    let updateData = {};

    switch (activeTab) {
      case 'subjects':
        updateData = {
          name: formData.name,
          description: formData.description
        };
        await updateSubject(editingItem.id, updateData);
        break;
      case 'chapters':
        updateData = {
          name: formData.name,
          description: formData.description,
          subject_id: selectedSubject
        };
        await updateChapter(editingItem.id, updateData);
        break;
      case 'topics':
        updateData = {
          name: formData.name,
          description: formData.description,
          chapter_id: selectedChapter
        };
        await updateTopic(editingItem.id, updateData);
        break;
      case 'concepts':
        updateData = {
          name: formData.name,
          description: formData.description,
          topic_id: selectedTopic
        };
        await updateConceptTitle(editingItem.id, updateData);
        break;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    try {
      setLoading(true);
      switch (activeTab) {
        case 'subjects':
          await deleteSubject(id);
          break;
        case 'chapters':
          await deleteChapter(id);
          break;
        case 'topics':
          await deleteTopic(id);
          break;
        case 'concepts':
          await deleteConceptTitle(id);
          break;
      }
      setSuccess('Data berhasil dihapus!');
      await refreshCurrentData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);

    switch (activeTab) {
      case 'subjects':
        setFormData({
          name: item.name,
          description: item.description || '',
          subject_id: '',
          chapter_id: '',
          topic_id: ''
        });
        break;
      case 'chapters':
        setFormData({
          name: item.name,
          description: item.description || '',
          subject_id: item.subject_id || '',
          chapter_id: '',
          topic_id: ''
        });
        break;
      case 'topics':
        setFormData({
          name: item.name,
          description: item.description || '',
          subject_id: '',
          chapter_id: item.chapter_id || '',
          topic_id: ''
        });
        break;
      case 'concepts':
        setFormData({
          name: item.name,
          description: item.description || '',
          subject_id: '',
          chapter_id: '',
          topic_id: item.topic_id || ''
        });
        break;
    }
  };
  const refreshCurrentData = async () => {
    switch (activeTab) {
      case 'subjects':
        await fetchInitialData();
        break;
      case 'chapters':
        if (selectedSubject) await fetchChapters(selectedSubject);
        break;
      case 'topics':
        if (selectedChapter) await fetchTopics(selectedChapter);
        break;
      case 'concepts':
        if (selectedTopic) await fetchConceptTitles(selectedTopic);
        break;
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'subjects':
        return subjects;
      case 'chapters':
        return chapters;
      case 'topics':
        return topics;
      case 'concepts':
        return conceptTitles;
      default:
        return [];
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'subjects':
        return 'Mata Pelajaran';
      case 'chapters':
        return 'Bab';
      case 'topics':
        return 'Topik';
      case 'concepts':
        return 'Konsep';
      default:
        return '';
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading && subjects.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="metadata-container">
      <div className="metadata-header">
        <h2>Manajemen Metadata</h2>
        <p>Kelola hierarki subject, chapter, topic, dan concept title</p>
      </div>

      {error && (
        <div className="message error-message">
          <span>{error}</span>
          <button onClick={clearMessages} className="close-btn">×</button>
        </div>
      )}

      {success && (
        <div className="message success-message">
          <span>{success}</span>
          <button onClick={clearMessages} className="close-btn">×</button>
        </div>
      )}

      <div className="metadata-tabs">
        <button
          className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          Subject
        </button>
        <button
          className={`tab-btn ${activeTab === 'chapters' ? 'active' : ''}`}
          onClick={() => setActiveTab('chapters')}
          disabled={!selectedSubject}
        >
          Chapter
        </button>
        <button
          className={`tab-btn ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
          disabled={!selectedChapter}
        >
          Topic
        </button>
        <button
          className={`tab-btn ${activeTab === 'concepts' ? 'active' : ''}`}
          onClick={() => setActiveTab('concepts')}
          disabled={!selectedTopic}
        >
          Concept Title
        </button>
      </div>

      <div className="metadata-content">
        <div className="hierarchy-nav">
          <div className="nav-item">
            <label>Subject:</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedChapter('');
                setSelectedTopic('');
              }}
            >
              <option value="">Pilih Subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {selectedSubject && (
            <div className="nav-item">
              <label>Chapter:</label>
              <select
                value={selectedChapter}
                onChange={(e) => {
                  setSelectedChapter(e.target.value);
                  setSelectedTopic('');
                }}
              >
                <option value="">Pilih Chapter</option>
                {chapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedChapter && (
            <div className="nav-item">
              <label>Topic:</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                <option value="">Pilih Topic</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>{editingItem ? 'Edit' : 'Tambah'} {getTabTitle()}</h3>
          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label>Nama {getTabTitle()}:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Deskripsi:</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : (editingItem ? 'Update' : 'Simpan')}
              </button>
              {editingItem && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setFormData({
                      name: '',
                      description: '',
                      subject_id: '',
                      chapter_id: '',
                      topic_id: ''
                    });
                  }}
                  className="cancel-btn"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="data-section">
          <h3>Daftar {getTabTitle()}</h3>
          <div className="data-list">
            {getCurrentData().length === 0 ? (
              <p className="no-data">Belum ada data {getTabTitle().toLowerCase()}</p>
            ) : (
              getCurrentData().map(item => (
                <div key={item.id} className="data-item">
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    {item.description && <p>{item.description}</p>}
                  </div>
                  <div className="item-actions">
                    <button
                      onClick={() => handleEdit(item)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="delete-btn"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataManagement;