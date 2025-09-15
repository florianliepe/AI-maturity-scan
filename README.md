# Eraneos AI Readiness & Maturity Scan

A comprehensive AI maturity assessment tool tailored for HR in Retail, built with React and featuring interactive dashboards, Excel export, and SharePoint integration.

## Features

- **7 Dimension Assessment**: Strategic Relevance, Willingness to Invest, Implementation Effects, Organizational Structure & Employee Capabilities, Governance, IT-Infrastructure and Data, and Partnerships
- **HR in Retail Focus**: Questions specifically tailored for human resources challenges in retail environments
- **Interactive Dashboard**: Radar charts and bar charts for visual assessment results
- **Excel Export**: Comprehensive Excel reports with summary and detailed responses
- **SharePoint Integration**: Direct upload to SharePoint document library
- **Email Integration**: Automatic email delivery to specified recipients
- **Eraneos Branding**: Professional interface with Eraneos brand colors and styling

## Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

### Assessment Process

1. **Organization Information**: Enter your organization details, contact information, and assessment date
2. **Complete Assessment**: Answer questions across all 7 dimensions using the 1-5 Likert scale
3. **View Results**: Review your maturity scores and overall assessment
4. **Export/Share**: Download Excel reports, save to SharePoint, or email results

### Scoring System

- **Scale**: 1-5 Likert scale (1 = Strongly Disagree, 5 = Strongly Agree)
- **Calculation**: Simple averaging across all questions within each dimension
- **Maturity Levels**:
  - **Initial** (1.0-1.9): Ad-hoc AI activities with limited coordination
  - **Developing** (2.0-2.9): Some AI initiatives with basic structure
  - **Defined** (3.0-3.9): Established AI processes and clear governance
  - **Managed** (4.0-4.9): Systematic AI implementation with measurement
  - **Optimized** (5.0): Continuous AI optimization and innovation

## Assessment Dimensions

### 1. Strategic Relevance
AI strategy and importance for HR operations in retail (recruitment, workforce planning, performance management).

### 2. Willingness to Invest
Financial commitment and resource allocation for AI initiatives in HR and retail operations.

### 3. Implementation Effects
Practical deployment and measurable outcomes of AI in HR processes and retail workforce management.

### 4. Organizational Structure & Employee Capabilities
AI competencies, training, and organizational readiness within HR teams and retail operations.

### 5. Governance
Compliance, risk management, and regulatory adherence for AI in HR processes (EU AI Act, GDPR, hiring fairness).

### 6. IT-Infrastructure and Data
Technical readiness, data quality, and system integration for AI in HR and retail operations.

### 7. Partnerships
External collaborations and vendor relationships for AI implementation in HR and retail technology.

## Backend Integration

The application includes placeholder functions for backend integration:

### SharePoint Integration
- **Endpoint**: `POST /api/sharepoint`
- **Target**: `https://eraneos.sharepoint.com/.../AI_readiness_and_maturity_scan`
- **Function**: Uploads Excel reports to designated SharePoint folder

### Email Integration
- **Endpoint**: `POST /api/send-email`
- **Recipient**: `florian.liepe@eraneos.com`
- **Function**: Sends Excel reports via email with assessment results

### Data Storage
- **Endpoint**: `POST /api/submit`
- **Function**: Stores assessment data and generates shareable links

## File Structure

```
├── public/
│   └── index.html          # HTML template with Tailwind CSS
├── src/
│   ├── index.js           # React entry point
│   └── EraneosAIMaturityScan.js  # Main application component
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Dependencies

- **React 18**: Frontend framework
- **Recharts**: Chart visualization library
- **XLSX**: Excel file generation
- **File-saver**: Client-side file downloads
- **UUID**: Unique identifier generation
- **Axios**: HTTP client for API calls
- **Tailwind CSS**: Utility-first CSS framework

## Customization

### Branding
Update the `ERANEOS_COLORS` object in `EraneosAIMaturityScan.js`:
```javascript
const ERANEOS_COLORS = {
  brand: '#0b6b9a',    // Primary brand color
  accent: '#ff7a00'    // Accent color
};
```

### Questions
Modify the `QUESTIONS` array to add, remove, or update assessment questions for different industries or focus areas.

### Maturity Levels
Adjust the `MATURITY_LEVELS` array to customize scoring thresholds and descriptions.

## Deployment

### Local Development
```bash
npm start
```

### Production Build
```bash
npm run build
```

### Hosting Options
- **Static Hosting**: Deploy the build folder to services like Netlify, Vercel, or AWS S3
- **Traditional Hosting**: Upload to any web server that can serve static files
- **Enterprise**: Deploy to internal company infrastructure

## Support

For technical support or questions about the AI Readiness & Maturity Scan, please contact the development team or refer to the Eraneos internal documentation.

## License

This tool is proprietary to Eraneos and intended for internal use and client assessments.
