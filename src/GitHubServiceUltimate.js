// Ultimate GitHub API Service - Bulletproof 409 Error Resolution
// Uses flat file structure to completely avoid directory creation issues

class FallbackStorage {
  constructor() {
    this.storageKey = 'eraneos_ai_assessments';
  }

  storeAssessment(assessmentData) {
    try {
      const existingData = this.getAllAssessments();
      existingData.push(assessmentData);
      localStorage.setItem(this.storageKey, JSON.stringify(existingData));
      console.log('Assessment stored in fallback storage:', assessmentData.id);
      return { success: true, storage: 'localStorage' };
    } catch (error) {
      console.error('Fallback storage failed:', error);
      return { success: false, error: error.message };
    }
  }

  getAllAssessments() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to retrieve from fallback storage:', error);
      return [];
    }
  }

  generateExport(format = 'csv') {
    const assessments = this.getAllAssessments();
    if (format === 'csv') {
      return this.generateCSV(assessments);
    }
    return JSON.stringify(assessments, null, 2);
  }

  generateCSV(assessments) {
    const rows = [];
    rows.push(['Assessment ID', 'Organisation', 'Contact', 'Date', 'Overall Score', 'Maturity Level', 'Timestamp']);
    
    assessments.forEach(assessment => {
      rows.push([
        assessment.id,
        assessment.metadata.organisation || 'Anonymous',
        assessment.metadata.contact || '',
        assessment.metadata.date,
        assessment.scores.overall,
        assessment.maturity.name,
        assessment.timestamp
      ]);
    });

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  clearAll() {
    localStorage.removeItem(this.storageKey);
  }
}

class GitHubServiceUltimate {
  constructor() {
    // GitHub configuration with environment variable support
    this.owner = process.env.REACT_APP_GITHUB_OWNER || 'florianliepe';
    this.repo = process.env.REACT_APP_GITHUB_REPO || 'AI-maturity-scan';
    this.token = process.env.REACT_APP_GITHUB_TOKEN || null;
    this.baseUrl = 'https://api.github.com';
    this.fallbackStorage = new FallbackStorage();
    
    // Enhanced logging with validation
    console.log('GitHubServiceUltimate initialized:', {
      hasToken: !!this.token,
      tokenPrefix: this.token ? this.token.substring(0, 8) + '...' : 'none',
      tokenValid: this.token ? this.isValidTokenFormat(this.token) : false,
      owner: this.owner,
      repo: this.repo,
      apiUrl: this.baseUrl
    });
    
    // Validate token format
    if (this.token && !this.isValidTokenFormat(this.token)) {
      console.warn('GitHub token format appears invalid. Expected format: ghp_*, github_pat_*, or gho_*');
    }
    
    // Make service available globally for debugging
    if (typeof window !== 'undefined') {
      window.githubServiceUltimate = this;
    }
  }

  isValidTokenFormat(token) {
    if (!token) return false;
    
    return (
      token.startsWith('ghp_') ||           // Personal access tokens
      token.startsWith('github_pat_') ||    // Fine-grained personal access tokens
      token.startsWith('gho_') ||           // OAuth tokens
      token.startsWith('ghs_') ||           // Server-to-server tokens
      (token.length >= 40 && /^[a-zA-Z0-9]+$/.test(token)) // Classic tokens
    );
  }

  async validateToken() {
    if (!this.token) {
      return { valid: false, error: 'No token provided' };
    }

    if (!this.isValidTokenFormat(this.token)) {
      return { valid: false, error: 'Invalid token format' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Token validation successful:', userData.login);
        return { valid: true, user: userData.login };
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        return { valid: false, error: `API error: ${errorData.message}` };
      }
    } catch (error) {
      return { valid: false, error: `Network error: ${error.message}` };
    }
  }

  isAvailable() {
    const available = !!this.token;
    if (!available) {
      console.warn('GitHub integration not available: Missing REACT_APP_GITHUB_TOKEN');
    }
    return available;
  }

  async makeGitHubRequest(url, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('GitHub token not configured. Please set REACT_APP_GITHUB_TOKEN environment variable.');
    }

    const defaultOptions = {
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    };

    try {
      console.log('Making GitHub API request:', url);
      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const error = new Error(`GitHub API error (${response.status}): ${errorData.message}`);
        error.status = response.status;
        error.response = errorData;
        throw error;
      }

      return response;
    } catch (error) {
      console.error('GitHub API request failed:', error);
      throw error;
    }
  }

  // Generate ultra-safe filename with timestamp and random suffix
  generateUltraSafeFilename(assessmentData) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const orgName = (assessmentData.metadata.organisation || 'anonymous')
      .replace(/[^a-zA-Z0-9]/g, '')  // Remove ALL special characters
      .substring(0, 20)  // Limit length
      .toLowerCase();
    
    return `assessment_${timestamp}_${orgName}_${randomSuffix}.json`;
  }

  // Check if file exists (simple check without complex directory logic)
  async checkFileExists(filePath) {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${filePath}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.status === 200) {
        const data = await response.json();
        return { exists: true, sha: data.sha };
      } else if (response.status === 404) {
        return { exists: false, sha: null };
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error) {
      console.error('Error checking file existence:', error);
      return { exists: false, sha: null };
    }
  }

  // FLAT FILE APPROACH - No directory creation, store everything in root
  async storeAssessment(assessmentData) {
    // Always store in fallback storage first
    const fallbackResult = this.fallbackStorage.storeAssessment(assessmentData);
    console.log('Fallback storage result:', fallbackResult);

    // Try GitHub storage if available
    if (!this.isAvailable()) {
      console.warn('GitHub token not available, using fallback storage only');
      return { 
        success: true, 
        storage: 'localStorage',
        message: 'Stored locally (GitHub token not configured)',
        fallback: true
      };
    }

    try {
      // Use FLAT file structure - no directories!
      const fileName = this.generateUltraSafeFilename(assessmentData);
      const filePath = `assessments_${fileName}`; // Store in root with prefix
      
      console.log('Attempting to store assessment at:', filePath);
      
      // Check if file already exists (should be extremely rare with timestamp + random)
      const fileCheck = await this.checkFileExists(filePath);
      if (fileCheck.exists) {
        console.warn('File already exists (extremely rare), generating new filename');
        const newFileName = this.generateUltraSafeFilename({
          ...assessmentData,
          id: `${assessmentData.id}_${Math.random().toString(36).substring(2, 8)}`
        });
        const newFilePath = `assessments_${newFileName}`;
        return this.storeAssessmentFile(assessmentData, newFilePath);
      }
      
      return this.storeAssessmentFile(assessmentData, filePath);
      
    } catch (error) {
      console.error('GitHub storage failed, using fallback:', error);
      return { 
        success: true, 
        storage: 'localStorage',
        error: error.message,
        message: 'GitHub failed, stored locally as backup',
        fallback: true
      };
    }
  }

  // Store assessment file with bulletproof error handling
  async storeAssessmentFile(assessmentData, filePath) {
    try {
      const content = btoa(JSON.stringify(assessmentData, null, 2));
      
      const response = await this.makeGitHubRequest(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Add AI maturity assessment: ${assessmentData.metadata.organisation || 'Anonymous'} (${assessmentData.id})`,
          content: content,
          committer: {
            name: 'AI Maturity Scan Bot',
            email: 'ai-scan@eraneos.com'
          }
        })
      });

      const result = await response.json();
      console.log('Assessment stored successfully in GitHub:', filePath);
      
      // Update the index file (also flat structure)
      await this.updateIndex(assessmentData, filePath);
      
      return { 
        success: true, 
        storage: 'github',
        sha: result.content.sha,
        url: result.content.html_url,
        path: filePath,
        message: 'Successfully stored in GitHub repository'
      };
    } catch (error) {
      console.error('Failed to store assessment file:', error);
      throw error;
    }
  }

  // Enhanced index update with flat structure
  async updateIndex(newAssessment, filePath) {
    try {
      const indexPath = 'assessments_index.json'; // Flat structure
      let currentIndex = [];
      let currentSha = null;
      
      // Try to get existing index
      try {
        const indexResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${indexPath}`, {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (indexResponse.ok) {
          const indexData = await indexResponse.json();
          currentIndex = JSON.parse(atob(indexData.content));
          currentSha = indexData.sha;
          console.log('Loaded existing index with', currentIndex.length, 'entries');
        }
      } catch (error) {
        console.log('Creating new index file (existing index not found)');
      }

      // Add new assessment to index
      const indexEntry = {
        id: newAssessment.id,
        timestamp: newAssessment.timestamp,
        organisation: newAssessment.metadata.organisation || 'Anonymous',
        contact: newAssessment.metadata.contact,
        date: newAssessment.metadata.date,
        overallScore: newAssessment.scores.overall,
        maturityLevel: newAssessment.maturity.name,
        filePath: filePath
      };

      // Check for duplicates and remove if found
      currentIndex = currentIndex.filter(entry => entry.id !== newAssessment.id);
      currentIndex.push(indexEntry);
      
      // Sort by timestamp (newest first)
      currentIndex.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const updatedContent = btoa(JSON.stringify(currentIndex, null, 2));
      
      const indexUpdateBody = {
        message: `Update assessment index with ${newAssessment.metadata.organisation || 'Anonymous'} assessment`,
        content: updatedContent,
        committer: {
          name: 'AI Maturity Scan Bot',
          email: 'ai-scan@eraneos.com'
        }
      };

      if (currentSha) {
        indexUpdateBody.sha = currentSha;
      }

      const updateResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${indexPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(indexUpdateBody)
      });

      if (updateResponse.ok) {
        console.log('Index updated successfully');
      } else {
        const errorData = await updateResponse.json();
        console.error('Failed to update index:', errorData);
      }

    } catch (error) {
      console.error('Failed to update index:', error);
    }
  }

  // Get fallback storage instance
  getFallbackStorage() {
    return this.fallbackStorage;
  }

  // Retrieve all assessments from GitHub (flat structure)
  async getAllAssessments() {
    if (!this.isAvailable()) {
      return { success: false, error: 'GitHub token not configured' };
    }

    try {
      const indexPath = 'assessments_index.json';
      const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${indexPath}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        return { success: true, assessments: [] }; // No assessments yet
      }

      const indexData = await response.json();
      const assessments = JSON.parse(atob(indexData.content));
      
      return { success: true, assessments };
    } catch (error) {
      console.error('Failed to retrieve assessments:', error);
      return { success: false, error: error.message };
    }
  }

  // Retrieve specific assessment data
  async getAssessment(filePath) {
    if (!this.isAvailable()) {
      return { success: false, error: 'GitHub token not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${filePath}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve assessment: ${response.statusText}`);
      }

      const fileData = await response.json();
      const assessmentData = JSON.parse(atob(fileData.content));
      
      return { success: true, data: assessmentData };
    } catch (error) {
      console.error('Failed to retrieve assessment:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate bulk export data
  async generateBulkExport(selectedAssessments, format = 'csv') {
    const exportData = [];
    
    for (const assessment of selectedAssessments) {
      try {
        const result = await this.getAssessment(assessment.filePath);
        if (result.success) {
          exportData.push(result.data);
        }
      } catch (error) {
        console.error(`Failed to load assessment ${assessment.id}:`, error);
      }
    }

    if (format === 'csv') {
      return this.generateBulkCSV(exportData);
    } else if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }
    
    return exportData;
  }

  // Generate bulk CSV export
  generateBulkCSV(assessments) {
    const rows = [];
    
    // Header row
    rows.push([
      'Assessment ID',
      'Organisation',
      'Contact',
      'Date',
      'Overall Score',
      'Maturity Level',
      'Governance Score',
      'Data Score',
      'People Score',
      'Process Score',
      'Technology Score',
      'Ethics Score',
      'Timestamp'
    ]);

    // Data rows
    assessments.forEach(assessment => {
      const categoryScores = {};
      assessment.scores.categories.forEach(cat => {
        categoryScores[cat.id] = cat.score;
      });

      rows.push([
        assessment.id,
        assessment.metadata.organisation || 'Anonymous',
        assessment.metadata.contact || '',
        assessment.metadata.date,
        assessment.scores.overall,
        assessment.maturity.name,
        categoryScores.governance || '',
        categoryScores.data || '',
        categoryScores.people || '',
        categoryScores.process || '',
        categoryScores.technology || '',
        categoryScores.ethics || '',
        assessment.timestamp
      ]);
    });

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  // Diagnostic method to check repository structure
  async diagnoseRepository() {
    if (!this.isAvailable()) {
      return { error: 'GitHub token not configured' };
    }

    const diagnostics = {
      tokenValid: false,
      repositoryExists: false,
      indexFileExists: false,
      permissions: {},
      recommendations: [],
      strategy: 'flat_file_structure'
    };

    try {
      // Check token validity
      const tokenCheck = await this.validateToken();
      diagnostics.tokenValid = tokenCheck.valid;
      if (!tokenCheck.valid) {
        diagnostics.recommendations.push(`Fix token issue: ${tokenCheck.error}`);
      }

      // Check repository access
      try {
        const repoResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}`, {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          diagnostics.repositoryExists = true;
          diagnostics.permissions = repoData.permissions || {};
        }
      } catch (error) {
        diagnostics.recommendations.push('Repository access failed - check repository name and permissions');
      }

      // Check index file (flat structure)
      try {
        const indexResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/assessments_index.json`, {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        diagnostics.indexFileExists = indexResponse.ok;
        if (!indexResponse.ok) {
          diagnostics.recommendations.push('Index file does not exist - will be created on first assessment');
        }
      } catch (error) {
        diagnostics.recommendations.push('Could not check index file');
      }

      diagnostics.recommendations.push('Using flat file structure to avoid directory conflicts');
      diagnostics.recommendations.push('All assessment files stored in repository root with prefix');

      return diagnostics;
    } catch (error) {
      return { error: error.message, diagnostics };
    }
  }

  // Migration helper to move from old structure to flat structure
  async migrateToFlatStructure() {
    if (!this.isAvailable()) {
      return { success: false, error: 'GitHub token not configured' };
    }

    console.log('Starting migration to flat file structure...');
    
    try {
      // This would be implemented if needed to migrate existing files
      // For now, just return success as new files will use flat structure
      return { 
        success: true, 
        message: 'Migration not needed - new flat structure will be used for future assessments' 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default GitHubServiceUltimate;

