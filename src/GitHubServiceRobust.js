// Enhanced GitHub Service with Bulletproof Error Handling and Multiple Fallback Strategies
class GitHubServiceRobust {
  constructor() {
    this.owner = 'florianliep';
    this.repo = 'AI-maturity-scan';
    this.baseUrl = 'https://api.github.com';
    this.token = process.env.REACT_APP_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
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
        solution: 'Set REACT_APP_GITHUB_TOKEN or GITHUB_TOKEN environment variable'
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
      version: '2.1',
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
      }
    };
  }
}

export default GitHubServiceRobust;
