import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import GitHubService from './GitHubService';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const ERANEOS_COLORS = {
  brand: 'bg-[#0b6b9a]',
  accent: 'bg-[#ff7a00]'
};

const QUESTIONS = [
  {
    id: 'governance',
    title: 'Governance & Strategy',
    description: 'Leadership, strategy, policies, roles & KPIs for AI in HR (hiring, scheduling, performance).',
    items: [
      { id: 'g1', text: 'We have a written AI strategy that covers HR use-cases (hiring, scheduling, payroll)' },
      { id: 'g2', text: 'Defined ownership and decision rights for AI in HR (HR lead + IT/data owner)' },
      { id: 'g3', text: 'Policies exist for acceptable use, privacy, and audit of HR AI tools' }
    ]
  },
  {
    id: 'data',
    title: 'Data & Integration',
    description: 'Availability, quality, governance and integrations of HR & retail data (POS, ATS, payroll).',
    items: [
      { id: 'd1', text: 'HR systems (ATS, HRIS) data is available and integrated (skills, tenure, performance)' },
      { id: 'd2', text: 'Retail operational data (POS, schedules) is accessible for workforce planning' },
      { id: 'd3', text: 'Data quality checks and anonymization processes are in place' }
    ]
  },
  {
    id: 'people',
    title: 'People & Skills',
    description: 'AI literacy, training and change readiness in HR and store teams.',
    items: [
      { id: 'p1', text: 'HR staff have basic AI literacy and training programs exist' },
      { id: 'p2', text: 'Store managers are trained to interpret AI recommendations (scheduling, forecasts)' },
      { id: 'p3', text: 'Processes exist to escalate model concerns / false positives' }
    ]
  },
  {
    id: 'process',
    title: 'Processes & Use-cases',
    description: 'Documented processes and prioritized AI use-cases for HR in retail.',
    items: [
      { id: 'pr1', text: 'Use-cases like candidate screening, workforce forecasting, shift optimization are prioritized' },
      { id: 'pr2', text: 'End-to-end process maps exist (input -> model -> human decision -> audit)' },
      { id: 'pr3', text: 'SLA & KPI definitions exist for AI outputs used in HR decisions' }
    ]
  },
  {
    id: 'technology',
    title: 'Technology & Tools',
    description: 'Tooling, infra and vendor management (HRIS, cloud, LLMs).',
    items: [
      { id: 't1', text: 'Secure tooling and platform for AI experiments (sandboxed, versioned)' },
      { id: 't2', text: 'Integration with HRIS/ATS and identity providers is implemented' },
      { id: 't3', text: 'Vendor risk assessments and contracts address data handling' }
    ]
  },
  {
    id: 'ethics',
    title: 'Ethics, Compliance & Privacy',
    description: 'Bias mitigation, consent, GDPR, and HR-specific ethics (hiring fairness).',
    items: [
      { id: 'e1', text: 'Bias checks and fairness evaluation are part of the model lifecycle' },
      { id: 'e2', text: 'Consent, DPIA and record of processing are maintained for HR data' },
      { id: 'e3', text: 'Logging, explainability and appeals processes exist for automated decisions' }
    ]
  }
];

const MATURITY_LEVELS = [
  { level: 1, name: 'Initial', color: '#ef4444', description: 'Ad-hoc, reactive approach to AI in HR' },
  { level: 2, name: 'Developing', color: '#f97316', description: 'Basic processes and awareness emerging' },
  { level: 3, name: 'Defined', color: '#eab308', description: 'Documented processes and clear governance' },
  { level: 4, name: 'Managed', color: '#22c55e', description: 'Measured and controlled AI implementation' },
  { level: 5, name: 'Optimized', color: '#059669', description: 'Continuous improvement and innovation' }
];

export default function EraneosAIMaturityScan() {
  const initialAnswers = useMemo(() => {
    const map = {};
    QUESTIONS.forEach(cat => cat.items.forEach(q => (map[q.id] = 3)));
    return map;
  }, []);

  const [answers, setAnswers] = useState(initialAnswers);
  const [metadata, setMetadata] = useState({ organisation: '', contact: '', date: new Date().toISOString().slice(0,10) });
  const [submitted, setSubmitted] = useState(null);
  const [view, setView] = useState('form'); // form | dashboard | result | report | admin
  const [reportData, setReportData] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState({ github: false, email: false });
  
  // Admin dashboard state
  const [allAssessments, setAllAssessments] = useState([]);
  const [selectedAssessments, setSelectedAssessments] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    organisation: '',
    maturityLevel: '',
    scoreMin: '',
    scoreMax: ''
  });
  const [loading, setLoading] = useState(false);
  
  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  
  // Initialize GitHub service
  const githubService = useMemo(() => new GitHubService(), []);

  // Add token validation on component mount
  useEffect(() => {
    const validateGitHubToken = async () => {
      if (githubService.isAvailable()) {
        console.log('Validating GitHub token...');
        const validation = await githubService.validateToken();
        console.log('Token validation result:', validation);
        
        if (!validation.valid) {
          console.warn('GitHub token validation failed:', validation.error);
        } else {
          console.log('GitHub token is valid for user:', validation.user);
        }
      }
    };
    
    validateGitHubToken();
  }, [githubService]);

  // Check for report data in URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportParam = urlParams.get('report');
    
    if (reportParam) {
      try {
        const decodedData = JSON.parse(atob(reportParam));
        setReportData(decodedData);
        setView('report');
      } catch (error) {
        console.error('Invalid report data in URL');
      }
    }
  }, []);

  const handleAnswer = (qid, val) => setAnswers(prev => ({ ...prev, [qid]: Number(val) }));

  const computeScores = () => {
    const catScores = QUESTIONS.map(cat => {
      const sum = cat.items.reduce((s, q) => s + (answers[q.id] || 0), 0);
      const avg = sum / cat.items.length;
      return { id: cat.id, title: cat.title, score: Number((avg).toFixed(2)) };
    });
    const overall = Number((catScores.reduce((s, c) => s + c.score, 0) / catScores.length).toFixed(2));
    return { categories: catScores, overall };
  };

  const scores = computeScores();
  const maturityLevel = Math.max(0, Math.min(4, Math.round(scores.overall) - 1));
  const maturity = MATURITY_LEVELS[maturityLevel] || MATURITY_LEVELS[0];

  const exportToCSV = () => {
    const rows = [];
    rows.push(['Category', 'Question', 'Answer']);
    QUESTIONS.forEach(cat => {
      cat.items.forEach(q => rows.push([cat.title, q.text, answers[q.id]]));
    });
    rows.push(['Metadata', 'Organisation', metadata.organisation]);
    rows.push(['Metadata', 'Contact', metadata.contact]);
    rows.push(['Metadata', 'Date', metadata.date]);
    rows.push(['Results', 'Overall Score', scores.overall]);
    rows.push(['Results', 'Maturity Level', maturity.name]);
    
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eraneos-ai-scan-${metadata.organisation || 'anonymous'}-${metadata.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Enhanced GitHub submission with detailed feedback
  const submitToGitHub = async (assessmentData) => {
    try {
      const result = await githubService.storeAssessment(assessmentData);
      console.log('GitHub Backup Result:', result);
      
      // Update submission status with detailed information
      setSubmissionStatus(prev => ({ 
        ...prev, 
        github: result.success ? 'success' : 'failed',
        githubDetails: {
          storage: result.storage,
          message: result.message,
          fallback: result.fallback,
          error: result.error
        }
      }));
      
      return result.success;
    } catch (error) {
      console.error('GitHub backup failed:', error);
      setSubmissionStatus(prev => ({ 
        ...prev, 
        github: 'failed',
        githubDetails: {
          storage: 'none',
          message: 'Complete failure - no storage available',
          error: error.message
        }
      }));
      return false;
    }
  };

  // Load all assessments from GitHub
  const loadAllAssessments = async () => {
    setLoading(true);
    try {
      const result = await githubService.getAllAssessments();
      if (result.success) {
        setAllAssessments(result.assessments);
      } else {
        console.error('Failed to load assessments:', result.error);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter assessments based on current filters
  const filteredAssessments = useMemo(() => {
    return allAssessments.filter(assessment => {
      // Date range filter
      if (filters.dateFrom && new Date(assessment.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(assessment.date) > new Date(filters.dateTo)) return false;
      
      // Organisation filter
      if (filters.organisation && !assessment.organisation.toLowerCase().includes(filters.organisation.toLowerCase())) return false;
      
      // Maturity level filter
      if (filters.maturityLevel && assessment.maturityLevel !== filters.maturityLevel) return false;
      
      // Score range filter
      if (filters.scoreMin && assessment.overallScore < parseFloat(filters.scoreMin)) return false;
      if (filters.scoreMax && assessment.overallScore > parseFloat(filters.scoreMax)) return false;
      
      return true;
    });
  }, [allAssessments, filters]);

  // Handle bulk export
  const handleBulkExport = async (format = 'csv') => {
    if (selectedAssessments.length === 0) {
      alert('Please select assessments to export');
      return;
    }

    setLoading(true);
    try {
      const selectedData = allAssessments.filter(a => selectedAssessments.includes(a.id));
      const exportContent = await githubService.generateBulkExport(selectedData, format);
      
      const blob = new Blob([exportContent], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eraneos-bulk-export-${new Date().toISOString().slice(0,10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Bulk export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics from all assessments
  const analytics = useMemo(() => {
    if (allAssessments.length === 0) return null;
    
    const totalAssessments = allAssessments.length;
    const averageScore = allAssessments.reduce((sum, a) => sum + a.overallScore, 0) / totalAssessments;
    
    const maturityDistribution = MATURITY_LEVELS.reduce((dist, level) => {
      dist[level.name] = allAssessments.filter(a => a.maturityLevel === level.name).length;
      return dist;
    }, {});
    
    const recentAssessments = allAssessments
      .filter(a => new Date(a.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .length;
    
    return {
      totalAssessments,
      averageScore: averageScore.toFixed(2),
      maturityDistribution,
      recentAssessments
    };
  }, [allAssessments]);

  const sendEmailReport = async (assessmentData) => {
    try {
      // Email service integration (EmailJS or similar)
      const emailData = {
        to: 'florian.liepe@eraneos.com',
        subject: `AI Maturity Assessment - ${assessmentData.metadata.organisation || 'Anonymous'}`,
        body: `
Assessment completed for: ${assessmentData.metadata.organisation || 'Anonymous'}
Contact: ${assessmentData.metadata.contact || 'Not provided'}
Date: ${assessmentData.metadata.date}
Overall Score: ${assessmentData.scores.overall}/5.0
Maturity Level: ${assessmentData.maturity.name}

Assessment ID: ${assessmentData.id}
        `,
        csvData: generateCSVContent(assessmentData)
      };
      
      // Note: In production, this would integrate with EmailJS or similar service
      console.log('Email Report:', emailData);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  };

  const generateCSVContent = (assessmentData) => {
    const rows = [];
    rows.push(['Category', 'Question', 'Answer']);
    QUESTIONS.forEach(cat => {
      cat.items.forEach(q => rows.push([cat.title, q.text, assessmentData.answers[q.id]]));
    });
    rows.push(['Metadata', 'Organisation', assessmentData.metadata.organisation]);
    rows.push(['Metadata', 'Contact', assessmentData.metadata.contact]);
    rows.push(['Metadata', 'Date', assessmentData.metadata.date]);
    rows.push(['Results', 'Overall Score', assessmentData.scores.overall]);
    rows.push(['Results', 'Maturity Level', assessmentData.maturity.name]);
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const generateReportLink = (assessmentData) => {
    const encodedData = btoa(JSON.stringify(assessmentData));
    return `${window.location.origin}${window.location.pathname}?report=${encodedData}`;
  };

  // Admin authentication functions
  const handleAdminLogin = () => {
    setShowAdminLogin(true);
    setAdminLoginError('');
    setAdminPassword('');
  };

  const handleAdminPasswordSubmit = (e) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'eraneos2024';
    
    if (adminPassword === correctPassword) {
      setIsAdminAuthenticated(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      setAdminLoginError('');
      // Store authentication in session storage
      sessionStorage.setItem('adminAuthenticated', 'true');
    } else {
      setAdminLoginError('Incorrect password. Please try again.');
      setAdminPassword('');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('adminAuthenticated');
    if (view === 'admin') {
      setView('form');
    }
  };

  // Check for existing admin session on component mount
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
    setIsAdminAuthenticated(isAuthenticated);
  }, []);

  // DELETE FUNCTIONALITY - Handle delete assessment with confirmation
  const handleDeleteAssessment = (assessment) => {
    if (window.confirm(`Delete assessment for ${assessment.organisation}?`)) {
      const password = prompt('Enter admin password:');
      if (password === (import.meta.env.VITE_ADMIN_PASSWORD || 'eraneos2024')) {
        deleteAssessment(assessment);
      } else {
        alert('Incorrect password');
      }
    }
  };

  const deleteAssessment = async (assessment) => {
    setLoading(true);
    try {
      const result = await githubService.deleteAssessment(assessment.id, assessment.filePath);
      if (result.success) {
        setAllAssessments(prev => prev.filter(a => a.id !== assessment.id));
        setSelectedAssessments(prev => prev.filter(id => id !== assessment.id));
        alert('Assessment deleted successfully');
      } else {
        alert('Delete failed: ' + result.message);
      }
    } catch (error) {
      alert('Delete error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    const id = Date.now().toString();
    const assessmentData = { 
      id, 
      metadata, 
      answers, 
      scores,
      maturity,
      timestamp: new Date().toISOString(),
      version: '2.0'
    };
    
    // Generate shareable report link with embedded data
    const shareLink = generateReportLink(assessmentData);
    
    setSubmitted({ id, payload: assessmentData, shareLink });
    setView('result');
    
    // Start backup processes
    setSubmissionStatus({ github: 'pending', email: 'pending' });
    
    // GitHub backup
    const githubSuccess = await submitToGitHub(assessmentData);
    setSubmissionStatus(prev => ({ ...prev, github: githubSuccess ? 'success' : 'failed' }));
    
    // Email backup
    const emailSuccess = await sendEmailReport(assessmentData);
    setSubmissionStatus(prev => ({ ...prev, email: emailSuccess ? 'success' : 'failed' }));
  };

  // Enhanced Chart.js data preparation with better styling
  const radarData = {
    labels: scores.categories.map(c => c.title.replace(' & ', '\n& ')),
    datasets: [
      {
        label: 'Current Maturity',
        data: scores.categories.map(c => c.score),
        backgroundColor: 'rgba(11, 107, 154, 0.15)',
        borderColor: '#0b6b9a',
        borderWidth: 3,
        pointBackgroundColor: '#ff7a00',
        pointBorderColor: '#ff7a00',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Target (Level 4)',
        data: new Array(6).fill(4),
        backgroundColor: 'rgba(255, 122, 0, 0.1)',
        borderColor: '#ff7a00',
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
        pointRadius: 0,
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 5,
        min: 0,
        ticks: {
          stepSize: 1,
          font: { size: 12 },
          color: '#6b7280',
        },
        grid: {
          color: '#e5e7eb',
        },
        angleLines: {
          color: '#e5e7eb',
        },
        pointLabels: {
          font: { size: 11, weight: 'bold' },
          color: '#374151',
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 12 },
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.r.toFixed(1)}`;
          }
        }
      },
    },
  };

  const barData = {
    labels: scores.categories.map(c => c.title.split(' ')[0]),
    datasets: [
      {
        label: 'Current Score',
        data: scores.categories.map(c => c.score),
        backgroundColor: scores.categories.map(c => {
          const level = Math.round(c.score) - 1;
          return MATURITY_LEVELS[Math.max(0, Math.min(4, level))].color + '80';
        }),
        borderColor: scores.categories.map(c => {
          const level = Math.round(c.score) - 1;
          return MATURITY_LEVELS[Math.max(0, Math.min(4, level))].color;
        }),
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          font: { size: 12 },
        },
        grid: {
          color: '#f3f4f6',
        },
      },
      x: {
        ticks: {
          font: { size: 11 },
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const level = Math.round(context.parsed.y) - 1;
            const maturityName = MATURITY_LEVELS[Math.max(0, Math.min(4, level))].name;
            return `Score: ${context.parsed.y.toFixed(1)} (${maturityName})`;
          }
        }
      },
    },
  };

  // Progress indicators for each category
  const getProgressColor = (score) => {
    const level = Math.round(score) - 1;
    return MATURITY_LEVELS[Math.max(0, Math.min(4, level))].color;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <header className="flex items-center justify-between mb-8 bg-white p-6 rounded-lg shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl ${ERANEOS_COLORS.brand}`}>E</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Eraneos — AI Readiness & Maturity Scan</h1>
            <p className="text-gray-600">Tailored for HR in Retail — Comprehensive Assessment with Advanced Visualization</p>
          </div>
        </div>
        
        {/* Admin Login Link */}
        {!isAdminAuthenticated && (
          <div className="absolute top-4 right-4">
            <button
              onClick={handleAdminLogin}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Admin
            </button>
          </div>
        )}
        
        {/* Admin Logout */}
        {isAdminAuthenticated && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-xs text-green-600 font-medium">● Admin</span>
            <button
              onClick={handleAdminLogout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
        
        <div className="text-right">
          <div className="text-sm text-gray-600 mb-1">Overall Maturity</div>
          <div 
            className="px-4 py-2 rounded-lg font-bold text-white text-lg shadow-md"
            style={{ backgroundColor: maturity.color }}
          >
            {maturity.name} ({scores.overall})
          </div>
          <div className="text-xs text-gray-500 mt-1">{maturity.description}</div>
        </div>
      </header>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Admin Login</h3>
            <form onSubmit={handleAdminPasswordSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>
              {adminLoginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{adminLoginError}</p>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {view === 'form' && (
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Assessment Information</h2>
            <div className="grid grid-cols-3 gap-4">
              <input 
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="Organisation" 
                value={metadata.organisation} 
                onChange={e => setMetadata(s => ({ ...s, organisation: e.target.value }))} 
              />
              <input 
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="Contact person / email" 
                value={metadata.contact} 
                onChange={e => setMetadata(s => ({ ...s, contact: e.target.value }))} 
              />
              <input 
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                type="date" 
                value={metadata.date} 
                onChange={e => setMetadata(s => ({ ...s, date: e.target.value }))} 
              />
            </div>
          </section>

          {QUESTIONS.map(cat => {
            const catScore = scores.categories.find(c => c.id === cat.id)?.score || 0;
            return (
              <div key={cat.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4" style={{ borderLeftColor: getProgressColor(catScore) }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{cat.title}</h3>
                    <p className="text-gray-600 mt-1">{cat.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: getProgressColor(catScore) }}>
                      {catScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Category Score</div>
                  </div>
                </div>
                <div className="space-y-4">
                  {cat.items.map(q => (
                    <div key={q.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 text-gray-800">{q.text}</div>
                      <div className="flex gap-2 items-center">
                        {[1,2,3,4,5].map(v => (
                          <label key={v} className={`p-3 rounded-lg cursor-pointer transition-all ${
                            answers[q.id]===v 
                              ? 'ring-2 ring-orange-400 bg-orange-100 text-orange-800 font-bold' 
                              : 'hover:bg-gray-200 bg-white border border-gray-300'
                          }`}>
                            <input 
                              type="radio" 
                              name={q.id} 
                              value={v} 
                              checked={answers[q.id]===v} 
                              onChange={() => handleAnswer(q.id, v)} 
                              className="hidden" 
                            />
                            <div className="text-sm font-medium">{v}</div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex gap-4 justify-center bg-white p-6 rounded-lg shadow-sm">
            <button 
              onClick={exportToCSV} 
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              📊 Export CSV
            </button>
            <button 
              onClick={() => setView('dashboard')} 
              className="px-6 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90" 
              style={{ backgroundColor: '#ff7a00' }}
            >
              📈 View Dashboard
            </button>
            {isAdminAuthenticated && (
              <button 
                onClick={() => setView('admin')} 
                className="px-6 py-3 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors font-medium"
              >
                🔧 Admin Analytics
              </button>
            )}
            <button 
              onClick={submit} 
              className="px-6 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90" 
              style={{ backgroundColor: '#0b6b9a' }}
            >
              🚀 Submit & Generate Report
            </button>
          </div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">AI Maturity Dashboard</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold mb-4 text-gray-800">Maturity Radar Chart</h4>
                <div className="h-80">
                  <Radar data={radarData} options={radarOptions} />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold mb-4 text-gray-800">Category Scores</h4>
                <div className="h-80">
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Detailed Category Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scores.categories.map(cat => {
                const level = Math.round(cat.score) - 1;
                const maturityInfo = MATURITY_LEVELS[Math.max(0, Math.min(4, level))];
                return (
                  <div key={cat.id} className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-800">{cat.title}</h4>
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Score</span>
                        <span className="font-bold" style={{ color: maturityInfo.color }}>
                          {cat.score.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(cat.score / 5) * 100}%`,
                            backgroundColor: maturityInfo.color 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{maturityInfo.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 justify-center bg-white p-6 rounded-lg shadow-sm">
            <button 
              onClick={() => setView('form')} 
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              ← Back to Assessment
            </button>
            <button 
              onClick={exportToCSV} 
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              📊 Export Data
            </button>
          </div>
        </div>
      )}

      {view === 'result' && submitted && (
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">Assessment Complete! 🎉</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Overall Results</h4>
              <div className="text-3xl font-bold mb-2" style={{ color: maturity.color }}>
                {scores.overall} / 5.0
              </div>
              <div className="text-lg font-medium text-gray-700">{maturity.name} Level</div>
              <div className="text-sm text-gray-600 mt-1">{maturity.description}</div>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Assessment Details</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Organisation:</strong> {metadata.organisation || 'Not specified'}</div>
                <div><strong>Contact:</strong> {metadata.contact || 'Not specified'}</div>
                <div><strong>Date:</strong> {metadata.date}</div>
                <div><strong>Assessment ID:</strong> {submitted.id}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Shareable Report Link</h4>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={submitted.shareLink} 
                readOnly 
                className="flex-1 p-2 border border-blue-300 rounded bg-white text-sm"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(submitted.shareLink)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Enhanced Submission Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 border rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">📁 Data Storage</h4>
              <div className="space-y-2">
                {submissionStatus.github === 'pending' && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-600">Processing backup...</span>
                  </div>
                )}
                {submissionStatus.github === 'success' && submissionStatus.githubDetails && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600 font-medium">
                        {submissionStatus.githubDetails.storage === 'github' ? 'GitHub Repository' : 'Local Storage'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 ml-6">
                      {submissionStatus.githubDetails.message}
                    </div>
                    {submissionStatus.githubDetails.fallback && (
                      <div className="text-xs text-orange-600 ml-6">
                        ⚠️ Using fallback storage (GitHub token not configured)
                      </div>
                    )}
                  </div>
                )}
                {submissionStatus.github === 'failed' && submissionStatus.githubDetails && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-red-600 font-medium">Storage Failed</span>
                    </div>
                    <div className="text-xs text-red-600 ml-6">
                      {submissionStatus.githubDetails.message || 'Unknown error occurred'}
                    </div>
                    {submissionStatus.githubDetails.error && (
                      <div className="text-xs text-gray-500 ml-6">
                        Error: {submissionStatus.githubDetails.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">📧 Email Report</h4>
              <div className="flex items-center gap-2">
                {submissionStatus.email === 'pending' && (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-600">Sending to florian.liepe@eraneos.com...</span>
                  </>
                )}
                {submissionStatus.email === 'success' && (
                  <>
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Email sent successfully</span>
                  </>
                )}
                {submissionStatus.email === 'failed' && (
                  <>
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-600">Email sending failed</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button 
              onClick={exportToCSV} 
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              📊 Download Report (CSV)
            </button>
            <button 
              onClick={() => setView('dashboard')} 
              className="px-6 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90" 
              style={{ backgroundColor: '#ff7a00' }}
            >
              📈 View Dashboard
            </button>
            <button 
              onClick={() => setView('form')} 
              className="px-6 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90" 
              style={{ backgroundColor: '#0b6b9a' }}
            >
              🔄 New Assessment
            </button>
          </div>
        </div>
      )}

      {view === 'report' && reportData && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Maturity Assessment Report</h2>
              <p className="text-gray-600">Generated on {new Date(reportData.timestamp).toLocaleDateString()}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">Organisation</h3>
                <p className="text-lg">{reportData.metadata.organisation || 'Anonymous'}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">Overall Score</h3>
                <p className="text-3xl font-bold" style={{ color: reportData.maturity.color }}>
                  {reportData.scores.overall}/5.0
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">Maturity Level</h3>
                <p className="text-lg font-semibold" style={{ color: reportData.maturity.color }}>
                  {reportData.maturity.name}
                </p>
              </div>
            </div>
          </div>

          {/* Report Charts */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Assessment Visualization</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold mb-4 text-gray-800">Maturity Radar Chart</h4>
                <div className="h-80">
                  <Radar 
                    data={{
                      labels: reportData.scores.categories.map(c => c.title.replace(' & ', '\n& ')),
                      datasets: [
                        {
                          label: 'Current Maturity',
                          data: reportData.scores.categories.map(c => c.score),
                          backgroundColor: 'rgba(11, 107, 154, 0.15)',
                          borderColor: '#0b6b9a',
                          borderWidth: 3,
                          pointBackgroundColor: '#ff7a00',
                          pointBorderColor: '#ff7a00',
                          pointRadius: 6,
                          pointHoverRadius: 8,
                        },
                        {
                          label: 'Target (Level 4)',
                          data: new Array(6).fill(4),
                          backgroundColor: 'rgba(255, 122, 0, 0.1)',
                          borderColor: '#ff7a00',
                          borderWidth: 2,
                          borderDash: [5, 5],
                          pointBackgroundColor: 'transparent',
                          pointBorderColor: 'transparent',
                          pointRadius: 0,
                        },
                      ],
                    }}
                    options={radarOptions}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold mb-4 text-gray-800">Category Scores</h4>
                <div className="h-80">
                  <Bar 
                    data={{
                      labels: reportData.scores.categories.map(c => c.title.split(' ')[0]),
                      datasets: [
                        {
                          label: 'Current Score',
                          data: reportData.scores.categories.map(c => c.score),
                          backgroundColor: reportData.scores.categories.map(c => {
                            const level = Math.round(c.score) - 1;
                            return MATURITY_LEVELS[Math.max(0, Math.min(4, level))].color + '80';
                          }),
                          borderColor: reportData.scores.categories.map(c => {
                            const level = Math.round(c.score) - 1;
                            return MATURITY_LEVELS[Math.max(0, Math.min(4, level))].color;
                          }),
                          borderWidth: 2,
                          borderRadius: 4,
                        },
                      ],
                    }}
                    options={barOptions}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Detailed Category Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.scores.categories.map(cat => {
                const level = Math.round(cat.score) - 1;
                const maturityInfo = MATURITY_LEVELS[Math.max(0, Math.min(4, level))];
                return (
                  <div key={cat.id} className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-800">{cat.title}</h4>
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Score</span>
                        <span className="font-bold" style={{ color: maturityInfo.color }}>
                          {cat.score.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(cat.score / 5) * 100}%`,
                            backgroundColor: maturityInfo.color 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{maturityInfo.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Report Actions */}
          <div className="flex gap-4 justify-center bg-white p-6 rounded-lg shadow-sm">
            <button 
              onClick={() => {
                const csvContent = generateCSVContent(reportData);
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `eraneos-ai-scan-${reportData.metadata.organisation || 'anonymous'}-${reportData.metadata.date}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              📊 Download CSV Report
            </button>
            <button 
              onClick={() => {
                window.history.replaceState({}, '', window.location.pathname);
                setView('form');
                setReportData(null);
              }}
              className="px-6 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90" 
              style={{ backgroundColor: '#0b6b9a' }}
            >
              🔄 Take New Assessment
            </button>
          </div>

          {/* Report Footer */}
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <p className="text-sm text-gray-500">
              This report was generated by the Eraneos AI Readiness & Maturity Scan
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Assessment ID: {reportData.id} | Version: {reportData.version}
            </p>
          </div>
        </div>
      )}

      {view === 'admin' && (
        <div className="space-y-6">
          {/* Admin Header */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Assessment Analytics Dashboard</h2>
              <div className="flex gap-2">
                <button 
                  onClick={loadAllAssessments}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '🔄 Loading...' : '🔄 Refresh Data'}
                </button>
                <button 
                  onClick={() => setView('form')}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  ← Back to Assessment
                </button>
              </div>
            </div>

            {/* Analytics Overview */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Total Assessments</h3>
                  <p className="text-2xl font-bold text-blue-900">{analytics.totalAssessments}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800">Average Score</h3>
                  <p className="text-2xl font-bold text-green-900">{analytics.averageScore}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-semibold text-orange-800">Recent (30 days)</h3>
                  <p className="text-2xl font-bold text-orange-900">{analytics.recentAssessments}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold text-purple-800">GitHub Integration</h3>
                  <p className="text-sm font-bold text-purple-900">
                    {githubService.isAvailable() ? '✅ Active' : '❌ Not Configured'}
                  </p>
                </div>
              </div>
            )}

            {/* Maturity Distribution Chart */}
            {analytics && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Maturity Level Distribution</h3>
                <div className="h-64">
                  <Bar 
                    data={{
                      labels: Object.keys(analytics.maturityDistribution),
                      datasets: [{
                        label: 'Number of Assessments',
                        data: Object.values(analytics.maturityDistribution),
                        backgroundColor: MATURITY_LEVELS.map(level => level.color + '80'),
                        borderColor: MATURITY_LEVELS.map(level => level.color),
                        borderWidth: 2,
                        borderRadius: 4,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { stepSize: 1 }
                        }
                      },
                      plugins: {
                        legend: { display: false }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Filter Assessments</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <input
                type="date"
                placeholder="From Date"
                value={filters.dateFrom}
                onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="To Date"
                value={filters.dateTo}
                onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Organisation"
                value={filters.organisation}
                onChange={e => setFilters(prev => ({ ...prev, organisation: e.target.value }))}
                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filters.maturityLevel}
                onChange={e => setFilters(prev => ({ ...prev, maturityLevel: e.target.value }))}
                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Maturity Levels</option>
                {MATURITY_LEVELS.map(level => (
                  <option key={level.name} value={level.name}>{level.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Min Score"
                step="0.1"
                min="1"
                max="5"
                value={filters.scoreMin}
                onChange={e => setFilters(prev => ({ ...prev, scoreMin: e.target.value }))}
                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Max Score"
                step="0.1"
                min="1"
                max="5"
                value={filters.scoreMax}
                onChange={e => setFilters(prev => ({ ...prev, scoreMax: e.target.value }))}
                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setFilters({
                  dateFrom: '', dateTo: '', organisation: '', 
                  maturityLevel: '', scoreMin: '', scoreMax: ''
                })}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Showing {filteredAssessments.length} of {allAssessments.length} assessments
              </span>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Bulk Actions</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAssessments(
                    selectedAssessments.length === filteredAssessments.length 
                      ? [] 
                      : filteredAssessments.map(a => a.id)
                  )}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
                >
                  {selectedAssessments.length === filteredAssessments.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={() => handleBulkExport('csv')}
                  disabled={selectedAssessments.length === 0 || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                >
                  📊 Export CSV ({selectedAssessments.length})
                </button>
                <button
                  onClick={() => handleBulkExport('json')}
                  disabled={selectedAssessments.length === 0 || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                >
                  📄 Export JSON ({selectedAssessments.length})
                </button>
              </div>
            </div>
          </div>

          {/* Assessment List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedAssessments.length === filteredAssessments.length && filteredAssessments.length > 0}
                        onChange={() => setSelectedAssessments(
                          selectedAssessments.length === filteredAssessments.length 
                            ? [] 
                            : filteredAssessments.map(a => a.id)
                        )}
                        className="rounded"
                      />
                    </th>
                    <th className="p-4 text-left font-semibold text-gray-800">Organisation</th>
                    <th className="p-4 text-left font-semibold text-gray-800">Contact</th>
                    <th className="p-4 text-left font-semibold text-gray-800">Date</th>
                    <th className="p-4 text-left font-semibold text-gray-800">Score</th>
                    <th className="p-4 text-left font-semibold text-gray-800">Maturity</th>
                    <th className="p-4 text-left font-semibold text-gray-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map((assessment, index) => {
                    const maturityColor = MATURITY_LEVELS.find(l => l.name === assessment.maturityLevel)?.color || '#6b7280';
                    return (
                      <tr key={assessment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedAssessments.includes(assessment.id)}
                            onChange={() => setSelectedAssessments(prev => 
                              prev.includes(assessment.id)
                                ? prev.filter(id => id !== assessment.id)
                                : [...prev, assessment.id]
                            )}
                            className="rounded"
                          />
                        </td>
                        <td className="p-4 font-medium text-gray-900">{assessment.organisation}</td>
                        <td className="p-4 text-gray-600">{assessment.contact || 'N/A'}</td>
                        <td className="p-4 text-gray-600">{new Date(assessment.date).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className="font-bold" style={{ color: maturityColor }}>
                            {assessment.overallScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span 
                            className="px-2 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: maturityColor }}
                          >
                            {assessment.maturityLevel}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const result = await githubService.getAssessment(assessment.filePath);
                                if (result.success) {
                                  setReportData(result.data);
                                  setView('report');
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                            >
                              View Report
                            </button>
                            <button
                              onClick={() => handleDeleteAssessment(assessment)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                              title="Delete Assessment"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredAssessments.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-500">
                {allAssessments.length === 0 
                  ? 'No assessments found. Click "Refresh Data" to load from GitHub.'
                  : 'No assessments match the current filters.'
                }
              </div>
            )}
            
            {loading && (
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Loading assessments from GitHub...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
