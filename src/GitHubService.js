// Fallback Storage for when GitHub API is not available
class FallbackStorage {
  constructor() {
    this.storageKey = 'eraneos_ai_assessments';
  }

  // Store assessment in localStorage
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

  // Get all assessments from localStorage
  getAllAssessments() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to retrieve from fallback storage:', error);
      return [];
    }
  }

  // Generate export data from localStorage
  generateExport(format = 'csv') {
    const assessments = this.getAllAssessments();
    if (format === 'csv') {
      return this.generateCSV(assessments);
    }
    return JSON.stringify(assessments, null, 2);
  }

  // Generate CSV from stored assessments
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

  // Clear all stored assessments
  clearAll() {
    localStorage.removeItem(this.storageKey);
  }
}

// Enhanced GitHub API Service for Assessment Data Management
class GitHubService {
  constructor() {
    // GitHub configuration - these should be set as environment variables
    this.owner = 'florianliepz';
    this.repo = 'AI-maturity-scan';
    this.token = process.env.REACT_APP_GITHUB_TOKEN || null;
    this.baseUrl = 'https://api.github.com';
    this.fallbackStorage = new FallbackStorage();
    
    // Enhanced logging
    console.log('GitHubService initialized:', {
      hasToken: !!this.token,
      tokenLength: this.token ? this.token.length : 0,
      owner: this.owner,
      repo: this.repo
    });
  }

  // Check if GitHub integration is available
  isAvailable() {
    const available = !!this.token;
    if (!available) {
      console.warn('GitHub integration not available: Missing REACT_APP_GITHUB_TOKEN');
    }
    return available;
  }

  // Enhanced error handling for API calls
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

  // Get current date path for organized storage
  getDatePath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
  }

  // Enhanced store assessment with fallback
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
      const datePath = this.getDatePath();
      const fileName = `assessment-${assessmentData.id}-${assessmentData.metadata.organisation || 'anonymous'}.json`;
      const filePath = `reports/${datePath}/${fileName}`;
      
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
      
      // Update the index file
      await this.updateIndex(assessmentData);
      
      return { 
        success: true, 
        storage: 'github',
        sha: result.content.sha,
        url: result.content.html_url,
        path: filePath,
        message: 'Successfully stored in GitHub repository'
      };
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

  // Get fallback storage instance
  getFallbackStorage() {
    return this.fallbackStorage;
  }

  // Update the assessment index for quick access
  async updateIndex(newAssessment) {
    try {
      const indexPath = 'reports/index.json';
      let currentIndex = [];
      
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
        }
      } catch (error) {
        // Index doesn't exist yet, start with empty array
        console.log('Creating new index file');
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
        filePath: `reports/${this.getDatePath()}/assessment-${newAssessment.id}-${newAssessment.metadata.organisation || 'anonymous'}.json`
      };

      currentIndex.push(indexEntry);
      
      // Sort by timestamp (newest first)
      currentIndex.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const updatedContent = btoa(JSON.stringify(currentIndex, null, 2));
      
      // Get current index SHA if it exists
      let sha = null;
      try {
        const currentIndexResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${indexPath}`, {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (currentIndexResponse.ok) {
          const currentIndexData = await currentIndexResponse.json();
          sha = currentIndexData.sha;
        }
      } catch (error) {
        // No existing index
      }

      const indexUpdateBody = {
        message: `Update assessment index with ${newAssessment.metadata.organisation || 'Anonymous'} assessment`,
        content: updatedContent,
        committer: {
          name: 'AI Maturity Scan Bot',
          email: 'ai-scan@eraneos.com'
        }
      };

      if (sha) {
        indexUpdateBody.sha = sha;
      }

      await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${indexPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(indexUpdateBody)
      });

    } catch (error) {
      console.error('Failed to update index:', error);
    }
  }

  // Retrieve all assessments from GitHub
  async getAllAssessments() {
    if (!this.isAvailable()) {
      return { success: false, error: 'GitHub token not configured' };
    }

    try {
      const indexPath = 'reports/index.json';
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
}

export default GitHubService;
