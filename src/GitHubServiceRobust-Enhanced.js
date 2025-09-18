// Enhanced GitHub Service with Bulletproof Error Handling, Multiple Fallback Strategies, and Delete Functionality
class GitHubServiceRobust {
  constructor() {
    this.owner = 'florianliep';
    this.repo = 'AI-maturity-scan';
    this.baseUrl = 'https://api.github.com';
    this.token = process.env.REACT_APP_GITHUB_TOKEN || process.env.REACT_APP_DATA_STORAGE || process.env.DATA_STORAGE;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    
    // Enhanced logging
    this.enableLogging = true;
    this.log('GitHubService initialized', { 
      hasToken: !!this.token, 
      tokenLength: this.token ? this.token.length : 0 
    });
  }

  log(message, data = null) {
    if (this.enableLogging) {
      console.log(`[GitHubService] ${message}`, data || '');
    }
  }

  error(message, error = null) {
    console.error(`[GitHubService ERROR] ${message}`, error || '');
  }

  // Enhanced token validation with detailed feedback
  async validateToken() {
    if (!this.token) {
      return { 
        valid: false, 
        error: 'No GitHub token configured',
        solution: 'Set REACT_APP_GITHUB_TOKEN, REACT_APP_DATA_STORAGE, or DATA_STORAGE environment variable'
      };
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
        this.log('Token validation successful', { user: user.login });
        return { 
          valid: true, 
          user: user.login,
          rateLimit: response.headers.get('X-RateLimit-Remaining')
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        this.error('Token validation failed', { status: response.status, error: errorData });
        return { 
          valid: false, 
          error: `HTTP ${response.status}: ${errorData.message || 'Invalid token'}`,
          solution: 'Check token permissions and expiration'
        };
      }
    } catch (error) {
      this.error('Token validation network error', error);
      return { 
        valid: false, 
        error: `Network error: ${error.message}`,
        solution: 'Check internet connection and GitHub API availability'
      };
    }
  }

  // Enhanced repository access check
  async checkRepositoryAccess() {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}`, {
        headers: this.getHeaders()
      });

      if (response.ok) {
        const repo = await response.json();
        this.log('Repository access confirmed', { 
          name: repo.name, 
          private: repo.private,
          permissions: repo.permissions 
        });
        return { 
          accessible: true, 
          repository: repo.name,
          permissions: repo.permissions
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        this.error('Repository access failed', { status: response.status, error: errorData });
        return { 
          accessible: false, 
          error: `HTTP ${response.status}: ${errorData.message || 'Repository not accessible'}`,
          solution: 'Check repository name and token permissions'
        };
      }
    } catch (error) {
      this.error('Repository access network error', error);
      return { 
        accessible: false, 
        error: `Network error: ${error.message}`,
        solution: 'Check internet connection'
      };
    }
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Maturity-Scan-App'
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    return headers;
  }

  // Enhanced retry mechanism with exponential backoff
  async retryOperation(operation, operationName, maxRetries = this.maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(`${operationName} - Attempt ${attempt}/${maxRetries}`);
        const result = await operation();
        
        if (result.success || attempt === maxRetries) {
          return result;
        }
        
        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.log(`${operationName} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        this.error(`${operationName} - Attempt ${attempt} failed`, error);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error.message,
            storage: 'failed',
            message: `All ${maxRetries} attempts failed: ${error.message}`
          };
        }
        
        // Wait before retry
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Enhanced file creation with multiple strategies
  async createFile(path, content, message) {
    const operation = async () => {
      // Strategy 1: Try direct file creation
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
          this.log('File created successfully', { path, sha: result.content.sha });
          return {
            success: true,
            storage: 'github',
            message: 'File stored successfully in GitHub repository',
            sha: result.content.sha,
            path: path
          };
        } else if (response.status === 422) {
          // File already exists, try update
          this.log('File exists, attempting update', { path });
          return await this.updateExistingFile(path, content, message);
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        this.error('File creation failed', error);
        throw error;
      }
    };

    return await this.retryOperation(operation, `Create file: ${path}`);
  }

  // Enhanced file update mechanism
  async updateExistingFile(path, content, message) {
    try {
      // Get current file to obtain SHA
      const getResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
        headers: this.getHeaders()
      });

      if (getResponse.ok) {
        const currentFile = await getResponse.json();
        
        // Update file with current SHA
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
          this.log('File updated successfully', { path, sha: result.content.sha });
          return {
            success: true,
            storage: 'github',
            message: 'File updated successfully in GitHub repository',
            sha: result.content.sha,
            path: path
          };
        } else {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(`Update failed: HTTP ${updateResponse.status}: ${errorData.message || 'Unknown error'}`);
        }
      } else {
        throw new Error(`Could not retrieve existing file: HTTP ${getResponse.status}`);
      }
    } catch (error) {
      this.error('File update failed', error);
      throw error;
    }
  }

  // NEW: Enhanced file deletion with comprehensive error handling
  async deleteFile(path, message) {
    const operation = async () => {
      try {
        // First, get the file to obtain its SHA (required for deletion)
        const getResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
          headers: this.getHeaders()
        });

        if (!getResponse.ok) {
          if (getResponse.status === 404) {
            this.log('File not found, considering deletion successful', { path });
            return {
              success: true,
              storage: 'github',
              message: 'File not found (already deleted or never existed)',
              path: path
            };
          }
          throw new Error(`Could not retrieve file for deletion: HTTP ${getResponse.status}`);
        }

        const fileData = await getResponse.json();
        
        // Delete the file using its SHA
        const deleteResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
          method: 'DELETE',
          headers: this.getHeaders(),
          body: JSON.stringify({
            message: message,
            sha: fileData.sha,
            branch: 'main'
          })
        });

        if (deleteResponse.ok) {
          this.log('File deleted successfully', { path });
          return {
            success: true,
            storage: 'github',
            message: 'File deleted successfully from GitHub repository',
            path: path
          };
        } else {
          const errorData = await deleteResponse.json().catch(() => ({}));
          throw new Error(`Delete failed: HTTP ${deleteResponse.status}: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        this.error('File deletion failed', error);
        throw error;
      }
    };

    return await this.retryOperation(operation, `Delete file: ${path}`);
  }

  // Enhanced assessment storage with comprehensive error handling
  async storeAssessment(assessmentData) {
    this.log('Starting assessment storage', { 
      id: assessmentData.id, 
      organisation: assessmentData.metadata.organisation 
    });

    // Pre-flight checks
    const tokenValidation = await this.validateToken();
    if (!tokenValidation.valid) {
      this.error('Token validation failed', tokenValidation);
      return await this.fallbackStorage(assessmentData, 'Token validation failed');
    }

    const repoAccess = await this.checkRepositoryAccess();
    if (!repoAccess.accessible) {
      this.error('Repository access failed', repoAccess);
      return await this.fallbackStorage(assessmentData, 'Repository access failed');
    }

    // Generate file paths
    const timestamp = new Date().toISOString();
    const dateFolder = timestamp.slice(0, 10).replace(/-/g, '/'); // YYYY/MM/DD
    const filename = `assessment-${assessmentData.id}.json`;
    const filePath = `reports/${dateFolder}/${filename}`;

    // Prepare content
    const fileContent = JSON.stringify({
      ...assessmentData,
      storedAt: timestamp,
      version: '2.1',
      storage: 'github'
    }, null, 2);

    const commitMessage = `Add AI maturity assessment: ${assessmentData.metadata.organisation || 'Anonymous'} (${assessmentData.id})`;

    // Attempt to store file
    const result = await this.createFile(filePath, fileContent, commitMessage);

    if (result.success) {
      this.log('Assessment stored successfully', result);
      
      // Update index file
      await this.updateAssessmentIndex(assessmentData, filePath);
      
      return {
        ...result,
        filePath: filePath,
        url: `https://github.com/${this.owner}/${this.repo}/blob/main/${filePath}`
      };
    } else {
      this.error('GitHub storage failed, using fallback', result);
      return await this.fallbackStorage(assessmentData, result.error);
    }
  }

  // NEW: Enhanced assessment deletion with comprehensive error handling
  async deleteAssessment(assessmentId, filePath = null) {
    this.log('Starting assessment deletion', { id: assessmentId, filePath });

    // Pre-flight checks
    const tokenValidation = await this.validateToken();
    if (!tokenValidation.valid) {
      this.error('Token validation failed for deletion', tokenValidation);
      return {
        success: false,
        error: 'Token validation failed',
        message: 'Cannot delete from GitHub: ' + tokenValidation.error
      };
    }

    const repoAccess = await this.checkRepositoryAccess();
    if (!repoAccess.accessible) {
      this.error('Repository access failed for deletion', repoAccess);
      return {
        success: false,
        error: 'Repository access failed',
        message: 'Cannot delete from GitHub: ' + repoAccess.error
      };
    }

    let deletionResults = {
      github: { success: false, message: '' },
      localStorage: { success: false, message: '' },
      index: { success: false, message: '' }
    };

    // Step 1: Delete from GitHub repository file (if filePath provided)
    if (filePath) {
      try {
        const commitMessage = `Delete AI maturity assessment: ${assessmentId}`;
        const deleteResult = await this.deleteFile(filePath, commitMessage);
        
        if (deleteResult.success) {
          deletionResults.github = {
            success: true,
            message: 'Assessment file deleted from GitHub repository'
          };
          this.log('Assessment file deleted from GitHub', { filePath });
        } else {
          deletionResults.github = {
            success: false,
            message: deleteResult.message || 'Failed to delete from GitHub'
          };
        }
      } catch (error) {
        this.error('GitHub file deletion failed', error);
        deletionResults.github = {
          success: false,
          message: `GitHub deletion error: ${error.message}`
        };
      }
    } else {
      deletionResults.github = {
        success: true,
        message: 'No file path provided, skipping GitHub file deletion'
      };
    }

    // Step 2: Remove from assessment index
    try {
      const indexUpdateResult = await this.removeFromAssessmentIndex(assessmentId);
      deletionResults.index = indexUpdateResult;
    } catch (error) {
      this.error('Index update failed during deletion', error);
      deletionResults.index = {
        success: false,
        message: `Index update error: ${error.message}`
      };
    }

    // Step 3: Remove from localStorage fallback
    try {
      const localStorageResult = this.removeFromLocalStorage(assessmentId);
      deletionResults.localStorage = localStorageResult;
    } catch (error) {
      this.error('localStorage deletion failed', error);
      deletionResults.localStorage = {
        success: false,
        message: `localStorage error: ${error.message}`
      };
    }

    // Determine overall success
    const overallSuccess = deletionResults.github.success && deletionResults.index.success;
    
    this.log('Assessment deletion completed', { 
      assessmentId, 
      overallSuccess, 
      results: deletionResults 
    });

    return {
      success: overallSuccess,
      assessmentId: assessmentId,
      deletionResults: deletionResults,
      message: overallSuccess 
        ? 'Assessment deleted successfully from all storage locations'
        : 'Assessment deletion completed with some errors'
    };
  }

  // NEW: Bulk assessment deletion
  async deleteMultipleAssessments(assessmentIds, assessmentData = []) {
    this.log('Starting bulk assessment deletion', { count: assessmentIds.length });

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const assessmentId of assessmentIds) {
      try {
        // Find the assessment data to get file path
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

        if (deleteResult.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Add small delay between deletions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        this.error(`Bulk deletion failed for assessment ${assessmentId}`, error);
        results.push({
          assessmentId,
          success: false,
          message: `Deletion error: ${error.message}`,
          details: null
        });
        failureCount++;
      }
    }

    this.log('Bulk deletion completed', { 
      total: assessmentIds.length, 
      success: successCount, 
      failures: failureCount 
    });

    return {
      success: failureCount === 0,
      totalProcessed: assessmentIds.length,
      successCount,
      failureCount,
      results,
      message: `Bulk deletion completed: ${successCount} successful, ${failureCount} failed`
    };
  }

  // Enhanced fallback storage mechanism
  async fallbackStorage(assessmentData, reason) {
    this.log('Using fallback storage', { reason });

    try {
      // Fallback 1: Local Storage
      const storageKey = `assessment_${assessmentData.id}`;
      const storageData = {
        ...assessmentData,
        storedAt: new Date().toISOString(),
        storage: 'localStorage',
        fallbackReason: reason
      };

      localStorage.setItem(storageKey, JSON.stringify(storageData));
      
      // Also store in a master index
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

      this.log('Fallback storage successful', { storageKey });

      return {
        success: true,
        storage: 'localStorage',
        message: `Data stored locally due to GitHub issue: ${reason}`,
        fallback: true,
        storageKey: storageKey,
        error: reason
      };

    } catch (fallbackError) {
      this.error('Fallback storage failed', fallbackError);
      
      return {
        success: false,
        storage: 'none',
        message: `Complete storage failure: GitHub (${reason}) and localStorage (${fallbackError.message}) both failed`,
        error: `Primary: ${reason}, Fallback: ${fallbackError.message}`
      };
    }
  }

  // Enhanced assessment index management
  async updateAssessmentIndex(assessmentData, filePath) {
    try {
      const indexPath = 'assessments_index.json';
      
      // Get current index
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

      // Add new assessment to index
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

      // Update index file
      const indexContent = JSON.stringify(currentIndex, null, 2);
      const indexMessage = `Update assessment index with ${assessmentData.metadata.organisation || 'Anonymous'} assessment`;

      await this.createFile(indexPath, indexContent, indexMessage);
      this.log('Assessment index updated successfully');

    } catch (error) {
      this.error('Failed to update assessment index', error);
      // Don't fail the main operation if index update fails
    }
  }

  // NEW: Remove assessment from index
  async removeFromAssessmentIndex(assessmentId) {
    try {
      const indexPath = 'assessments_index.json';
      
      // Get current index
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
          return {
            success: false,
            message: 'Assessment index not found'
          };
        }
      } catch (error) {
        this.error('Failed to retrieve assessment index for deletion', error);
        return {
          success: false,
          message: 'Failed to retrieve assessment index'
        };
      }

      // Remove assessment from index
      const originalLength = currentIndex.length;
      currentIndex = currentIndex.filter(assessment => assessment.id !== assessmentId);
      
      if (currentIndex.length === originalLength) {
        this.log('Assessment not found in index', { assessmentId });
        return {
          success: true,
          message: 'Assessment not found in index (may have been already removed)'
        };
      }

      // Update index file
      const indexContent = JSON.stringify(currentIndex, null, 2);
      const indexMessage = `Remove assessment ${assessmentId} from index`;

      const updateResult = await this.createFile(indexPath, indexContent, indexMessage);
      
      if (updateResult.success) {
        this.log('Assessment removed from index successfully', { assessmentId });
        return {
          success: true,
          message: 'Assessment removed from index successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to update index after removal'
        };
      }

    } catch (error) {
      this.error('Failed to remove assessment from index', error);
      return {
        success: false,
        message: `Index removal error: ${error.message}`
      };
    }
  }

  // NEW: Remove assessment from localStorage
  removeFromLocalStorage(assessmentId) {
    try {
      // Remove individual assessment
      const storageKey = `assessment_${assessmentId}`;
      localStorage.removeItem(storageKey);

      // Update master index
      const indexKey = 'assessments_index';
      const existingIndex = JSON.parse(localStorage.getItem(indexKey) || '[]');
      const updatedIndex = existingIndex.filter(assessment => assessment.id !== assessmentId);
      localStorage.setItem(indexKey, JSON.stringify(updatedIndex));

      this.log('Assessment removed from localStorage', { assessmentId });
      return {
        success: true,
        message: 'Assessment removed from localStorage successfully'
      };

    } catch (error) {
      this.error('Failed to remove assessment from localStorage', error);
      return {
        success: false,
        message: `localStorage removal error: ${error.message}`
      };
    }
  }

  // Enhanced assessment retrieval
  async getAllAssessments() {
    this.log('Retrieving all assessments');

    try {
      // Try to get from index first
      const indexResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/assessments_index.json`, {
        headers: this.getHeaders()
      });

      if (indexResponse.ok) {
        const indexFile = await indexResponse.json();
        const indexContent = atob(indexFile.content);
        const assessments = JSON.parse(indexContent);
        
        this.log('Assessments retrieved from index', { count: assessments.length });
        return {
          success: true,
          assessments: assessments,
          source: 'github_index'
        };
      }
    } catch (error) {
      this.error('Failed to retrieve from GitHub index', error);
    }

    // Fallback: Get from localStorage
    try {
      const localIndex = JSON.parse(localStorage.getItem('assessments_index') || '[]');
      this.log('Assessments retrieved from localStorage', { count: localIndex.length });
      
      return {
        success: true,
        assessments: localIndex,
        source: 'localStorage'
      };
    } catch (error) {
      this.error('Failed to retrieve from localStorage', error);
      return {
        success: false,
        assessments: [],
        error: 'No assessments found in any storage location'
      };
    }
  }

  // Enhanced individual assessment retrieval
  async getAssessment(filePath) {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${filePath}`, {
        headers: this.getHeaders()
      });

      if (response.ok) {
        const file = await response.json();
        const content = atob(file.content);
        const assessment = JSON.parse(content);
        
        this.log('Individual assessment retrieved', { filePath });
        return {
          success: true,
          data: assessment
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.error('Failed to retrieve individual assessment', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enhanced bulk export functionality
  async generateBulkExport(assessments, format = 'csv') {
    this.log('Generating bulk export', { count: assessments.length, format });

    if (format === 'csv') {
      const headers = [
        'ID', 'Organisation', 'Contact', 'Date', 'Overall Score', 'Maturity Level',
        'Governance Score', 'Data Score', 'People Score', 'Process Score', 'Technology Score', 'Ethics Score'
      ];

      const rows = assessments.map(assessment => [
        assessment.id,
        assessment.organisation || '',
        assessment.contact || '',
        assessment.date,
        assessment.overallScore,
        assessment.maturityLevel,
        // Add category scores if available
        assessment.categoryScores?.governance || '',
        assessment.categoryScores?.data || '',
        assessment.categoryScores?.people || '',
        assessment.categoryScores?.process || '',
        assessment.categoryScores?.technology || '',
        assessment.categoryScores?.ethics || ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return csvContent;
    } else {
      // JSON format
      return JSON.stringify(assessments, null, 2);
    }
  }

  // Service availability check
  isAvailable() {
    return !!this.token;
  }

  // Enhanced diagnostic information
  async getDiagnosticInfo() {
    const tokenValidation = await this.validateToken();
    const repoAccess = await this.checkRepositoryAccess();
    
    return {
      service: 'GitHubServiceRobust',
      version: '2.2',
      timestamp: new Date().toISOString(),
      configuration: {
        hasToken: !!this.token,
        tokenLength: this.token ? this.token.length : 0,
        owner: this.owner,
        repo: this.repo,
        baseUrl: this.baseUrl
      },
      tokenValidation,
      repositoryAccess: repoAccess,
      localStorage: {
        available: typeof Storage !== 'undefined',
        assessmentCount: JSON.parse(localStorage.getItem('assessments_index') || '[]').length
      },
      features: {
        create: true,
        read: true,
        update: true,
        delete: true,
        bulkOperations: true,
        fallbackStorage: true
      }
    };
  }
}

export default GitHubServiceRobust;
