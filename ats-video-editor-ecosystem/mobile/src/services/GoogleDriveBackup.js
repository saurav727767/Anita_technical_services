import { GoogleSignin } from '@react-native-google-signin/google-signin';

class GoogleDriveBackup {
  constructor() {
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/drive.file'],
      webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
    });
  }

  // Retrieve user access token
  async getAccessToken() {
    try {
      const { accessToken } = await GoogleSignin.getTokens();
      return accessToken;
    } catch (error) {
      console.error('Error fetching Google token', error);
      throw error;
    }
  }

  // Check or create the dedicated folder 'ATS Video Editor'
  async getOrCreateFolder(accessToken) {
    const query = encodeURIComponent("name = 'ATS Video Editor' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create folder if not found
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'ATS Video Editor',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    const folder = await createResponse.json();
    return folder.id;
  }

  // Backup project state
  async backupProject(projectData) {
    try {
      const token = await this.getAccessToken();
      const folderId = await this.getOrCreateFolder(token);

      const metadata = {
        name: `${projectData.title || 'project'}_backup.json`,
        parents: [folderId],
        mimeType: 'application/json'
      };

      const boundary = 'ats_boundary_marker';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(projectData) +
        closeDelimiter;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      const resJson = await response.json();
      return { success: true, fileId: resJson.id };
    } catch (err) {
      console.error('Backup to Google Drive failed', err);
      return { success: false, error: err.message };
    }
  }

  // Get storage details
  async getStorageUsage() {
    try {
      const token = await this.getAccessToken();
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { storageQuota } = await response.json();
      return {
        limit: parseInt(storageQuota.limit, 10),
        usage: parseInt(storageQuota.usage, 10),
        remaining: parseInt(storageQuota.limit, 10) - parseInt(storageQuota.usage, 10)
      };
    } catch (err) {
      console.error('Failed to get storage quotas', err);
      throw err;
    }
  }
}

export default new GoogleDriveBackup();
