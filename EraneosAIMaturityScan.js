import React, { useState, useMemo } from 'react';
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
// Eraneos brand colors
const ERANEOS_COLORS = {
  brand: '#0b6b9a',
  accent: '#ff7a00'
};

// 7 Dimensions with HR in Retail focused questions
const QUESTIONS = [
  {
    id: 'strategic',
    title: 'Strategic Relevance',
    description: 'AI strategy and importance for HR operations in retail (recruitment, workforce planning, performance management).',
    items: [
      { id: 's1', text: 'Our corporate strategy includes AI as a central component for HR functions (hiring, scheduling, performance)' },
      { id: 's2', text: 'We have developed a specific AI strategy for HR operations in retail (candidate screening, workforce forecasting)' },
      { id: 's3', text: 'AI is considered essential for our future HR competitiveness in retail talent management' },
      { id: 's4', text: 'We regularly use AI in HR decision-making processes (hiring decisions, shift planning, performance reviews)' },
      { id: 's5', text: 'Our organization actively pursues coordinated AI activities across HR functions' }
    ]
  },
  {
    id: 'investment',
    title: 'Willingness to Invest',
    description: 'Financial commitment and resource allocation for AI initiatives in HR and retail operations.',
    items: [
      { id: 'i1', text: 'We allocate significant budget for AI investments in HR technology (ATS, HRIS, scheduling tools) in the short term (12 months)' },
      { id: 'i2', text: 'We plan substantial long-term investment (13-36 months) in AI for workforce management and retail operations' },
      { id: 'i3', text: 'AI projects in HR are financed centrally with clear budget allocation and governance' },
      { id: 'i4', text: 'We have dedicated funding for AI training and development programs for HR staff and store managers' },
      { id: 'i5', text: 'Investment decisions for HR AI tools consider ROI in terms of reduced time-to-hire and improved retention' }
    ]
  },
  {
    id: 'implementation',
    title: 'Implementation Effects',
    description: 'Practical deployment and measurable outcomes of AI in HR processes and retail workforce management.',
    items: [
      { id: 'im1', text: 'We implement AI use cases centrally across multiple HR areas (recruitment, scheduling, performance management)' },
      { id: 'im2', text: 'We have successfully deployed AI for candidate screening, workforce forecasting, or shift optimization' },
      { id: 'im3', text: 'We systematically measure the effectiveness of AI implementations in HR (time-to-hire, employee satisfaction, cost savings)' },
      { id: 'im4', text: 'AI consistently delivers positive effects in our HR operations (cost reduction, improved productivity, better employee experience)' },
      { id: 'im5', text: 'We have concrete plans to implement additional AI use cases in HR within the next two years' }
    ]
  },
  {
    id: 'organizational',
    title: 'Organizational Structure & Employee Capabilities',
    description: 'AI competencies, training, and organizational readiness within HR teams and retail operations.',
    items: [
      { id: 'o1', text: 'We identify AI use cases for HR through a formal, centrally coordinated process' },
      { id: 'o2', text: 'AI responsibilities are formally defined and embedded in our HR organizational structure' },
      { id: 'o3', text: 'We have structured formats for sharing AI knowledge and experiences among HR staff and store managers' },
      { id: 'o4', text: 'Our HR team and store managers have practical AI expertise relevant to retail workforce management' },
      { id: 'o5', text: 'We provide comprehensive AI training programs for all HR employees and retail management staff' }
    ]
  },
  {
    id: 'governance',
    title: 'Governance',
    description: 'Compliance, risk management, and regulatory adherence for AI in HR processes (EU AI Act, GDPR, hiring fairness).',
    items: [
      { id: 'g1', text: 'We have fully integrated EU AI Act requirements into our HR AI processes and compliance procedures' },
      { id: 'g2', text: 'Roles and responsibilities for AI compliance, data protection, and information security are established for HR data' },
      { id: 'g3', text: 'We have implemented bias detection and fairness evaluation processes for AI-driven hiring and performance decisions' },
      { id: 'g4', text: 'GDPR compliance, consent management, and data processing records are maintained for all HR AI applications' },
      { id: 'g5', text: 'We have established audit trails, explainability, and appeals processes for automated HR decisions' }
    ]
  },
  {
    id: 'infrastructure',
    title: 'IT-Infrastructure and Data',
    description: 'Technical readiness, data quality, and system integration for AI in HR and retail operations.',
    items: [
      { id: 'it1', text: 'Our IT infrastructure is very well suited for implementing AI solutions in HR (cloud-ready, scalable, secure)' },
      { id: 'it2', text: 'Our HR data situation (HRIS, ATS, performance data, scheduling data) is of very good quality and availability' },
      { id: 'it3', text: 'We have implemented organization-wide data governance strategy with measures to improve data quality' },
      { id: 'it4', text: 'Our HR systems are well integrated with retail operational data (POS, inventory, customer data) for workforce planning' },
      { id: 'it5', text: 'We have secure, versioned platforms for AI experimentation and deployment in HR use cases' }
    ]
  },
  {
    id: 'partnerships',
    title: 'Partnerships',
    description: 'External collaborations and vendor relationships for AI implementation in HR and retail technology.',
    items: [
      { id: 'p1', text: 'We are integral part of an AI ecosystem including HR technology providers, consulting firms, and universities' },
      { id: 'p2', text: 'We have established criteria for selecting AI partners specifically for HR and retail workforce solutions' },
      { id: 'p3', text: 'We regularly collaborate with HR technology vendors on AI topics (ATS providers, workforce management solutions)' },
      { id: 'p4', text: 'We engage with external AI experts and consultants for HR-specific use cases and implementations' },
      { id: 'p5', text: 'Our AI partnerships include knowledge sharing and best practice exchange for retail HR challenges' }
    ]
  }
];

const MATURITY_LEVELS = [
  { level: 1, name: 'Initial', description: 'Ad-hoc AI activities with limited coordination' },
  { level: 2, name: 'Developing', description: 'Some AI initiatives with basic structure' },
  { level: 3, name: 'Defined', description: 'Established AI processes and clear governance' },
  { level: 4, name: 'Managed', description: 'Systematic AI implementation with measurement' },
  { level: 5, name: 'Optimized', description: 'Continuous AI optimization and innovation' }
];

export default function EraneosAIMaturityScan() {
  const initialAnswers = useMemo(() => {
    const map = {};
    QUESTIONS.forEach(cat => cat.items.forEach(q => (map[q.id] = 3)));
    return map;
  }, []);

  const [answers, setAnswers] = useState(initialAnswers);
  const [metadata, setMetadata] = useState({ 
    organisation: '', 
    contact: '', 
    date: new Date().toISOString().slice(0,10),
    department: 'HR Department',
    role: 'HR in Retail'
  });
  const [submitted, setSubmitted] = useState(null);
  const [view, setView] = useState('form'); // form | dashboard | result

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
  const maturity = MATURITY_LEVELS[Math.max(0, Math.min(4, Math.round(scores.overall) - 1))] || MATURITY_LEVELS[0];

  const exportToExcel = () => {
    // Generate CSV data for lean approach
    const csvData = [];
    csvData.push(['Category', 'Value']);
    csvData.push(['Organisation', metadata.organisation]);
    csvData.push(['Contact', metadata.contact]);
    csvData.push(['Date', metadata.date]);
    csvData.push(['Overall Score', scores.overall]);
    csvData.push(['Maturity Level', maturity.name]);
    csvData.push(['']);
    
    scores.categories.forEach(cat => {
      csvData.push([cat.title, cat.score]);
    });
    
    csvData.push(['']);
    csvData.push(['Dimension', 'Question', 'Answer', 'Answer Text']);
    
    QUESTIONS.forEach(cat => {
      cat.items.forEach(q => {
        csvData.push([cat.title, q.text, answers[q.id], getAnswerText(answers[q.id])]);
      });
    });
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `eraneos-ai-maturity-scan-${metadata.organisation || 'anonymous'}-${metadata.date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAnswerText = (value) => {
    const texts = {
      1: 'Strongly Disagree',
      2: 'Disagree', 
      3: 'Neutral',
      4: 'Agree',
      5: 'Strongly Agree'
    };
    return texts[value] || 'Not answered';
  };

  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const submit = async () => {
    const id = generateId();
    const payload = { id, metadata, answers, scores, timestamp: new Date().toISOString() };
    
    try {
      setSubmitted({ id, payload });
      // For static hosting, we'll just create a local share link
      setSubmitted({ id, payload, shareLink: `${window.location.origin}#scan=${id}` });
      setView('result');
    } catch (err) {
      setSubmitted({ id, payload, shareLink: `${window.location.origin}#scan=${id}` });
      setView('result');
    }
  };

  const saveToSharePoint = async () => {
    try {
      const resp = await fetch('/api/sharepoint', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ metadata, answers, scores, id: submitted?.id }) 
      });
      const j = await resp.json();
      alert('Successfully saved to SharePoint: ' + (j.path || 'AI_readiness_and_maturity_scan folder'));
    } catch (e) { 
      alert('SharePoint save failed: ' + e.message + '. Please use the Excel export as fallback.'); 
    }
  };

  const sendExcelToFlorian = async () => {
    // Generate CSV data for email
    const csvData = [];
    csvData.push(['Category', 'Value']);
    csvData.push(['Organisation', metadata.organisation]);
    csvData.push(['Contact', metadata.contact]);
    csvData.push(['Date', metadata.date]);
    csvData.push(['Overall Score', scores.overall]);
    csvData.push(['Maturity Level', maturity.name]);
    csvData.push(['']);
    
    scores.categories.forEach(cat => {
      csvData.push([cat.title, cat.score]);
    });
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    try {
      const form = new FormData();
      form.append('file', blob, `eraneos-ai-maturity-scan-${metadata.organisation || 'anonymous'}.csv`);
      form.append('to', 'florian.liepe@eraneos.com');
      form.append('subject', `AI Maturity Scan Results - ${metadata.organisation}`);
      
      const resp = await fetch('/api/send-email', { method: 'POST', body: form });
      if (resp.ok) {
        alert('Email successfully sent to florian.liepe@eraneos.com');
      } else {
        alert('Email send failed. Please use the CSV export and send manually.');
      }
    } catch (e) { 
      alert('Email send error: ' + e.message + '. Please use the CSV export and send manually.'); 
    }
  };

  const dashboardData = scores.categories.map(c => ({ 
    name: c.title.replace(' & ', ' &\n'), 
    score: Math.round(c.score * 10) / 10,
    fullName: c.title
  }));

  const EraneosLogo = () => (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" 
           style={{ backgroundColor: ERANEOS_COLORS.brand }}>
        E
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">eraneos</h1>
        <p className="text-sm text-gray-600">AI Readiness & Maturity Scan</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <EraneosLogo />
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Current Maturity Level</div>
              <div className="px-4 py-2 rounded-lg font-semibold text-white text-lg" 
                   style={{ backgroundColor: ERANEOS_COLORS.accent }}>
                {maturity?.name} ({scores.overall}/5.0)
              </div>
              <div className="text-xs text-gray-500 mt-1">Tailored for HR in Retail</div>
            </div>
          </div>
        </header>

        {view === 'form' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Organization Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Organization Name" 
                  value={metadata.organisation} 
                  onChange={e => setMetadata(s => ({ ...s, organisation: e.target.value }))} 
                />
                <input 
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Contact Person / Email" 
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
            </div>

            {QUESTIONS.map(cat => (
              <div key={cat.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{cat.title}</h3>
                  <p className="text-gray-600 text-sm">{cat.description}</p>
                </div>
                <div className="space-y-4">
                  {cat.items.map(q => (
                    <div key={q.id} className="border-l-4 border-gray-200 pl-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex-1 text-gray-700">{q.text}</div>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-gray-500 mr-2">Disagree</span>
                          {[1,2,3,4,5].map(v => (
                            <label key={v} className={`p-3 rounded-lg cursor-pointer transition-all ${
                              answers[q.id] === v 
                                ? 'ring-2 ring-offset-2 text-white' 
                                : 'hover:bg-gray-100 border border-gray-300'
                            }`} style={{
                              backgroundColor: answers[q.id] === v ? ERANEOS_COLORS.accent : 'white',
                              borderColor: answers[q.id] === v ? ERANEOS_COLORS.accent : '#d1d5db'
                            }}>
                              <input 
                                type="radio" 
                                name={q.id} 
                                value={v} 
                                checked={answers[q.id] === v} 
                                onChange={() => handleAnswer(q.id, v)} 
                                className="hidden" 
                              />
                              <div className="text-sm font-medium">{v}</div>
                            </label>
                          ))}
                          <span className="text-xs text-gray-500 ml-2">Agree</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={exportToExcel} 
                  className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  📊 Export to Excel
                </button>
                <button 
                  onClick={submit} 
                  className="px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity" 
                  style={{ backgroundColor: ERANEOS_COLORS.brand }}
                >
                  📋 Submit & Generate Report
                </button>
                <button 
                  onClick={() => setView('dashboard')} 
                  className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  📈 View Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">AI Maturity Dashboard</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-96">
                  <h4 className="font-semibold mb-4 text-center">Maturity Radar Chart</h4>
                  <ResponsiveContainer width="100%" height="85%">
                    <RadarChart cx="50%" cy="50%" outerRadius={120} data={dashboardData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <Radar 
                        name="Score" 
                        dataKey="score" 
                        stroke={ERANEOS_COLORS.brand} 
                        fill={ERANEOS_COLORS.brand} 
                        fillOpacity={0.3} 
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-96">
                  <h4 className="font-semibold mb-4 text-center">Dimension Scores</h4>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={dashboardData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis domain={[0, 5]} />
                      <Tooltip 
                        formatter={(value, name, props) => [value, 'Score']}
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload;
                          return item?.fullName || label;
                        }}
                      />
                      <Bar dataKey="score" fill={ERANEOS_COLORS.accent} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Maturity Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold" style={{ color: ERANEOS_COLORS.brand }}>
                    {scores.overall}
                  </div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold" style={{ color: ERANEOS_COLORS.accent }}>
                    {maturity.name}
                  </div>
                  <div className="text-sm text-gray-600">Maturity Level</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {scores.categories.filter(c => c.score >= 4).length}
                  </div>
                  <div className="text-sm text-gray-600">Strong Areas</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {scores.categories.filter(c => c.score < 3).length}
                  </div>
                  <div className="text-sm text-gray-600">Improvement Areas</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setView('form')} 
                  className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  ← Back to Assessment
                </button>
                <button 
                  onClick={exportToExcel} 
                  className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  📊 Export Results
                </button>
                <button 
                  onClick={submit} 
                  className="px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity" 
                  style={{ backgroundColor: ERANEOS_COLORS.brand }}
                >
                  📋 Generate Report
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'result' && submitted && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Assessment Complete</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">Your AI Maturity Results</h3>
              <p className="text-green-700">
                Overall Score: <strong>{scores.overall}/5.0</strong> — 
                Maturity Level: <strong>{maturity?.name}</strong>
              </p>
              <p className="text-sm text-green-600 mt-1">{maturity?.description}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">Shareable Report Link</h4>
              <a 
                className="text-blue-600 underline break-all" 
                href={submitted.shareLink} 
                target="_blank" 
                rel="noreferrer"
              >
                {submitted.shareLink}
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {scores.categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{cat.title}</span>
                  <span className="font-bold" style={{ color: ERANEOS_COLORS.brand }}>
                    {cat.score}/5.0
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={saveToSharePoint} 
                className="px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity" 
                style={{ backgroundColor: ERANEOS_COLORS.brand }}
              >
                💾 Save to SharePoint
              </button>
              <button 
                onClick={sendExcelToFlorian} 
                className="px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity" 
                style={{ backgroundColor: ERANEOS_COLORS.accent }}
              >
                📧 Email to Florian Liepe
              </button>
              <button 
                onClick={() => { exportToExcel(); alert('Excel file downloaded as backup'); }} 
                className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                📊 Download Excel Backup
              </button>
              <button 
                onClick={() => setView('dashboard')} 
                className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                📈 View Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

