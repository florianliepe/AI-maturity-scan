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
 import GitHubService from './GitHubServiceRobust';

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
    const correctPassword = process.env.REACT_APP_ADMIN_PASSWORD || 'eraneos2024';
    
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
        
        {/* Enhanced Admin Login Button */}
        {!isAdminAuthenticated && (
          <div className="absolute top-4 right-4">
            <button
              onClick={handleAdminLogin}
              className="group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-all duration-200 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 hover:shadow-sm"
              title="Admin Access"
            >
              <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        )}
        
        {/* Enhanced Admin Status & Logout */}
        {isAdminAuthenticated && (
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">Admin Mode</span>
            </div>
            <button
              onClick={handleAdminLogout}
              className="group inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-all duration-200 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 hover:shadow-sm"
              title="Logout"
            >
              <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
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

      {/* Enhanced Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Admin Access</h3>
                <p className="text-sm text-gray-500">Enter your credentials to continue</p>
              </div>
            </div>
            
            <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter admin password"
                    autoFocus
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              
              {adminLoginError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinec
