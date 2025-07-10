// Google Drive Upload API Endpoint
// Note: In production, this should be moved to a proper backend service
// This is a client-side implementation for development

const GOOGLE_DRIVE_API_KEY = process.env.REACT_APP_GOOGLE_DRIVE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export const uploadToGoogleDrive = async (file, fileName, folderId = '1pbcUpMh1CJazNHJFAmw9mWUA7y06zjk_') => {
  try {
    // Initialize Google API client
    if (!window.gapi) {
      throw new Error('Google API not loaded');
    }

    // Load Google Drive API
    await new Promise((resolve, reject) => {
      window.gapi.load('client:auth2', () => {
        window.gapi.client.init({
          apiKey: GOOGLE_DRIVE_API_KEY,
          clientId: GOOGLE_CLIENT_ID,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          scope: 'https://www.googleapis.com/auth/drive.file'
        }).then(resolve).catch(reject);
      });
    });

    // Check if user is signed in
    const authInstance = window.gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
      await authInstance.signIn();
    }

    // Convert file to base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    // Upload file to Google Drive
    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
      },
      body: form
    });

    if (!response.ok) {
      throw new Error(`Google Drive upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      fileId: result.id,
      fileName: result.name,
      fileUrl: `https://drive.google.com/file/d/${result.id}/view`
    };

  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw error;
  }
};