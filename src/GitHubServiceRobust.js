// Enhanced GitHub Service with Delete Functionality - Version 2.2
class GitHubServiceRobust {
  constructor() {
    this.owner = 'florianliepe';
    this.repo = 'AI-maturity-scan';
    this.baseUrl = 'https://api.github.com';
    this.token = process.env.REACT_APP_GITHUB_TOKEN || process.env.REACT_APP_DATA_STORAGE || process.env.DATA_STORAGE;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.enableLogging = true;
    this.log('GitHubService initialized', { hasToken: !!this.token });
  }

  log(message, data = null) {
    if (this.enableLogging) console.log(`[GitHubService] ${message}`, data || '');
  }

  error(message, error = null) {
    console.error(`[GitHubService ERROR] ${message}`, error || '');
  }

  async validateToken() {
    if (!this.token) {
      return { valid: false, error: 'No GitHub token configured' };
    }
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Maturity-Scan-App'
        }
      });
      if (response.ok) {
        const user = await response.json();
        return { valid: true, user: user.login };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { valid: false, error: `HTTP ${response.status}: ${errorData.message || 'Invalid token'}` };
      }
    } catch (error) {
      return { valid: false, error: `Network error: ${error.message}` };
    }
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Maturity-Scan-App'
    };
    if (this.token) headers['Authorization'] = `token ${this.token}`;
    return headers;
  }

  async retryOperation(operation, operationName, maxRetries = this.maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (result.success || attempt === maxRetries) return result;
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        if (attempt === maxRetries) {
          return { success: false, error: error.message, message: `All ${maxRetries} attempts failed: ${error.message}` };
        }
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async createFile(path, content, message) {
    const operation = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({
            message: message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: 'main'
          })
        });
        if (response.ok) {
          const result = await response.json();
          return { success: true, storage: 'github', message: 'File stored successfully', sha: result.content.sha, path: path };
        } else if (response.status === 422) {
          return await this.updateExistingFile(path, content, message);
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        throw error;
      }
    };
    return await this.retryOperation(operation, `Create file: ${path}`);
  }

  async updateExistingFile(path, content, message) {
    try {
      const getResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
        headers: this.getHeaders()
      });
      if (getResponse.ok) {
        const currentFile = await getResponse.json();
        const updateResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({
            message: message,
            content: btoa(unescape(encodeURIComponent(content))),
            sha: currentFile.sha,
            branch: 'main'
          })
        });
        if (updateResponse.ok) {
          const result = await updateResponse.json();
          return { success: true, storage: 'github', message: 'File updated successfully', sha: result.content.sha, path: path };
        } else {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(`Update failed: HTTP ${updateResponse.status}: ${errorData.message || 'Unknown error'}`);
        }
      } else {
        throw new Error(`Could not retrieve existing file: HTTP ${getResponse.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // NEW: Delete file method
  async deleteFile(path, message) {
    const operation = async () => {
      try {
        const getResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
          headers: this.getHeaders()
        });
        if (!getResponse.ok) {
          if (getResponse.status === 404) {
            return { success: true, storage: 'github', message: 'File not found (already deleted)', path: path };
          }
          throw new Error(`Could not retrieve file for deletion: HTTP ${getResponse.status}`);
        }
        const fileData = await getResponse.json();
        const deleteResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
          method: 'DELETE',
          headers: this.getHeaders(),
          body: JSON.stringify({ message: message, sha: fileData.sha, branch: 'main' })
        });
        if (deleteResponse.ok) {
          return { success: true, storage: 'github', message: 'File deleted successfully', path: path };
        } else {
          const errorData = await deleteResponse.json().catch(() => ({}));
          throw new Error(`Delete failed: HTTP ${deleteResponse.status}: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        throw error;
      }
    };
    return await this.retryOperation(operation, `Delete file: ${path}`);
  }

  async storeAssessment(assessmentData) {
    const tokenValidation = await this.validateToken();
    if (!tokenValidation.valid) {
      return await this.fallbackStorage(assessmentData, 'Token validation failed');
    }

    const timestamp = new Date().toISOString();
    const dateFolder = timestamp.slice(0, 10).replace(/-/g, '/');
    const filename = `assessment-${assessmentData.id}.json`;
    const filePath = `reports/${dateFolder}/${filename}`;

    const fileContent = JSON.stringify({
      ...assessmentData,
      storedAt: timestamp,
      version: '2.1',
      storage: 'github'
    }, null, 2);

    const commitMessage = `Add AI maturity assessment: ${assessmentData.metadata.organisation || 'Anonymous'} (${assessmentData.id})`;
    const result = await this.createFile(filePath, fileContent, commitMessage);

    if (result.success) {
      await this.updateAssessmentIndex(assessmentData, filePath);
      return { ...result, filePath: filePath, url: `https://github.com/${this.owner}/${this.repo}/blob/main/${filePath}` };
    } else {
      return await this.fallbackStorage(assessmentData, result.error);
    }
  }

  // NEW: Delete assessment method
  async deleteAssessment(assessmentId, filePath = null) {
    const tokenValidation = await this.validateToken();
    if (!tokenValidation.valid) {
      return { success: false, error: 'Token validation failed', message: 'Cannot delete from GitHub: ' + tokenValidation.error };
    }

    let deletionResults = {
      github: { success: false, message: '' },
      localStorage: { success: false, message: '' },
      index: { success: false, message: '' }
    };

    // Delete from GitHub repository file
    if (filePath) {
      try {
        const commitMessage = `Delete AI maturity assessment: ${assessmentId}`;
        const deleteResult = await this.deleteFile(filePath, commitMessage);
        deletionResults.github = deleteResult.success ? 
          { success: true, message: 'Assessment file deleted from GitHub repository' } :
          { success: false, message: deleteResult.message || 'Failed to delete from GitHub' };
      } catch (error) {
        deletionResults.github = { success: false, message: `GitHub deletion error: ${error.message}` };
      }
    } else {
      deletionResults.github = { success: true, message: 'No file path provided, skipping GitHub file deletion' };
    }

    // Remove from assessment index
    try {
      const indexUpdateResult = await this.removeFromAssessmentIndex(assessmentId);
      deletionResults.index = indexUpdateResult;
    } catch (error) {
      deletionResults.index = { success: false, message: `Index update error: ${error.message}` };
    }

    // Remove from localStorage
    try {
      const localStorageResult = this.removeFromLocalStorage(assessmentId);
      deletionResults.localStorage = localStorageResult;
    } catch (error) {
      deletionResults.localStorage = { success: false, message: `localStorage error: ${error.message}` };
    }

    const overallSuccess = deletionResults.github.success && deletionResults.index.success;
    return {
      success: overallSuccess,
      assessmentId: assessmentId,
      deletionResults: deletionResults,
      message: overallSuccess ? 'Assessment deleted successfully from all storage locations' : 'Assessment deletion completed with some errors'
    };
  }

  // NEW: Bulk delete method
  async deleteMultipleAssessments(assessmentIds, assessmentData = []) {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const assessmentId of assessmentIds) {
      try {
        const assessment = assessmentData.find(a => a.id === assessmentId);
        const filePath = assessment ? assessment.filePath : null;
        const deleteResult = await this.deleteAssessment(assessmentId, filePath);
        
        results.push({
          assessmentId,
          organisation: assessment ? assessment.organisation : 'Unknown',
          success: deleteResult.success,
          message: deleteResult.message,
          details: deleteResult.deletionResults
        });

        if (deleteResult.success) successCount++;
        else failureCount++;

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({
          assessmentId,
          success: false,
          message: `Deletion error: ${error.message}`,
          details: null
        });
        failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      totalProcessed: assessmentIds.length,
      successCount,
      failureCount,
      results,
      message: `Bulk deletion completed: ${successCount} successful, ${failureCount} failed`
    };
  }

  async fallbackStorage(assessmentData, reason) {
    try {
      const storageKey = `assessment_${assessmentData.id}`;
      const storageData = {
        ...assessmentData,
        storedAt: new Date().toISOString(),
        storage: 'localStorage',
        fallbackReason: reason
      };
      localStorage.setItem(storageKey, JSON.stringify(storageData));
      
      const indexKey = 'assessments_index';
      const existingIndex = JSON.parse(localStorage.getItem(indexKey) || '[]');
      existingIndex.push({
        id: assessmentData.id,
        organisation: assessmentData.metadata.organisation,
        date: assessmentData.metadata.date,
        timestamp: storageData.storedAt,
        storageKey: storageKey
      });
      localStorage.setItem(indexKey, JSON.stringify(existingIndex));

      return {
        success: true,
        storage: 'localStorage',
        message: `Data stored locally due to GitHub issue: ${reason}`,
        fallback: true,
        storageKey: storageKey,
        error: reason
      };
    } catch (fallbackError) {
      return {
        success: false,
        storage: 'none',
        message: `Complete storage failure: GitHub (${reason}) and localStorage (${fallbackError.message}) both failed`,
        error: `Primary: ${reason}, Fallback: ${fallbackError.message}`
      };
    }
  }

  async updateAssessmentIndex(assessmentData, filePath) {
    try {
      const indexPath = 'assessments_index.json';
      let currentIndex = [];
      
      try {
        const indexResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${indexPath}`, {
          headers: this.getHeaders()
        });
        if (indexResponse.ok) {
          const indexFile = await indexResponse.json();
          const indexContent = atob(indexFile.content);
          currentIndex = JSON.parse(indexContent);
        }
      } catch (error) {
        this.log('No existing index found, creating new one');
      }

      const indexEntry = {
        id: assessmentData.id,
        organisation: assessmentData.metadata.organisation || 'Anonymous',
        contact: assessmentData.metadata.contact || '',
        date: assessmentData.metadata.date,
        timestamp: assessmentData.timestamp,
        overallScore: assessmentData.scores.overall,
        maturityLevel: assessmentData.maturity.name,
        filePath: filePath,
        version: assessmentData.version || '2.1'
      };

      currentIndex.push(indexEntry);
      const indexContent = JSON.stringify(currentIndex, null, 2);
      const indexMessage = `Update assessment index with ${assessmentData.metadata.organisation || 'Anonymous'} assessment`;
      await this.createFile(indexPath, indexContent, indexMessage);
    } catch (error) {
      this.error('Failed to update assessment index', error);
    }
  }

  // NEW: Remove from index method
  async removeFromAssessmentIndex(assessmentId) {
    try {
      const indexPath = 'assessments_index.json';
      let currentIndex = [];
      
      try {
        const indexResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${indexPath}`, {
          headers: this.getHeaders()
        });
        if (indexResponse.ok) {
          const indexFile = await indexResponse.json();
          const indexContent = atob(indexFile.content);
          currentIndex = JSON.parse(indexContent);
        } else {
          return { success: false, message: 'Assessment index not found' };
        }
      } catch (error) {
        return { success: false, message: 'Failed to retrieve assessment index' };
      }

      const originalLength = currentIndex.length;
      currentIndex = currentIndex.filter(assessment => assessment.id !== assessmentId);
      
      if (currentIndex.length === originalLength) {
        return { success: true, message: 'Assessment not found in index (may have been already removed)' };
      }

      const indexContent = JSON.stringify(currentIndex, null, 2);
      const indexMessage = `Remove assessment ${assessmentId} from index`;
      const updateResult = await this.createFile(indexPath, indexContent, indexMessage);
      
      return updateResult.success ? 
        { success: true, message: 'Assessment removed from index successfully' } :
        { success: false, message: 'Failed to update index after removal' };
    } catch (error) {
      return { success: false, message: `Index removal error: ${error.message}` };
    }
  }

  // NEW: Remove from localStorage method
  removeFromLocalStorage(assessmentId) {
    try {
      const storageKey = `assessment_${assessmentId}`;
      localStorage.removeItem(storageKey);

      const indexKey = 'assessments_index';
      const existingIndex = JSON.parse(localStorage.getItem(indexKey) || '[]');
      const updatedIndex = existingIndex.filter(assessment => assessment.id !== assessmentId);
      localStorage.setItem(indexKey, JSON.stringify(updatedIndex));

      return { success: true, message: 'Assessment removed from localStorage successfully' };
    } catch (error) {
      return { success: false, message: `localStorage removal error: ${error.message}` };
    }
  }

  async getAllAssessments() {
    try {
      const indexResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/assessments_index.json`, {
        headers: this.getHeaders()
      });
      if (indexResponse.ok) {
        const indexFile = await indexResponse.json();
        const indexContent = atob(indexFile.content);
        const assessments = JSON.parse(indexContent);
        return { success: true, assessments: assessments, source: 'github_index' };
      }
    } catch (error) {
      this.error('Failed to retrieve from GitHub index', error);
    }

    try {
      const localIndex = JSON.parse(localStorage.getItem('assessments_index') || '[]');
      return { success: true, assessments: localIndex, source: 'localStorage' };
    } catch (error) {
      return { success: false, assessments: [], error: 'No assessments found in any storage location' };
    }
  }

  async generateBulkExport(assessments, format = 'csv') {
    if (format === 'csv') {
      const headers = ['ID', 'Organisation', 'Contact', 'Date', 'Overall Score', 'Maturity Level'];
      const rows = assessments.map(assessment => [
        assessment.id,
        assessment.organisation || '',
        assessment.contact || '',
        assessment.date,
        assessment.overallScore,
        assessment.maturityLevel
      ]);
      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    } else {
      return JSON.stringify(assessments, null, 2);
    }
  }

  isAvailable() {
    return !!this.token;
  }
}

export default GitHubServiceRobust;
