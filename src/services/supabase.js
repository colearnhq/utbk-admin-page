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
                id, title, question_package_number, subject, vendor_name, amount_of_questions, status, user:uploaded_by (id, name, email)
            `)
            .eq('status', 'pending');

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


export const getPackagesWithProgress = async (userId = null) => {
    try {
        let { data: packages, error: packagesError } = await supabase
            .from('question_packages')
            .select('*')
            .order('created_at', { ascending: false });

        if (packagesError) throw packagesError;

        if (!packages || packages.length === 0) {
            return [];
        }

        const packagesWithProgress = packages.map(pkg => {
            const createdQuestions = pkg.question_created;
            const revisedQuestions = pkg.question_revised;
            const totalQuestions = pkg.amount_of_questions;

            return {
                ...pkg,
                progress: {
                    created: createdQuestions,
                    revised: revisedQuestions,
                    total: totalQuestions,
                    percentage: totalQuestions > 0 ? (createdQuestions / totalQuestions) * 100 : 0,
                }
            };
        });

        return packagesWithProgress;

    } catch (error) {
        console.error('Error fetching packages with progress:', error);
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
            .from('exam_names')
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

// Tambahkan fungsi untuk menghitung questions berdasarkan status QC
export const getQuestionsCountByQCStatus = async (filters = {}) => {
    try {
        // Query untuk available questions (pending_review)
        let availableQuery = supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('qc_status', 'pending_review');

        // Query untuk under review questions
        let underReviewQuery = supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('qc_status', 'under_qc_review');

        // Apply additional filters if provided
        if (filters.subject_id) {
            availableQuery = availableQuery.eq('subject_id', filters.subject_id);
            underReviewQuery = underReviewQuery.eq('subject_id', filters.subject_id);
        }

        if (filters.chapter_id) {
            availableQuery = availableQuery.eq('chapter_id', filters.chapter_id);
            underReviewQuery = underReviewQuery.eq('chapter_id', filters.chapter_id);
        }

        if (filters.topic_id) {
            availableQuery = availableQuery.eq('topic_id', filters.topic_id);
            underReviewQuery = underReviewQuery.eq('topic_id', filters.topic_id);
        }

        if (filters.qc_reviewer_id) {
            // Only apply to under review (available questions don't have reviewer yet)
            underReviewQuery = underReviewQuery.eq('qc_reviewer_id', filters.qc_reviewer_id);
        }

        if (filters.search) {
            availableQuery = availableQuery.ilike('inhouse_id', `%${filters.search}%`);
            underReviewQuery = underReviewQuery.ilike('inhouse_id', `%${filters.search}%`);
        }

        // Execute both queries in parallel
        const [availableResult, underReviewResult] = await Promise.all([
            availableQuery,
            underReviewQuery
        ]);

        if (availableResult.error) throw availableResult.error;
        if (underReviewResult.error) throw underReviewResult.error;

        return {
            available: availableResult.count || 0,
            under_review: underReviewResult.count || 0
        };

    } catch (error) {
        console.error('Error counting questions by QC status:', error);
        throw error;
    }
};

// Fungsi untuk menghitung berdasarkan status tertentu saja (lebih efisien untuk single status)
export const getQuestionsCountByStatus = async (qcStatus, filters = {}) => {
    try {
        let query = supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('qc_status', qcStatus);

        // Apply filters
        if (filters.subject_id) {
            query = query.eq('subject_id', filters.subject_id);
        }

        if (filters.chapter_id) {
            query = query.eq('chapter_id', filters.chapter_id);
        }

        if (filters.topic_id) {
            query = query.eq('topic_id', filters.topic_id);
        }

        if (filters.qc_reviewer_id && qcStatus === 'under_qc_review') {
            query = query.eq('qc_reviewer_id', filters.qc_reviewer_id);
        }

        if (filters.search) {
            query = query.ilike('inhouse_id', `%${filters.search}%`);
        }

        const { count, error } = await query;

        if (error) throw error;

        return count || 0;

    } catch (error) {
        console.error(`Error counting questions with status ${qcStatus}:`, error);
        throw error;
    }
};

export const getQuestionsWithFilters = async (filters = {}, options = {}) => {
    const {
        page = 1,
        limit = 10,
        status = 'all',
        subject = 'all',
        questionType = 'all',
        pic = 'all',
        search = ''
    } = { ...filters, ...options };

    try {
        let query = supabase
            .from('questions')
            .select(`
                *,
                subject:subjects(id, name),
                chapter:chapters(id, name),
                topic:topics(id, name),
                concept_title:concept_titles(id, name),
                created_by:users!questions_created_by_fkey(id, name),
                package:question_packages(id, title, public_url)
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            const statusValue = status === 'on_review' ? 'active' : status;
            query = query.eq('status', statusValue);
        }

        if (subject !== 'all') {
            query = query.eq('subject_id', subject);
        }

        if (questionType !== 'all') {
            query = query.eq('question_type', questionType);
        }

        if (pic !== 'all') {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .is('is_deleted', null)
                .eq('name', pic)
                .single();

            if (!userError && userData) {
                query = query.eq('created_by', userData.id);
            }
        }

        if (search.trim()) {
            const { data: packageData, error: packageError } = await supabase
                .from('question_packages')
                .select('id')
                .ilike('title', `%${search.trim()}%`);

            let inhouseIdMatches = [];
            const { data: inhouseData, error: inhouseError } = await supabase
                .from('questions')
                .select('id')
                .ilike('inhouse_id', `%${search.trim()}%`);

            if (!packageError && packageData && packageData.length > 0) {
                const packageIds = packageData.map(pkg => pkg.id);
                query = query.in('package_id', packageIds);
            }

            if (!inhouseError && inhouseData && inhouseData.length > 0) {
                const questionIds = inhouseData.map(q => q.id);
                const packageIds = packageData.map(pkg => pkg.id);
                if (query.filters && query.filters.length > 0) {
                    query = query.or(`package_id.in.(${packageIds.join(',')}),id.in.(${questionIds.join(',')})`);
                } else {
                    query = query.in('id', questionIds);
                }
            }
            if (
                (!packageData || packageData.length === 0) &&
                (!inhouseData || inhouseData.length === 0)
            ) {
                return {
                    questions: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                };
            }
        }

        const startIndex = (page - 1) * limit;
        query = query.range(startIndex, startIndex + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            questions: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };

    } catch (error) {
        console.error('Error fetching questions with filters:', error);
        throw error;
    }
};


export const getQuestionsStats = async (filters = {}) => {
    const {
        subject = 'all',
        questionType = 'all',
        pic = 'all',
        search = ''
    } = filters;

    try {
        let query = supabase
            .from('questions')
            .select('status, created_by:users!questions_created_by_fkey(name), package:question_packages(title)', { count: 'exact' });

        if (subject !== 'all') {
            query = query.eq('subject_id', subject);
        }

        if (questionType !== 'all') {
            query = query.eq('question_type', questionType);
        }

        if (pic !== 'all') {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .is('is_deleted', null)
                .eq('name', pic)
                .single();

            if (!userError && userData) {
                query = query.eq('created_by', userData.id)
            }
        }

        if (search.trim()) {
            const { data: packageData, error: packageError } = await supabase
                .from('question_packages')
                .select('id')
                .ilike('title', `%${search.trim()}%`);

            let inhouseIdMatches = [];
            const { data: inhouseData, error: inhouseError } = await supabase
                .from('questions')
                .select('id')
                .ilike('inhouse_id', `%${search.trim()}%`);

            if (!packageError && packageData && packageData.length > 0) {
                const packageIds = packageData.map(pkg => pkg.id);
                query = query.in('package_id', packageIds);
            }

            if (!inhouseError && inhouseData && inhouseData.length > 0) {
                const questionIds = inhouseData.map(q => q.id);
                const packageIds = packageData.map(pkg => pkg.id);
                if (query.filters && query.filters.length > 0) {
                    query = query.or(`package_id.in.(${packageIds.join(',')}),id.in.(${questionIds.join(',')})`);
                } else {
                    query = query.in('id', questionIds);
                }
            }
        }

        const { data, error, count } = await query;

        if (error) throw error;

        const total = count || 0;
        const on_review = data?.filter(q => q.status === 'active').length || 0;
        const revised = data?.filter(q => q.status === 'revised').length || 0;
        const edited = data?.filter(q => q.status === 'edited').length || 0;
        const qc_passed = data?.filter(q => q.status === 'qc_passed').length || 0;

        return {
            total,
            on_review,
            revised,
            edited,
            qc_passed
        };

    } catch (error) {
        console.error('Error fetching questions stats:', error);
        throw error;
    }
};

export const getQuestionPICs = async () => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select(`
                created_by:users!questions_created_by_fkey(
                    id,
                    name
                )
            `)
            .not('created_by', 'is', null);

        if (error) throw error;

        // Extract unique PICs and sort them
        const pics = [...new Set(
            data?.map(q => q.created_by?.name).filter(Boolean) || []
        )].sort();

        return pics;

    } catch (error) {
        console.error('Error fetching PICs:', error);
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

export const getCurrentQuestion = async (qId) => {
    try {
        const { data: currentQuestion, error: fetchError } = await supabase
            .from('questions')
            .select('qc_status, qc_reviewer_id')
            .eq('id', qId)
            .single();

        if (fetchError) {
            throw new Error('Failed to verify question status: ' + fetchError.message);
        }

        return { currentQuestion, fetchError };
    } catch (e) {
        console.error('Error releasing question from review:', e);
        alert(e.message || 'Failed to release question. Please try again.');
    }
}

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
            .select('id, status, package_id')
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

        const validRoles = ['question_maker', 'metadata', 'administrator'];
        if (!validRoles.includes(dataToInsert.target_role)) {
            throw new Error(`Invalid target_role: ${dataToInsert.target_role}. Must be one of: ${validRoles.join(', ')}`);
        }


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
                package:question_packages(id, title, subject, public_url, vendor_name),
                question:questions(
                    id,
                    inhouse_id,
                    question_type,
                    question_number,
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
                requested_by_user:users!revision_requests_requested_by_fkey(id, name),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name)
            `)
            .order('created_at', { ascending: false });

        if (filters.vendor) {
            const { data: packages, error: pkgError } = await supabase
                .from('question_packages')
                .select('id')
                .eq('vendor_name', filters.vendor);

            if (pkgError) throw pkgError;

            const packageIds = packages.map(p => p.id);
            if (packageIds.length > 0) {
                query = query.in('package_id', packageIds);
            } else {
                return []; // No packages for this vendor, so no revisions
            }
        }

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

export const getVendors = async () => {
    try {
        const { data, error } = await supabase
            .from('question_packages')
            .select('vendor_name');

        if (error) throw error;

        const vendors = [...new Set(data.map(item => item.vendor_name).filter(Boolean))];
        return vendors.map(vendor => ({ id: vendor, name: vendor }));
    } catch (error) {
        console.error('Error fetching vendors:', error);
        throw error;
    }
};

export const uploadFileToSupabase = async (file, bucketName, fileName) => {
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
            .eq('revision_type', 'acceptance')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching revision acceptances:', error);
        throw error;
    }
};

export const updateRevisionRequest = async (id, updateData) => {
    try {
        const { data, error } = await supabase
            .from('revisions')
            .update({
                notes: updateData.notes,
                evidence_file_url: updateData.evidence_file_url,
                target_role: updateData.target_role,
                remarks: updateData.remarks,
                updated_at: new Date().toISOString(),
                revision_attachment_urls: updateData.revision_attachment_urls // Tambahkan ini
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

export const updateRevisionAcceptance = async (revisionId, questionData, respondedId) => {
    try {
        const { data: revision, error: revisionError } = await supabase
            .from('revisions')
            .select('question_id')
            .eq('id', revisionId)
            .in('revision_type', ['acceptance', 'recreation'])
            .single();

        if (revisionError) throw revisionError;


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
                status: 'active',
                qc_status: 'under_review',
                question_attachments: questionData.question_attachments || [],
                solution_attachments: questionData.solution_attachments || [],
                updated_at: getJakartaISOString()
            })
            .eq('id', revision.question_id)
            .select();

        if (questionError) throw questionError;

        const { data: updatedRevision, error: revisionUpdateError } = await supabase
            .from('revisions')
            .update({
                status: 'completed',
                response_notes: 'Question has been updated and reactivated',
                responded_by: questionData.responded_by || respondedId,
                responded_at: getJakartaISOString(),
                updated_at: getJakartaISOString()
            })
            .eq('id', revisionId)
            .select();

        if (revisionUpdateError) throw revisionUpdateError;

        const { data: updatedQCReview, error: qcReviewError } = await supabase
            .from('qc_reviews')
            .update({
                status: 'under_review',
                updated_at: getJakartaISOString()
            })
            .eq('question_id', revision.question_id)
            .select();

        if (qcReviewError) throw qcReviewError;

        return {
            question: updatedQuestion[0],
            revision: updatedRevision[0],
            qc_review: updatedQCReview[0]
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
                keywords: requestData.keywords,
                revision_type: 'request',
                requested_by: requestData.requested_by,
                status: 'pending',
                revision_attachment_urls: requestData.revision_attachment_urls
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
                keywords: acceptanceData.keywords,
                revision_type: 'acceptance',
                requested_by: acceptanceData.reported_by,
                status: 'pending',
                revision_attachment_urls: acceptanceData.revision_attachment_urls
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

        const updateQuestion = {
            package_url_status: 'revised',
            public_url: fileData[0]?.url
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

        const { data: revisionData, error: revisionError } = await supabase
            .from('revisions')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                package:question_packages(id, title, subject),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name)
            `);

        if (revisionError) {
            console.error('Error updating revision status:', revisionError);
            throw revisionError;
        }

        const { data: questionData, error: questionError } = await supabase
            .from('question_packages')
            .update(updateQuestion)
            .eq('id', revisionData[0].package_id)
            .select('*');

        if (questionError) throw questionError;

        return revisionData[0];
    } catch (error) {
        console.error('Error in updateRevisionStatus function:', error);
        throw error;
    }
};


export const getRevisionsByUser = async (userId, filters = {}, options = {}) => {
    try {
        const { from, to } = options;

        let query = supabase
            .from('revisions')
            .select(`
                id,
                package_id,
                question_id,
                target_role,
                notes,
                evidence_file_url,
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
                    exam,
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
                package:question_packages(id, title, subject),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name, email),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name, email)
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.revision_type) {
            query = query.eq('revision_type', filters.revision_type);
        }

        if (from !== undefined && to !== undefined) {
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching revisions by user:', error);
        throw error;
    }
};


export const getRevisionsByTargetRole = async (targetRole, filters = {}, options = {}) => {
    try {
        const { from, to } = options;

        let query = supabase
            .from('revisions')
            .select(`
                id,
                package_id,
                question_id,
                target_role,
                notes,
                evidence_file_url,
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
                    question_number,
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
                    question_attachments,
                    solution_attachments,
                    subject:subjects(id, name),
                    chapter:chapters(id, name),
                    topic:topics(id, name),
                    concept_title:concept_titles(id, name),
                    created_by_user:users!questions_created_by_fkey(id, name, email)
                ),
                package:question_packages(id, title, public_url),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name, email),
                responded_by_user:users!revision_requests_responded_by_fkey(id, name, email)
            `, { count: 'exact' })
            .eq('target_role', targetRole)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.revision_type) {
            query = query.in('revision_type', filters.revision_type);
        }

        if (from !== undefined && to !== undefined) {
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

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
                package:question_packages(id, title, subject, public_url),
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

// QC Data specific functions
export const getQCUsers = async () => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('role', 'qc_data')
            .is('is_deleted', null)
            .order('name', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching QC users:', error);
        throw error;
    }
};

export const getQCStatistics = async () => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('qc_status');

        if (error) throw error;

        const stats = {
            totalQuestions: data.length,
            pendingReview: data.filter(q => q.qc_status === 'pending_review').length,
            underReview: data.filter(q => (q.qc_status === 'under_qc_review' || q.qc_status === 'under_review')).length,
            approved: data.filter(q => q.qc_status === 'approved').length,
            rejected: data.filter(q => q.qc_status === 'rejected').length,
            revisionRequested: data.filter(q => q.qc_status === 'revision_requested').length,
            recreateQuestion: data.filter(q => q.qc_status === 'recreate_question').length
        };

        return stats;
    } catch (error) {
        console.error('Error fetching QC statistics:', error);
        throw error;
    }
};


export const markQuestionAsUnderReview = async (questionId, reviewerId) => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .update({
                qc_status: 'under_qc_review',
                qc_reviewer_id: reviewerId,
                qc_review_started_at: new Date().toISOString()
            })
            .eq('id', questionId)
            .eq('qc_status', 'pending_review')
            .is('qc_reviewer_id', null)
            .select();

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error('Question may have already been taken by another reviewer');
        }

        return data[0];
    } catch (error) {
        console.error('Error marking question as under review:', error);
        throw error;
    }
};


export const getQuestionsForQC = async (status, filters = {}, options = {}) => {
    const {
        excludeUnderReview = false,
        showOnlyMyReviews = false,
        reviewerId,
        page = 1,
        limit = 10
    } = options;

    try {
        let query = supabase
            .from('questions')
            .select(`
                *,
                subject_name:subjects(name),
                chapter_name:chapters(name),
                topic_name:topics(name),
                concept_title_name:concept_titles(name),
                creator_name:users!questions_created_by_fkey(name),
                qc_reviewer_name:users!questions_qc_reviewer_id_fkey(name)
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        if (status === 'under_qc_review') {
            query = query.eq('qc_status', 'under_qc_review');
        } else if (status === 'pending_review' && excludeUnderReview) {
            query = query.eq('qc_status', 'pending_review');
        } else {
            if (Array.isArray(status)) {
                query = query.in('qc_status', status);
            } else {
                query = query.eq('qc_status', status);
            }
        }

        if (filters.subject) {
            query = query.eq('subject_id', filters.subject);
        }
        if (filters.chapter) {
            query = query.eq('chapter_id', filters.chapter);
        }
        if (filters.topic) {
            query = query.eq('topic_id', filters.topic);
        }
        if (filters.qc_reviewer) {
            query = query.eq('qc_reviewer_id', filters.qc_reviewer);
        }
        if (filters.search) {
            query = query.ilike('inhouse_id', `%${filters.search}%`);
        }

        if (showOnlyMyReviews && reviewerId) {
            query = query.eq('qc_reviewer_id', reviewerId);
        }

        const startIndex = (page - 1) * limit;
        query = query.range(startIndex, startIndex + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        const transformedData = data?.map(question => ({
            ...question,
            subject_name: question.subject_name?.name || 'Unknown',
            chapter_name: question.chapter_name?.name || 'Unknown',
            topic_name: question.topic_name?.name || 'Unknown',
            concept_title_name: question.concept_title_name?.name || 'Unknown',
            creator_name: question.creator_name?.name || 'Unknown',
            qc_reviewer_name: question.qc_reviewer_name?.name || null
        })) || [];

        return {
            questions: transformedData,
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };

    } catch (error) {
        console.error('Error fetching questions for QC:', error);
        throw error;
    }
};

export const getQCReviewersFromQuestions = async () => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select(`
                qc_reviewer_id,
                qc_reviewer_name:users!questions_qc_reviewer_id_fkey(name)
            `)
            .not('qc_reviewer_id', 'is', null);

        if (error) throw error;

        const uniqueReviewers = [];
        const seen = new Set();

        data?.forEach(item => {
            if (item.qc_reviewer_id && !seen.has(item.qc_reviewer_id)) {
                seen.add(item.qc_reviewer_id);
                uniqueReviewers.push({
                    id: item.qc_reviewer_id,
                    name: item.qc_reviewer_name?.name || 'Unknown'
                });
            }
        });

        return uniqueReviewers;
    } catch (error) {
        console.error('Error fetching QC reviewers from questions:', error);
        throw error;
    }
};


export const releaseQuestionFromReview = async (questionId, reviewerId) => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .update({
                qc_status: 'pending_review',
                qc_reviewer_id: null,
                qc_review_started_at: null
            })
            .eq('id', questionId)
            .eq('qc_reviewer_id', reviewerId);

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error releasing question from review:', error);
        throw error;
    }
};

export const getQuestionsForRecreation = async (userId = null) => {
    try {
        let query = supabase
            .from('revisions')
            .select(`
                *,
                question:questions(
                    *,
                    subject:subjects(id, name),
                    chapter:chapters(id, name),
                    topic:topics(id, name),
                    concept_title:concept_titles(id, name)
                ),
                package:question_packages(id, title),
                requested_by_user:users!revision_requests_requested_by_fkey(id, name, email)
            `)
            .eq('revision_type', 'recreation')
            .eq('status', 'pending')
            .eq('remarks', 'RECREATE_QUESTION')
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching questions for recreation:', error);
        throw error;
    }
};

const convertQCStatusToQuestionStatus = (status) => {
    const statuses = {
        "approved": "qc_passed",
        "rejected": "revised"
    };

    return statuses[status];
}

export const submitQCReview = async (reviewData) => {
    try {
        const { questionId, reviewerId, difficulty, status, reviewNotes, rejectionNotes, keywords, evidenceFiles, targetRole } = reviewData;

        let evidenceUrls = [];
        if (evidenceFiles && evidenceFiles.length > 0) {
            for (const file of evidenceFiles) {
                const fileName = generateUniqueFileName(file.name, 'qc_evidence_');
                const uploadResult = await uploadFileToSupabase(file, 'qc-evidence', fileName);
                evidenceUrls.push({
                    name: file.name,
                    url: uploadResult.publicUrl,
                    path: uploadResult.path
                });
            }
        }

        let finalStatus = status;
        let finalTargetRole = targetRole;

        if (difficulty === 'easy') {
            finalStatus = 'revision_requested';
            finalTargetRole = 'question_maker';
        } else if (status === 'rejected') {
            if (!finalTargetRole) {
                const hasDataEntryKeywords = keywords && keywords.some(k =>
                    ['Coding & Formatting Error', 'Visual/Graphical Errors'].includes(k)
                );
                finalTargetRole = hasDataEntryKeywords ? 'data_entry' : 'question_maker';
            }
        }

        const qcReviewData = {
            question_id: questionId,
            reviewer_id: reviewerId,
            difficulty_level: difficulty,
            status: finalStatus,
            review_notes: reviewNotes,
            rejection_notes: rejectionNotes,
            keywords: keywords,
            evidence_attachment_urls: evidenceUrls,
            created_at: getJakartaISOString(),
            updated_at: getJakartaISOString()
        };

        const { data: existingReview } = await supabase
            .from('qc_reviews')
            .select('id')
            .eq('question_id', questionId)
            .single();

        let qcReview;
        if (existingReview) {
            const { data: updateQCData, error: qcError } = await supabase
                .from('qc_reviews')
                .update({
                    ...qcReviewData,
                    updated_at: getJakartaISOString()
                })
                .eq('question_id', questionId)
                .select();

            if (qcError) throw qcError;
            qcReview = updateQCData[0];
        } else {
            const { data: insertQCData, error: qcError } = await supabase
                .from('qc_reviews')
                .insert([qcReviewData])
                .select();

            if (qcError) throw qcError;
            qcReview = insertQCData[0];
        }

        const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('rejected_at, approved_at, package_id')
            .eq('id', questionId)
            .single();

        if (questionsError) throw questionsError;

        const questionUpdateData = {
            status: convertQCStatusToQuestionStatus(finalStatus),
            qc_status: finalStatus,
            qc_reviewer_id: reviewerId,
            qc_reviewed_at: getJakartaISOString(),
            rejected_at: finalStatus === 'rejected' ? getJakartaISOString() : questionsData?.rejected_at,
            approved_at: questionsData?.approved_at ?? (finalStatus === 'approved' ? getJakartaISOString() : null),
            qc_difficulty_level: difficulty,
            updated_at: getJakartaISOString()
        };

        const { data: updatedQuestion, error: questionError } = await supabase
            .from('questions')
            .update(questionUpdateData)
            .eq('id', questionId)
            .select();

        if (questionError) throw questionError;

        if (finalStatus === 'revision_requested' || finalStatus === 'rejected') {
            const { data: existingRevision } = await supabase
                .from('revisions')
                .select('id')
                .eq('question_id', questionId)
                .single();

            const revisionData = {
                question_id: questionId,
                package_id: updatedQuestion[0].package_id,
                target_role: finalTargetRole,
                notes: rejectionNotes || reviewNotes,
                keywords: keywords,
                evidence_file_url: evidenceUrls.length > 0 ? evidenceUrls[0].url : null,
                revision_attachment_urls: JSON.stringify(evidenceUrls),
                requested_by: reviewerId,
                status: 'pending',
                revision_type: 'acceptance',
                remarks: difficulty === 'easy' ? 'EASY_QUESTION_REVISION' : (finalTargetRole === 'question_maker' ? 'SEND_TO_QUESTION_MAKER' : 'SEND_TO_DATA_ENTRY')
            };

            if (existingRevision) {
                const { error: revisionError } = await supabase
                    .from('revisions')
                    .update(revisionData)
                    .eq('question_id', questionId)
                    .select();

                if (revisionError) throw revisionError;
            } else {
                const { error: revisionError } = await supabase
                    .from('revisions')
                    .insert([revisionData])
                    .select();

                if (revisionError) throw revisionError;
            }
        }

        return {
            qcReview,
            question: updatedQuestion[0]
        };
    } catch (error) {
        console.error('Error submitting QC review:', error);
        throw error;
    }
};

// New function to handle Question Maker approve action for easy questions
export const approveQuestionMakerRevision = async (revisionId, responseNotes, responseFiles, respondedBy) => {
    try {
        // First get the revision details
        const { data: revision, error: getRevisionError } = await supabase
            .from('revisions')
            .select('*')
            .eq('id', revisionId)
            .single();

        if (getRevisionError) throw getRevisionError;

        // Update revision status to approved
        const { data: updatedRevision, error: revisionError } = await supabase
            .from('revisions')
            .update({
                status: 'send to data-entry',
                response_notes: responseNotes,
                responded_by: respondedBy,
                responded_at: getJakartaISOString(),
                revision_attachment_urls: JSON.stringify(responseFiles || [])
            })
            .eq('id', revisionId)
            .select();

        if (revisionError) throw revisionError;

        // Create acceptance record for Data Entry
        const acceptanceData = {
            question_id: revision.question_id,
            package_id: revision.package_id,
            target_role: 'data_entry',
            notes: `Rejected by QC due to: ${revision.notes}\nQuestion Maker has uploaded fixed question: ${responseNotes}`,
            keywords: revision.keywords,
            evidence_file_url: responseFiles?.length > 0 ? responseFiles[0].url : null,
            revision_attachment_urls: JSON.stringify(responseFiles || []),
            requested_by: respondedBy,
            status: 'pending',
            revision_type: 'recreation',
            remarks: 'RECREATE_QUESTION'
        };

        const { data: acceptance, error: acceptanceError } = await supabase
            .from('revisions')
            .insert([acceptanceData])
            .select();

        if (acceptanceError) throw acceptanceError;

        const { data: updatedQuestion, error: questionError } = await supabase
            .from('questions')
            .update({
                qc_status: 'recreate_question',
                updated_at: getJakartaISOString(),
                revision_notes: responseNotes,
                revised_by: respondedBy,
                revised_at: getJakartaISOString()
            })
            .eq('id', revision.question_id)
            .select('*');

        if (questionError) throw questionError;

        if (responseFiles[0].url) {
            const updatePackageUrl = {
                package_url_status: 'edited',
                public_url: responseFiles[0].url
            };

            const { data } = await supabase
                .from('question_packages')
                .update(updatePackageUrl)
                .eq('id', updatedQuestion[0]?.package_id)
                .single();
        }

        return {
            revision: updatedRevision[0],
            acceptance: acceptance[0],
            question: updatedQuestion[0]
        };
    } catch (error) {
        console.error('Error approving Question Maker revision:', error);
        throw error;
    }
};

export const submitRecreatedQuestion = async (questionId, questionData, submittedBy) => {
    try {
        // Update the existing question without creating new ID
        const updateData = {
            question_type: questionData.question_type,
            question: questionData.question,
            question_attachments: questionData.question_attachments,
            option_a: questionData.option_a,
            option_b: questionData.option_b,
            option_c: questionData.option_c,
            option_d: questionData.option_d,
            option_e: questionData.option_e,
            correct_option: questionData.correct_option,
            correct_answer: questionData.correct_answer,
            solution: questionData.solution,
            solution_attachments: questionData.solution_attachments,
            qc_status: 'under_review',
            updated_at: getJakartaISOString()
        };

        const { data: updatedQuestion, error: questionError } = await supabase
            .from('questions')
            .update(updateData)
            .eq('id', questionId)
            .select();

        if (questionError) throw questionError;

        // Update QC review status to under_review
        const { error: qcReviewError } = await supabase
            .from('qc_reviews')
            .update({
                status: 'under_review',
                updated_at: getJakartaISOString()
            })
            .eq('question_id', questionId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (qcReviewError) throw qcReviewError;

        // Update revision status to completed  
        const { error: revisionError } = await supabase
            .from('revisions')
            .update({
                status: 'completed',
                updated_at: getJakartaISOString()
            })
            .eq('question_id', questionId)
            .eq('remarks', 'RECREATE_QUESTION');

        if (revisionError) throw revisionError;

        return updatedQuestion[0];
    } catch (error) {
        console.error('Error submitting recreated question:', error);
        throw error;
    }
};

// Tambahkan fungsi-fungsi ini ke file services/supabase.js Anda

// Create new chapter
export const createChapter = async (chapterData) => {
    try {
        const { data, error } = await supabase
            .from('chapters')
            .insert([{
                name: chapterData.name,
                description: chapterData.description || null,
                subject_id: chapterData.subject_id
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating chapter:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error in createChapter:', error);
        throw error;
    }
};

// Create new topic
export const createTopic = async (topicData) => {
    try {
        const { data, error } = await supabase
            .from('topics')
            .insert([{
                name: topicData.name,
                description: topicData.description || null,
                chapter_id: topicData.chapter_id
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating topic:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error in createTopic:', error);
        throw error;
    }
};

// Create new concept title
export const createConceptTitle = async (conceptData) => {
    try {
        const { data, error } = await supabase
            .from('concept_titles')
            .insert([{
                name: conceptData.name,
                description: conceptData.description || null,
                topic_id: conceptData.topic_id
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating concept title:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error in createConceptTitle:', error);
        throw error;
    }
};
