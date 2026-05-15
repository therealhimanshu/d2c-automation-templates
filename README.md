# D2C Automation Templates

A comprehensive collection of automation scripts and templates for Direct-to-Consumer (D2C) businesses. This repository provides ready-to-use solutions for Shopify integrations, Google Analytics 4 automation, email data synchronization, and webhook handling using Google Apps Script and JavaScript.

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Project Structure](#️-project-structure)
3. [Features](#-features)
4. [Requirements](#-requirements)
5. [Installation & Setup](#-installation--setup)
6. [Usage Guide](#-usage-guide)
   - [GA4 Automation](#ga4-automation)
   - [Email to Sheets Automation](#email-to-sheets-automation)
   - [Shopify Scripts](#shopify-scripts)
   - [Webhook Handling](#webhook-handling)
7. [Configuration](#️-configuration)
8. [Scheduling](#-scheduling)
9. [Common Use Cases](#-common-use-cases)
10. [Troubleshooting](#️-troubleshooting)
11. [Code Comments](#-code-comments)
12. [Best Practices](#-best-practices)
13. [Contributing](#-contributing)
14. [License](#-license)
15. [Support & Issues](#-support--issues)
16. [Roadmap](#-roadmap)
17. [Related Resources](#-related-resources)

---

## 📋 Overview

Designed for D2C businesses looking to automate their operations, this collection includes:
- **Shopify Scripts** - E-commerce automation and data management
- **GA4 Automation** - Google Analytics 4 reporting and data export
- **Email to Sheets Automation** - Scheduled report data extraction
- **Webhook Management** - Real-time event processing
- **API-less Automation** - Solutions for platforms without direct API access

---

## 🗂️ Project Structure

```
d2c-automation-templates/
├── README.md
├── shopify-scripts/
│   ├── design-velocity-automation/
│   │   ├── new-product-orders.js
│   │   └── new-products-to-sheets.js
│   └── collection-create/
│       └── collection-create.js
├── ga4-automation/
│   └── sessions-and-product-views.js
├── automation-for-apps-without-api/
│   ├── scheduled-report-to-sheets.js
│   └── [Other email automation scripts]
├── webhooks/
│   └── [Webhook handler templates]
└── scheduled-report-to-sheets.js (legacy)
```

---

## ✨ Features

### 🛍️ Shopify Automation
- Automate new product order handling
- Sync product data directly to Google Sheets
- Create and manage collections programmatically
- Real-time Shopify event processing

### 📊 GA4 Integration
- Extract Google Analytics 4 data automatically
- Generate scheduled analytics reports
- Sync sessions and product view metrics
- Service account authentication support

### 📧 Email Data Extraction
- Parse scheduled report emails from tools like GoKwik
- Automatically extract and process CSV attachments
- Store data in Google Sheets with automatic formatting
- Support for multiple email templates

### 🔗 Webhook Handling
- Process real-time webhooks from various platforms
- Event validation and authentication
- Extensible webhook handler architecture

### 🤖 API-less Automation
- Solutions for platforms without public APIs
- Email-based data extraction
- Custom parsing and transformation logic

---

## 📦 Requirements

- **Google Account** - For Google Apps Script and Sheets
- **Google Apps Script** - For running the automation scripts
- **API Credentials** (where applicable):
  - Shopify API access for Shopify scripts
  - Google Analytics Service Account for GA4 automation
  - Gmail API access (handled by Google Apps Script)

### Tech Stack
- **JavaScript** (100%) - All scripts written in JavaScript/Google Apps Script
- **Google Apps Script** - Serverless execution environment
- **Google Sheets API** - Data storage and retrieval
- **Gmail API** - Email parsing and processing
- **Shopify API** - E-commerce operations

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/therealhimanshu/d2c-automation-templates.git
cd d2c-automation-templates
```

### 2. Access Google Apps Script

1. Open [Google Apps Script](https://script.google.com)
2. Create a new project or open an existing one
3. Select the script file you want to use

### 3. Copy Script Files

For each automation you want to use:
1. Copy the contents of the `.js` file
2. Paste into a new `.gs` file in Google Apps Script
3. Update configuration variables (API keys, sheet names, etc.)
4. Save the project

### 4. Configure Scripts

Each script has a `CONFIG` object at the top. Update these values:
- Sheet names
- Email search queries
- API keys and credentials
- Webhook endpoints

---

## 📖 Usage Guide

### GA4 Automation

**File:** `ga4-automation/sessions-and-product-views.js`

**Prerequisites:**
- Google Analytics Data API enabled
- Service account created with access to GA4 property
- Service account added as Admin to your GA4 property

```javascript
// Configure your GA4 property ID and date ranges
// The script will automatically fetch and store session/product view data
```

**Features:**
- Automated GA4 data extraction
- Session and product view metrics
- Scheduled report generation
- Google Sheets integration

---

### Email to Sheets Automation

**File:** `automation-for-apps-without-api/scheduled-report-to-sheets.js`

Extracts scheduled report emails and syncs data to Google Sheets.

**Configuration:**
```javascript
const CONFIG = {
  SHEET_NAME: 'GoKwik_Data',  // Target sheet name
  GMAIL_SEARCH_QUERY: 'from:no-reply@gokwik.co subject:"Gokwik Checkout Analytics Funnel Report"',
  SKIP_HEADER_ON_APPEND: true  // Skip CSV header on append
};
```

**How it works:**
1. Searches Gmail for scheduled report emails
2. Extracts CSV download links from email body
3. Downloads and parses CSV data
4. Appends data to specified Google Sheet
5. Automatically formats and updates data

**Setup Steps:**
1. Create a Google Sheet with appropriate headers
2. Copy script to Google Apps Script
3. Update `CONFIG` with your email query and sheet name
4. Set up time-based trigger for automatic runs
5. Run `runGokwikToSheets()` function

---

### Shopify Scripts

#### Design Velocity Automation

**Files:**
- `new-product-orders.js` - Handles new product order automation
- `new-products-to-sheets.js` - Syncs new products to Google Sheets

**Setup:**
1. Generate Shopify API credentials
2. Add API scopes for product and order access
3. Update config with API key and password
4. Create Google Sheet for product data
5. Run the script or set up automatic triggers

#### Collection Create

**File:** `collection-create.js`

Creates Shopify collections from a master SKU list in Google Sheets.

**Features:**
- Bulk collection creation
- Custom collection rules
- Product grouping from sheet data
- Error handling and logging

---

### Webhook Handling

**Directory:** `webhooks/`

Real-time webhook processors for various platforms.

**Setup:**
1. Deploy script as web app
2. Get deployment URL
3. Configure webhook URL in source platform
4. Handle incoming events with custom logic

---

## ⚙️ Configuration

Each script has a `CONFIG` object that controls its behavior:

```javascript
const CONFIG = {
  SHEET_NAME: 'Sheet Name',           // Target Google Sheet
  GMAIL_SEARCH_QUERY: 'search query',  // Gmail search parameters
  SKIP_HEADER_ON_APPEND: true,        // CSV header handling
  API_KEY: 'your-api-key',            // API credentials
  // Additional config based on script
};
```

### Common Configuration Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `SHEET_NAME` | Google Sheet name | `'GoKwik_Data'` |
| `GMAIL_SEARCH_QUERY` | Gmail search filter | `'from:no-reply@gokwik.co'` |
| `SKIP_HEADER_ON_APPEND` | Skip CSV header on data append | `true` |
| `API_KEY` | Authentication credential | `'abc123xyz'` |
| `SHOPIFY_STORE` | Shopify store URL | `'mystore.myshopify.com'` |

---

## 🔄 Scheduling

### Using Google Apps Script Triggers

1. Open Google Apps Script editor
2. Click "Triggers" (clock icon)
3. Create a new trigger:
   - Function: Select your automation function
   - Deployment: Head
   - Event source: Time-driven
   - Type: Choose frequency (daily, hourly, etc.)
   - Time of day: Select preferred time

### Example Trigger Setup

- **Email to Sheets**: Daily at 8:00 AM
- **GA4 Export**: Every 6 hours
- **Shopify Sync**: Every hour
- **Webhook Handler**: On-demand or continuous

---

## 📊 Common Use Cases

### 1. Abandoned Cart Email Reports to Sheets
```javascript
// Extract GoKwik abandoned cart reports
const CONFIG = {
  SHEET_NAME: 'GoKwik_Abandoned_Summary',
  QUERY: 'from:no-reply@gokwik.co subject:"Gokwik Abandoned Carts Report"'
};
```

### 2. Daily GA4 Analytics Export
```javascript
// Automatically export GA4 metrics daily
// Tracks sessions, product views, and user engagement
```

### 3. Shopify New Product Sync
```javascript
// Push newly added products to Google Sheets
// Update inventory and product information
```

### 4. Scheduled Report Aggregation
```javascript
// Combine multiple scheduled reports
// Create unified analytics dashboard
```

---

## 🛠️ Troubleshooting

### Script Execution Issues

| Problem | Solution |
|---------|----------|
| "Gmail API error" | Enable Gmail API in Google Cloud Console |
| "Sheets not found" | Verify sheet name in CONFIG matches exactly |
| "Authorization error" | Re-run script to grant permissions |
| "No data appended" | Check email search query returns results |
| "Timeout error" | Break large operations into smaller chunks |

### Email Parsing Issues

- **Email not found**: Verify Gmail search query is correct
- **CSV link not extracted**: Check email format matches expected pattern
- **Data not appending**: Ensure sheet has correct headers and formatting

### Shopify Integration Issues

- **API errors**: Verify API credentials and scopes
- **Product not synced**: Check Shopify API permissions
- **Collection not created**: Validate SKU data in source sheet

---

## 📝 Code Comments

Each script file includes detailed comments explaining:
- Configuration requirements
- Function purposes
- Data transformation logic
- Error handling
- Setup instructions

Review comments within each script for implementation-specific details.

---

## 💡 Best Practices

### Security
- ✅ Never hardcode sensitive credentials in scripts
- ✅ Use Google Apps Script Properties Service for sensitive data
- ✅ Review API permissions before granting access
- ✅ Regularly audit webhook access logs

### Performance
- ✅ Batch operations when possible
- ✅ Use appropriate trigger intervals
- ✅ Monitor script execution time
- ✅ Optimize regex patterns for large datasets

### Maintenance
- ✅ Keep scripts organized and commented
- ✅ Update CONFIG objects for easy management
- ✅ Test scripts after Gmail/API changes
- ✅ Version control all modifications

### Data Management
- ✅ Archive old data periodically
- ✅ Use consistent date formats
- ✅ Validate data before appending
- ✅ Maintain data integrity checks

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-automation`)
3. Make your changes with clear commit messages
4. Test thoroughly with your configuration
5. Submit a pull request with description

### Areas for Contribution
- New platform integrations
- Enhanced error handling
- Performance optimizations
- Additional email templates
- Webhook handler examples
- Documentation improvements

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 📧 Support & Issues

For questions, bugs, or feature requests:
- Open a [GitHub Issue](https://github.com/therealhimanshu/d2c-automation-templates/issues)
- Check existing issues for solutions
- Include script name and error messages in reports

---

## 🎯 Roadmap

- [ ] TypeScript support for better type checking
- [ ] Enhanced error logging and monitoring
- [ ] Pre-built webhook handlers for popular platforms
- [ ] CLI tool for script management
- [ ] Webhook testing dashboard
- [ ] Integration with more D2C platforms (WooCommerce, BigCommerce)
- [ ] Advanced data transformation templates
- [ ] Cost estimation and optimization tools

---

## 📚 Related Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Gmail API Guide](https://developers.google.com/gmail/api)
- [Shopify API Documentation](https://shopify.dev/api)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)

---

**Last Updated:** May 15, 2026  
**Repository:** [therealhimanshu/d2c-automation-templates](https://github.com/therealhimanshu/d2c-automation-templates)  
**Language:** JavaScript (100%)
