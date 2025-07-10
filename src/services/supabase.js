// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const getJakartaISOString = () => {
    const now = new Date();
    const jakartaOffset = 7 * 60;
    const jakartaTime = new Date(now.getTime() + (jakartaOffset * 60 * 1000));

    return jakartaTime.toISOString().replace(/Z$/, '+07:00');
};

console.log('Supabase configuration:', {
    url: supabaseUrl,
    key: supabaseAnonKey ? 'Present' : 'Missing'
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration!');
    console.error('REACT_APP_SUPABASE_URL:', supabaseUrl);
    console.error('REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const testConnection = async () => {
    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('Supabase connection test successful');
        return true;
    } catch (error) {
        console.error('Supabase connection test failed:', error);
        return false;
    }
};

export const createUser = async (userData) => {
    console.log('Attempting to create user with data:', userData);

    try {
        const connectionOk = await testConnection();
        if (!connectionOk) {
            throw new Error('Cannot connect to Supabase');
        }

        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            console.error('Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw new Error(`Database error: ${error.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error('User created but no data returned');
        }

        console.log('User created successfully:', data[0]);
        return data[0];
    } catch (err) {
        console.error('Error in createUser function:', err);
        throw err;
    }
};

export const getUserByEmail = async (email) => {
    console.log('Looking up user by email:', email);

    try {
        const connectionOk = await testConnection();
        if (!connectionOk) {
            throw new Error('Cannot connect to Supabase');
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Supabase select error:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        console.log('User lookup result:', data);
        return data;
    } catch (err) {
        console.error('Error in getUserByEmail function:', err);
        throw err;
    }
};

export const getAllUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .is('is_deleted', null)
        .is('deleted_at', null);
    if (error) {
        throw error;
    }
    return data;
};

export const addUser = async (userData) => {
    console.log('Adding new user:', userData);

    try {

        const existingUser = await getUserByEmail(userData.email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select();

        if (error) {
            console.error('Error adding user:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        console.log('User added successfully:', data[0]);
        return data[0];
    } catch (err) {
        console.error('Error in addUser function:', err);
        throw err;
    }
};

export const updateUserRole = async (userId, newRole) => {
    console.log('Updating user role:', userId, newRole);

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId)
            .select();

        if (error) {
            console.error('Error updating user role:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error('User not found');
        }

        console.log('User role updated successfully:', data[0]);
        return data[0];
    } catch (err) {
        console.error('Error in updateUserRole function:', err);
        throw err;
    }
};

export const deleteUser = async (userId) => {
    console.log('Soft deleting user:', userId);

    try {
        const { error } = await supabase
            .from('users')
            .update({ is_deleted: true, deleted_at: getJakartaISOString() })
            .eq('id', userId);

        if (error) {
            console.error('Error soft deleting user:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        console.log('User soft deleted successfully');
        return true;
    } catch (err) {
        console.error('Error in deleteUser function:', err);
        throw err;
    }
};

export const getUsersByRole = async (role) => {
    console.log('Fetching users by role:', role);

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', role)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users by role:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        console.log(`Users with role ${role} fetched successfully:`, data.length);
        return data;
    } catch (err) {
        console.error('Error in getUsersByRole function:', err);
        throw err;
    }
};

export const createQuestionPackage = async (packageData) => {
    try {
        const { data, error } = await supabase
            .from('question_packages')
            .insert([packageData])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            console.error('Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw new Error(`Failed to create question package: ${error.message}`);
        }

        return data[0];
    } catch (error) {
        console.error('Error creating question package:', error);
        throw error;
    }
};

export const getQuestionPackages = async (userId = null) => {
    try {
        let query = supabase
            .from('question_packages')
            .select(`
                *,
                user:uploaded_by (id, name, email)
            `);

        if (userId) {
            query = query.eq('uploaded_by', userId);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching question packages:', error);
        throw error;
    }
};

export const getQuestionPackageStats = async () => {
    try {
        const { data, error } = await supabase
            .from('question_packages')
            .select('status, amount_of_questions')

        if (error) throw error;

        const stats = {
            totalPackages: data.length,
            totalQuestions: data.reduce((sum, pkg) => sum + pkg.amount_of_questions, 0),
            pending: data.filter(pkg => pkg.status === 'pending').length,
            pendingRevision: data.filter(pkg => pkg.status === 'revision').length,
            approved: data.filter(pkg => pkg.status === 'approved').length,
            rejected: data.filter(pkg => pkg.status === 'rejected').length
        };

        return stats;
    } catch (error) {
        console.error('Error fetching package stats:', error);
        throw error;
    }
};

export const updateQuestionPackageStatus = async (packageId, status, feedback = null) => {
    try {
        const updateData = { status };
        if (feedback) updateData.feedback = feedback;

        const { data, error } = await supabase
            .from('question_packages')
            .update(updateData)
            .eq('id', packageId)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error updating package status:', error);
        throw error;
    }
};

export const getQuestionPackageById = async (packageId) => {
    try {
        const { data, error } = await supabase
            .from('question_packages')
            .select(`
                *,
                user:uploaded_by (id, name, email)
            `)
            .eq('id', packageId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching package by ID:', error);
        throw error;
    }
};

export const getSubjects = async () => {
    try {
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching subjects:', error);
        throw error;
    }
};

export const getExams = async () => {
    try {
        const { data, error } = await supabase
            .from('exam_names') // Assuming an 'exams' table exists
            .select('id, name')
            .order('name', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching exams:', error);
        throw error;
    }
};

export const addSubject = async (subjectData) => {
    try {
        const { data, error } = await supabase
            .from('subjects')
            .insert([subjectData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error adding subject:', error);
        throw error;
    }
};

export const updateSubject = async (subjectId, subjectData) => {
    try {
        const { data, error } = await supabase
            .from('subjects')
            .update(subjectData)
            .eq('id', subjectId)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error updating subject:', error);
        throw error;
    }
};

export const deleteSubject = async (subjectId) => {
    try {
        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', subjectId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting subject:', error);
        throw error;
    }
};

export const getChapters = async (subjectId = null) => {
    try {
        let query = supabase
            .from('chapters')
            .select('*')
            .order('name', { ascending: true });

        if (subjectId) {
            query = query.eq('subject_id', subjectId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching chapters:', error);
        throw error;
    }
};

export const addChapter = async (chapterData) => {
    try {
        const { data, error } = await supabase
            .from('chapters')
            .insert([chapterData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error adding chapter:', error);
        throw error;
    }
};

export const updateChapter = async (chapterId, chapterData) => {
    try {
        const { data, error } = await supabase
            .from('chapters')
            .update(chapterData)
            .eq('id', chapterId)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error updating chapter:', error);
        throw error;
    }
};

export const deleteChapter = async (chapterId) => {
    try {
        const { error } = await supabase
            .from('chapters')
            .delete()
            .eq('id', chapterId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting chapter:', error);
        throw error;
    }
};

export const getTopics = async (chapterId = null) => {
    try {
        let query = supabase
            .from('topics')
            .select('*')
            .order('name', { ascending: true });

        if (chapterId) {
            query = query.eq('chapter_id', chapterId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching topics:', error);
        throw error;
    }
};

export const addTopic = async (topicData) => {
    try {
        const { data, error } = await supabase
            .from('topics')
            .insert([topicData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error adding topic:', error);
        throw error;
    }
};

export const updateTopic = async (topicId, topicData) => {
    try {
        const { data, error } = await supabase
            .from('topics')
            .update(topicData)
            .eq('id', topicId)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error updating topic:', error);
        throw error;
    }
};

export const deleteTopic = async (topicId) => {
    try {
        const { error } = await supabase
            .from('topics')
            .delete()
            .eq('id', topicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting topic:', error);
        throw error;
    }
};

export const getConceptTitles = async (topicId = null) => {
    try {
        let query = supabase
            .from('concept_titles')
            .select('*')
            .order('name', { ascending: true });

        if (topicId) {
            query = query.eq('topic_id', topicId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching concept titles:', error);
        throw error;
    }
};

export const addConceptTitle = async (conceptData) => {
    try {
        const { data, error } = await supabase
            .from('concept_titles')
            .insert([conceptData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error adding concept title:', error);
        throw error;
    }
};

export const updateConceptTitle = async (conceptId, conceptData) => {
    try {
        const { data, error } = await supabase
            .from('concept_titles')
            .update(conceptData)
            .eq('id', conceptId)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error updating concept title:', error);
        throw error;
    }
};

export const deleteConceptTitle = async (conceptId) => {
    try {
        const { error } = await supabase
            .from('concept_titles')
            .delete()
            .eq('id', conceptId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting concept title:', error);
        throw error;
    }
};

export const createQuestion = async (questionData) => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .insert([questionData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error creating question:', error);
        throw error;
    }
};

export const getQuestions = async (filters = {}) => {
    try {
        let query = supabase
            .from('questions')
            .select(`
                *,
                subject:subjects(id, name),
                chapter:chapters(id, name),
                topic:topics(id, name),
                concept_title:concept_titles(id, name),
                created_by_user:users!questions_created_by_fkey(id, name),
                revised_by_user:users!questions_revised_by_fkey(id, name)
            `)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.subject_id) {
            query = query.eq('subject_id', filters.subject_id);
        }
        if (filters.question_type) {
            query = query.eq('question_type', filters.question_type);
        }
        if (filters.package_id) {
            query = query.eq('package_id', filters.package_id);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching questions:', error);
        throw error;
    }
};

export const getQuestionById = async (questionId) => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select(`
                *,
                subject:subjects(id, name),
                chapter:chapters(id, name),
                topic:topics(id, name),
                concept_title:concept_titles(id, name),
                created_by_user:users(id, name)
            `)
            .eq('id', questionId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching question by ID:', error);
        throw error;
    }
};

export const updateQuestion = async (questionId, questionData) => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .update(questionData)
            .eq('id', questionId)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error updating question:', error);
        throw error;
    }
};

export const deleteQuestion = async (questionId) => {
    try {
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', questionId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting question:', error);
        throw error;
    }
};

export const getQuestionsByPackage = async (packageId) => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select(`
                *,
                subject:subjects(id, name),
                chapter:chapters(id, name),
                topic:topics(id, name),
                concept_title:concept_titles(id, name)
            `)
            .eq('package_id', packageId)
            .order('sequence_number', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching questions by package:', error);
        throw error;
    }
};

export const getRevisedQuestions = async (userId = null) => {
    try {
        let query = supabase
            .from('questions')
            .select(`
                *,
                subject:subjects(id, name),
                chapter:chapters(id, name),
                topic:topics(id, name),
                concept_title:concept_titles(id, name),
                created_by_user:users!questions_created_by_fkey(id, name),
                revised_by_user:users!questions_revised_by_fkey(id, name)
            `)
            .eq('status', 'revised')
            .order('updated_at', { ascending: false });

        if (userId) {
            query = query.eq('created_by', userId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching revised questions:', error);
        throw error;
    }
};

export const getNextSequenceNumber = async (packageId) => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('sequence_number')
            .eq('package_id', packageId)
            .order('sequence_number', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data.length === 0) {
            return 100; // Start from 100
        }

        return data[0].sequence_number + 1;
    } catch (error) {
        console.error('Error getting next sequence number:', error);
        throw error;
    }
};

export const createRevision = async (revisionData) => {
    try {
        const remarks = revisionData.question_id ? 'Acceptance' : 'Request';
        const dataToInsert = { ...revisionData, remarks };

        // Add validation
        const validRoles = ['question_maker', 'metadata', 'administrator'];
        if (!validRoles.includes(dataToInsert.target_role)) {
            throw new Error(`Invalid target_role: ${dataToInsert.target_role}. Must be one of: ${validRoles.join(', ')}`);
        }

        console.log('Creating revision with data:', dataToInsert);

        const { data, error } = await supabase
            .from('revisions')
            .insert([dataToInsert])
            .select();

        if (error) {
            console.error('Supabase error details:', error);
            throw error;
        }
        return data[0];
    } catch (error) {
        console.error('Error creating revision:', error);
        throw error;
    }
};

export const getRevisions = async (filters = {}) => {
    try {
        let query = supabase
            .from('revisions')
            .select(`
                *,
                package:question_packages(id, title, subject),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name)
            `)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.target_role) {
            query = query.eq('target_role', filters.target_role);
        }
        if (filters.requested_by) {
            query = query.eq('requested_by', filters.requested_by);
        }
        if (filters.question_id_is_null !== undefined) {
            if (filters.question_id_is_null) {
                query = query.is('question_id', null);
            } else {
                query = query.not('question_id', 'is', null);
            }
        }
        if (filters.remarks) {
            query = query.eq('remarks', filters.remarks);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching revision requests:', error);
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Error in getRevisions function:', error);
        throw error;
    }
};

export const uploadFileToSupabase = async (file, bucketName, fileName) => {
    console.log(`cek bucket_name: ${bucketName}`)
    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file);

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return {
            path: data.path,
            publicUrl: publicUrlData.publicUrl
        };
    } catch (error) {
        console.error('Error uploading to Supabase:', error);
        throw error;
    }
};

export const uploadFileToGoogleDrive = async (file, fileName, folderId = '1pbcUpMh1CJazNHJFAmw9mWUA7y06zjk_') => {
    try {
        // Dynamically import the Google Drive service
        const { uploadFileToGoogleDrive: uploadToGoogleDrive } = await import('./googleDriveService');

        // All logic, including auth, is now handled within the imported function.
        const result = await uploadToGoogleDrive(file, fileName, folderId);
        return result;
    } catch (error) {
        // The error from googleDriveService will propagate up.
        console.error('Error during Google Drive upload process:', error);
        throw error;
    }
};

export const generateUniqueFileName = (originalName, prefix = '') => {
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.split('.').slice(0, -1).join('.');

    return `${prefix}${nameWithoutExt}_${timestamp}_${randomString}.${extension}`;
};

export const getRevisionRequests = async () => {
    try {
        const { data, error } = await supabase
            .from('revisions')
            .select(`
                id,
                package_id,
                question_id,
                target_role,
                notes,
                evidence_file_url,
                attachment_type,
                attachment_name,
                status,
                response_notes,
                responded_by,
                responded_at,
                requested_by,
                created_at,
                updated_at,
                remarks,
                keywords,
                revision_type,
                question:questions(
                    id,
                    inhouse_id,
                    question_type,
                    question,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    option_e,
                    correct_option,
                    correct_answer,
                    solution,
                    subject:subjects(id, name),
                    chapter:chapters(id, name),
                    topic:topics(id, name),
                    concept_title:concept_titles(id, name)
                ),
                package:question_packages(id, title),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name, email),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name, email)
            `)
            .eq('revision_type', 'request')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching revision requests:', error);
        throw error;
    }
};


export const getRevisionAcceptances = async () => {
    try {
        const { data, error } = await supabase
            .from('revisions')
            .select(`
                id,
                package_id,
                question_id,
                target_role,
                notes,
                evidence_file_url,
                attachment_type,
                attachment_name,
                status,
                response_notes,
                responded_by,
                responded_at,
                requested_by,
                created_at,
                updated_at,
                remarks,
                keywords,
                revision_type,
                question:questions(
                    id,
                    inhouse_id,
                    question_type,
                    question,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    option_e,
                    correct_option,
                    correct_answer,
                    solution,
                    subject:subjects(id, name),
                    chapter:chapters(id, name),
                    topic:topics(id, name),
                    concept_title:concept_titles(id, name)
                ),
                package:question_packages(id, title),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name, email),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name, email)
            `)
            .eq('revision_type', 'acceptance')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching revision acceptances:', error);
        throw error;
    }
};

// Update revision request
export const updateRevisionRequest = async (id, updateData) => {
    try {
        const { data, error } = await supabase
            .from('revisions')
            .update({
                notes: updateData.notes,
                evidence_file_url: updateData.evidence_file_url,
                attachment_type: updateData.attachment_type,
                attachment_name: updateData.attachment_name,
                target_role: updateData.target_role,
                remarks: updateData.remarks,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('revision_type', 'request')
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating revision request:', error);
        throw error;
    }
};

// Update revision acceptance (update question and mark revision as completed)
export const updateRevisionAcceptance = async (revisionId, questionData) => {
    try {
        // Start a transaction-like operation
        // First, get the revision to get the question_id
        const { data: revision, error: revisionError } = await supabase
            .from('revisions')
            .select('question_id')
            .eq('id', revisionId)
            .eq('revision_type', 'acceptance')
            .single();

        if (revisionError) throw revisionError;

        // Update the question
        const { data: updatedQuestion, error: questionError } = await supabase
            .from('questions')
            .update({
                question_type: questionData.question_type,
                question: questionData.question,
                option_a: questionData.option_a,
                option_b: questionData.option_b,
                option_c: questionData.option_c,
                option_d: questionData.option_d,
                option_e: questionData.option_e,
                correct_option: questionData.correct_option,
                correct_answer: questionData.correct_answer,
                solution: questionData.solution,
                subject_id: questionData.subject_id,
                chapter_id: questionData.chapter_id,
                topic_id: questionData.topic_id,
                concept_title_id: questionData.concept_title_id,
                status: 'active', // Reactivate the question
                updated_at: new Date().toISOString()
            })
            .eq('id', revision.question_id)
            .select();

        if (questionError) throw questionError;

        const { data: updatedRevision, error: revisionUpdateError } = await supabase
            .from('revisions')
            .update({
                status: 'completed',
                response_notes: 'Question has been updated and reactivated',
                responded_by: questionData.responded_by || null, // Should be current user ID
                responded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', revisionId)
            .select();

        if (revisionUpdateError) throw revisionUpdateError;

        return {
            question: updatedQuestion[0],
            revision: updatedRevision[0]
        };
    } catch (error) {
        console.error('Error updating revision acceptance:', error);
        throw error;
    }
};

// Additional helper function to create a new revision request
export const createRevisionRequest = async (requestData) => {
    try {
        const { data, error } = await supabase
            .from('revisions')
            .insert({
                package_id: requestData.package_id,
                question_id: requestData.question_id,
                target_role: requestData.target_role,
                notes: requestData.notes,
                evidence_file_url: requestData.evidence_file_url,
                attachment_type: requestData.attachment_type,
                attachment_name: requestData.attachment_name,
                keywords: requestData.keywords,
                revision_type: 'request',
                requested_by: requestData.requested_by,
                status: 'pending'
            })
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating revision request:', error);
        throw error;
    }
};

// Additional helper function to create a new revision acceptance
export const createRevisionAcceptance = async (acceptanceData) => {
    try {
        const { data, error } = await supabase
            .from('revisions')
            .insert({
                package_id: acceptanceData.package_id,
                question_id: acceptanceData.question_id,
                target_role: 'question_maker', // Since this is acceptance, target is question_maker
                notes: acceptanceData.rejection_notes,
                evidence_file_url: acceptanceData.evidence_file_url,
                attachment_type: acceptanceData.attachment_type,
                attachment_name: acceptanceData.attachment_name,
                keywords: acceptanceData.keywords,
                revision_type: 'acceptance',
                requested_by: acceptanceData.reported_by,
                status: 'pending'
            })
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating revision acceptance:', error);
        throw error;
    }
};

export const getRevisionById = async (id) => {
    try {
        const { data, error } = await supabase
            .from('revisions')
            .select(`
                id,
                package_id,
                question_id,
                target_role,
                notes,
                evidence_file_url,
                attachment_type,
                attachment_name,
                status,
                response_notes,
                responded_by,
                responded_at,
                requested_by,
                created_at,
                updated_at,
                remarks,
                keywords,
                revision_type,
                question:questions(
                    id,
                    inhouse_id,
                    question_type,
                    question,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    option_e,
                    correct_option,
                    correct_answer,
                    solution,
                    subject:subjects(id, name),
                    chapter:chapters(id, name),
                    topic:topics(id, name),
                    concept_title:concept_titles(id, name)
                ),
                package:question_packages(id, name),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name, email),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name, email)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching revision by ID:', error);
        throw error;
    }
};


export const updateRevisionStatus = async (id, status, responseNotes = null, respondedBy = null, fileData = []) => {
    try {
        const updateData = {
            status,
            updated_at: getJakartaISOString()
        };

        if (responseNotes) {
            updateData.response_notes = responseNotes;
        }

        if (respondedBy) {
            updateData.responded_by = respondedBy;
            updateData.responded_at = getJakartaISOString();
        }

        if (fileData && fileData.length > 0) {
            updateData.revision_attachment_urls = JSON.stringify(fileData);
        }

        const { data, error } = await supabase
            .from('revisions')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                package:question_packages(id, title, subject),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name)
            `);

        if (error) {
            console.error('Error updating revision status:', error);
            throw error;
        }

        return data[0];
    } catch (error) {
        console.error('Error in updateRevisionStatus function:', error);
        throw error;
    }
};


export const getRevisionsByUser = async (userId, filters = {}) => {
    try {
        let query = supabase
            .from('revisions')
            .select(`
                id,
                package_id,
                question_id,
                target_role,
                notes,
                evidence_file_url,
                attachment_type,
                attachment_name,
                status,
                response_notes,
                responded_by,
                responded_at,
                requested_by,
                created_at,
                updated_at,
                remarks,
                keywords,
                revision_type,
                revision_attachment_urls,
                question:questions(
                    id,
                    inhouse_id,
                    question_type,
                    question,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    option_e,
                    correct_option,
                    correct_answer,
                    solution,
                    subject:subjects(id, name),
                    chapter:chapters(id, name),
                    topic:topics(id, name),
                    concept_title:concept_titles(id, name)
                ),
                package:question_packages(id, title),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name, email),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name, email)
            `)
            .eq('requested_by', userId)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.revision_type) {
            query = query.eq('revision_type', filters.revision_type);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching revisions by user:', error);
        throw error;
    }
};

export const getRevisionsByTargetRole = async (targetRole, filters = {}) => {
    try {
        let query = supabase
            .from('revisions')
            .select(`
                id,
                package_id,
                question_id,
                target_role,
                notes,
                evidence_file_url,
                attachment_type,
                attachment_name,
                status,
                response_notes,
                responded_by,
                responded_at,
                requested_by,
                created_at,
                updated_at,
                remarks,
                keywords,
                revision_type,
                question:questions(
                    id,
                    inhouse_id,
                    question_type,
                    question,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    option_e,
                    correct_option,
                    correct_answer,
                    solution,
                    subject:subjects(id, name),
                    chapter:chapters(id, name),
                    topic:topics(id, name),
                    concept_title:concept_titles(id, name)
                ),
                package:question_packages(id, title),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name, email),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name, email)
            `)
            .eq('target_role', targetRole)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.revision_type) {
            query = query.eq('revision_type', filters.revision_type);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching revisions by target role:', error);
        throw error;
    }
};

export const getRevisionsWithAttachments = async (filters = {}) => {
    try {
        let query = supabase
            .from('revisions')
            .select(`
                *,
                package:question_packages(id, title, subject),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name)
            `)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.target_role) {
            query = query.eq('target_role', filters.target_role);
        }
        if (filters.requested_by) {
            query = query.eq('requested_by', filters.requested_by);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching revisions:', error);
            throw error;
        }

        const revisionsWithParsedAttachments = data.map(revision => {
            try {
                if (revision.response_attachments) {
                    revision.response_attachments = JSON.parse(revision.response_attachments);
                }
            } catch (parseError) {
                console.warn('Failed to parse response_attachments for revision:', revision.id, parseError);
                revision.response_attachments = [];
            }
            return revision;
        });

        return revisionsWithParsedAttachments;
    } catch (error) {
        console.error('Error in getRevisionsWithAttachments function:', error);
        throw error;
    }
};

export const createRevisionWithAttachments = async (revisionData, attachments = []) => {
    try {
        const dataToInsert = { ...revisionData };

        // Add attachments if provided
        if (attachments.length > 0) {
            dataToInsert.response_attachments = JSON.stringify(attachments);
        }

        const { data, error } = await supabase
            .from('revisions')
            .insert([dataToInsert])
            .select(`
                *,
                package:question_packages(id, title, subject),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name)
            `);

        if (error) {
            console.error('Error creating revision:', error);
            throw error;
        }

        // Parse response_attachments for the created revision
        const createdRevision = data[0];
        if (createdRevision.response_attachments) {
            try {
                createdRevision.response_attachments = JSON.parse(createdRevision.response_attachments);
            } catch (parseError) {
                console.warn('Failed to parse response_attachments:', parseError);
                createdRevision.response_attachments = [];
            }
        }

        return createdRevision;
    } catch (error) {
        console.error('Error in createRevisionWithAttachments function:', error);
        throw error;
    }
};

export const deleteRevisionAttachments = async (attachments, bucketName = 'revision-evidence') => {
    try {
        const deleteResults = [];

        for (const attachment of attachments) {
            try {
                // Extract file path from URL or use path directly
                const filePath = attachment.path || attachment.url.split('/').pop();

                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .remove([filePath]);

                deleteResults.push({
                    file: attachment.name,
                    success: !error,
                    error: error?.message || null
                });

                if (error) {
                    console.warn(`Failed to delete file ${attachment.name}:`, error);
                }
            } catch (fileError) {
                deleteResults.push({
                    file: attachment.name,
                    success: false,
                    error: fileError.message
                });
            }
        }

        return {
            success: true,
            results: deleteResults
        };
    } catch (error) {
        console.error('Error deleting revision attachments:', error);
        return {
            success: false,
            results: [],
            error: error.message
        };
    }
};
