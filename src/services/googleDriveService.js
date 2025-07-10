// src/services/googleDriveService.js

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GOOGLE_DRIVE_API_KEY = process.env.REACT_APP_GOOGLE_DRIVE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let gapiClientInitialized = false;
let gisInitialized = false;
let tokenClient;

/**
 * Loads the Google API client script (for interacting with Drive API).
 * This is separate from the GIS script for authentication.
 */
const loadGapiScript = () => {
  return new Promise((resolve) => {
    if (window.gapi && window.gapi.client) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => window.gapi.load('client', resolve);
    document.body.appendChild(script);
  });
};

/**
 * Loads the Google Identity Services (GIS) script for authentication.
 */
const loadGisScript = () => {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    document.body.appendChild(script);
  });
};

/**
 * Initializes the GAPI client. This must be called after gapi script is loaded.
 */
const initializeGapiClient = async () => {
  if (gapiClientInitialized) return;
  await window.gapi.client.init({
    apiKey: GOOGLE_DRIVE_API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiClientInitialized = true;
};

/**
 * Initializes the GIS client. This must be called after gis script is loaded.
 */
const initializeGisClient = () => {
    if (gisInitialized) return;
    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, // The callback is handled by the promise in getAccessToken
    });
    gisInitialized = true;
};

/**
 * Gets an access token using the new GIS flow.
 * This will trigger a popup for the user if needed.
 */
const getAccessToken = () => {
  return new Promise((resolve, reject) => {
    try {
      // Set the callback for the token client.
      tokenClient.callback = (tokenResponse) => {
        if (tokenResponse.error) {
          return reject(new Error(`Error getting access token: ${tokenResponse.error_description}`));
        }
        // Set the token for future GAPI calls in this session
        window.gapi.client.setToken(tokenResponse);
        resolve(tokenResponse.access_token);
      };

      // If GAPI already has a token, check if it's expired.
      const currentToken = window.gapi.client.getToken();
      if (currentToken && currentToken.expires_in > 0) {
         resolve(currentToken.access_token);
      } else {
        // No valid token, so request one. This will trigger the GIS popup.
        tokenClient.requestAccessToken({ prompt: 'consent' });
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Main function to upload a file to Google Drive using the new GIS library.
 */
export const uploadFileToGoogleDrive = async (file, fileName, folderId = '1pbcUpMh1CJazNHJFAmw9mWUA7y06zjk_') => {
  try {
    // Load scripts and initialize clients
    await loadGapiScript();
    await loadGisScript();
    await initializeGapiClient();
    initializeGisClient();

    // Get access token, which will trigger user login if necessary
    const accessToken = await getAccessToken();

    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Invalidate the token if the request fails with an auth error
      if (response.status === 401 || response.status === 403) {
          window.google.accounts.oauth2.revoke(accessToken, () => {});
          window.gapi.client.setToken(null);
      }
      throw new Error(`Google Drive upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    return {
      fileId: result.id,
      fileName: result.name,
      fileUrl: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error(`Google Drive upload failed: ${error.message}`);
  }
};

// Alternative: Server-side upload (recommended for production)
export const uploadFileToGoogleDriveViaServer = async (file, fileName, folderId = '1pbcUpMh1CJazNHJFAmw9mWUA7y06zjk_') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('folderId', folderId);

    const response = await fetch('/api/google-drive-upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error uploading via server:', error);
    throw new Error(`Server upload failed: ${error.message}`);
  }
};

// Check if Google Drive is available
export const isGoogleDriveAvailable = () => {
  return !!(GOOGLE_DRIVE_API_KEY && GOOGLE_CLIENT_ID);
};
