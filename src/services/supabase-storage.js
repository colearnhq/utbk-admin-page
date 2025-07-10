import { supabase } from './supabase';


export const uploadFileToSupabase = async (file, bucketName, filePath, onProgress = null) => {
    try {
        console.log('Starting upload to Supabase Storage...');
        console.log('File details:', {
            name: file.name,
            size: file.size,
            type: file.type,
            bucket: bucketName,
            path: filePath
        });

        if (!(file instanceof File)) {
            throw new Error('Invalid file object');
        }

        if (onProgress) onProgress(10);

        const { data: buckets, error: bucketError } = await supabase
            .storage
            .listBuckets();

        if (bucketError) {
            console.error('Error checking buckets:', bucketError);
            throw new Error('Cannot access storage buckets');
        }

        const bucketExists = buckets.some(bucket => bucket.name === bucketName);
        if (!bucketExists) {
            throw new Error(`Bucket '${bucketName}' does not exist`);
        }

        if (onProgress) onProgress(20);

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);

            // Handle specific error cases
            if (uploadError.message.includes('already exists')) {
                throw new Error('File dengan nama yang sama sudah ada. Silakan rename file atau gunakan nama yang berbeda.');
            } else if (uploadError.message.includes('File size exceeds')) {
                throw new Error('Ukuran file melebihi batas maksimum yang diizinkan.');
            } else if (uploadError.message.includes('Invalid JWT') || uploadError.message.includes('JWT expired')) {
                throw new Error('Session expired, silakan login kembali.');
            } else if (uploadError.message.includes('Unauthorized')) {
                throw new Error('Tidak memiliki akses untuk upload file. Hubungi administrator.');
            }

            throw uploadError;
        }

        if (onProgress) onProgress(80);

        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from(bucketName)
            .getPublicUrl(filePath);

        if (!urlData || !urlData.publicUrl) {
            throw new Error('Failed to get public URL for uploaded file');
        }

        console.log('File uploaded successfully:', {
            path: uploadData.path,
            publicUrl: urlData.publicUrl
        });

        if (onProgress) onProgress(100);

        return {
            success: true,
            publicUrl: urlData.publicUrl,
            path: uploadData.path
        };

    } catch (error) {
        console.error('Error uploading to Supabase Storage:', error);

        let errorMessage = 'Upload failed';

        if (error.message.includes('already exists')) {
            errorMessage = 'File dengan nama yang sama sudah ada';
        } else if (error.message.includes('File size exceeds')) {
            errorMessage = 'Ukuran file melebihi batas maksimum';
        } else if (error.message.includes('Invalid JWT') || error.message.includes('JWT expired')) {
            errorMessage = 'Session expired, silakan login kembali';
        } else if (error.message.includes('Unauthorized')) {
            errorMessage = 'Tidak memiliki akses untuk upload. Hubungi administrator';
        } else if (error.message.includes('Network')) {
            errorMessage = 'Masalah koneksi internet. Silakan coba lagi';
        } else if (error.message.includes('Bucket') && error.message.includes('does not exist')) {
            errorMessage = 'Storage bucket tidak ditemukan. Hubungi administrator';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
};


export const deleteFileFromSupabase = async (bucketName, filePath) => {
    try {
        const { error } = await supabase
            .storage
            .from(bucketName)
            .remove([filePath]);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error deleting file from Supabase:', error);
        return {
            success: false,
            error: error.message
        };
    }
};


export const generateSignedUrl = async (bucketName, filePath, expiresIn = 3600) => {
    try {
        const { data, error } = await supabase
            .storage
            .from(bucketName)
            .createSignedUrl(filePath, expiresIn);

        if (error) throw error;

        return data.signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }
};

export const checkBucketExists = async (bucketName) => {
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        return buckets.some(bucket => bucket.name === bucketName);
    } catch (error) {
        console.error('Error checking bucket:', error);
        return false;
    }
};

export const createBucket = async (bucketName, isPublic = true) => {
    try {
        const { data, error } = await supabase
            .storage
            .createBucket(bucketName, {
                public: isPublic,
            });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error creating bucket:', error);
        return {
            success: false,
            error: error.message
        };
    }
};