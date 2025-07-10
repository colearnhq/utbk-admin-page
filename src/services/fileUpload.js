import { supabase } from './supabase';

const GOOGLE_DRIVE_API_KEY = process.env.REACT_APP_GOOGLE_DRIVE_API_KEY;
const GOOGLE_DRIVE_CLIENT_ID = process.env.REACT_APP_GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_DRIVE_FOLDER_ID = '1pbcUpMh1CJazNHJFAmw9mWUA7y06zjk_';

/**
 * Upload file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - The bucket name ('question_attachments' or 'solution_attachments')
 * @param {string} fileName - The file name to use
 * @returns {Promise<{url: string, path: string}>}
 */
export const uploadToSupabase = async (file, bucket, fileName) => {
    try {
        console.log(`Uploading to Supabase bucket: ${bucket}`, fileName);

        // Generate unique filename with timestamp
        const timestamp = new Date().getTime();
        const fileExtension = file.name.split('.').pop();
        const uniqueFileName = `${timestamp}_${fileName}.${fileExtension}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(uniqueFileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error(`Failed to upload to Supabase: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(uniqueFileName);

        if (!urlData.publicUrl) {
            throw new Error('Failed to get public URL from Supabase');
        }

        console.log('Supabase upload successful:', urlData.publicUrl);

        return {
            url: urlData.publicUrl,
            path: uniqueFileName,
            bucket: bucket
        };
    } catch (error) {
        console.error('Error uploading to Supabase:', error);
        throw error;
    }
};

/**
 * Initialize Google Drive API
 * @returns {Promise<void>}
 */
const initializeGoogleDriveAPI = async () => {
    return new Promise((resolve, reject) => {
        if (window.gapi && window.gapi.client) {
            resolve();
            return;
        }

        // Load Google API script
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            window.gapi.load('client:auth2', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: GOOGLE_DRIVE_API_KEY,
                        clientId: GOOGLE_DRIVE_CLIENT_ID,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                        scope: 'https://www.googleapis.com/auth/drive.file'
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

/**
 * Upload file to Google Drive
 * @param {File} file - The file to upload
 * @param {string} fileName - The file name to use
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
export const uploadToGoogleDrive = async (file, fileName) => {
    try {
        console.log('Uploading to Google Drive:', fileName);

        // Initialize Google Drive API
        await initializeGoogleDriveAPI();

        // Check if user is authenticated
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (!authInstance.isSignedIn.get()) {
            await authInstance.signIn();
        }

        // Convert file to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // Upload metadata first
        const metadata = {
            name: fileName,
            parents: [GOOGLE_DRIVE_FOLDER_ID]
        };

        const metadataResponse = await window.gapi.client.request({
            path: 'https://www.googleapis.com/upload/drive/v3/files',
            method: 'POST',
            params: {
                uploadType: 'resumable'
            },
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        // Upload file content
        const uploadResponse = await fetch(metadataResponse.headers.location, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
                'Authorization': `Bearer ${window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
            },
            body: base64Data
        });

        if (!uploadResponse.ok) {
            throw new Error(`Google Drive upload failed: ${uploadResponse.statusText}`);
        }

        const result = await uploadResponse.json();

        // Get file details including web view link
        const fileResponse = await window.gapi.client.drive.files.get({
            fileId: result.id,
            fields: 'id,name,webViewLink,webContentLink'
        });

        console.log('Google Drive upload successful:', fileResponse.result);

        return {
            id: result.id,
            webViewLink: fileResponse.result.webViewLink,
            webContentLink: fileResponse.result.webContentLink
        };
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
};

/**
 * Upload file to both Supabase and Google Drive
 * @param {File} file - The file to upload
 * @param {string} bucket - Supabase bucket name
 * @param {string} fileName - Base file name
 * @returns {Promise<{supabase: Object, googleDrive: Object}>}
 */
export const uploadFile = async (file, bucket, fileName) => {
    try {
        console.log(`Starting dual upload for: ${fileName}`);

        // Upload to both services in parallel
        const [supabaseResult, googleDriveResult] = await Promise.all([
            uploadToSupabase(file, bucket, fileName),
            uploadToGoogleDrive(file, fileName)
        ]);

        return {
            supabase: supabaseResult,
            googleDrive: googleDriveResult,
            originalFile: {
                name: file.name,
                size: file.size,
                type: file.type
            }
        };
    } catch (error) {
        console.error('Error in dual upload:', error);
        throw error;
    }
};

/**
 * Generate file name based on question data
 * @param {Object} questionData - Question data object
 * @param {string} type - 'question' or 'solution'
 * @returns {string}
 */
export const generateFileName = (questionData, type) => {
    const timestamp = new Date().getTime();
    const inhouseId = questionData.inhouse_id || `Q${timestamp}`;
    return `${inhouseId}_${type}_${timestamp}`;
};

/**
 * Process question attachments
 * @param {Object} formData - Form data containing files
 * @param {Object} questionData - Question data for naming
 * @returns {Promise<Object>}
 */
export const processQuestionAttachments = async (formData, questionData) => {
    const attachments = {};

    try {
        if (formData.question_attachment && formData.question_attachment instanceof File) {
            console.log('Processing question attachment...');
            const fileName = generateFileName(questionData, 'question');
            const questionAttachment = await uploadFile(
                formData.question_attachment,
                'question_attachments',
                fileName
            );
            attachments.question_attachment = questionAttachment;
        }

        if (formData.solution_attachment && formData.solution_attachment instanceof File) {
            console.log('Processing solution attachment...');
            const fileName = generateFileName(questionData, 'solution');
            const solutionAttachment = await uploadFile(
                formData.solution_attachment,
                'solution_attachments',
                fileName
            );
            attachments.solution_attachment = solutionAttachment;
        }

        return attachments;
    } catch (error) {
        console.error('Error processing attachments:', error);
        throw error;
    }
};