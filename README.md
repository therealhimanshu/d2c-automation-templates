# D2C Automation Templates

A comprehensive collection of automation scripts and templates for Direct-to-Consumer (D2C) businesses. This repository provides ready-to-use solutions for Shopify integrations, Google Analytics 4 automation, email data synchronization, Instagram/Meta marketing automation, and webhook handling using Google Apps Script and JavaScript.

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
   - [Instagram Posts & Stories Automation](#instagram-posts--stories-automation)
   - [Meta (Facebook Ads) Automation](#meta-facebook-ads-automation)
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
- **Instagram & Meta Automation** - Social media analytics and posting automation
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
├── instagram-posts-stories/
│   ├── instagram-post-and-stories.js
│   └── follower-track.js
├── meta/
│   ├── audience-insights.js
│   ├── insights-ad-level.js
│   ├── last-30-days-ads.js
│   └── last-30-days-audience-data.js
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

### 📸 Instagram Analytics & Automation
- Track Instagram post performance (likes, comments, reach, saves, shares)
- Monitor follower growth and changes
- Auto-refresh post metrics for recent posts (≤7 days old)
- Automated daily sync to Google Sheets
- Detect duplicate posts and prevent re-processing

### 💰 Meta (Facebook Ads) Analytics
- Extract Facebook ad campaign performance data
- Track audience insights and segmentation (New, Engaged, Existing)
- Ad-level performance metrics and ROI
- 30-day ad campaign analysis
- Audience demographic and engagement data
- Spend, impressions, clicks, ROAS tracking

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
  - Instagram Graph API credentials for Instagram automation
  - Meta Business Account & Ad Account access for Meta Ads automation
  - Gmail API access (handled by Google Apps Script)

### Tech Stack
- **JavaScript** (100%) - All scripts written in JavaScript/Google Apps Script
- **Google Apps Script** - Serverless execution environment
- **Google Sheets API** - Data storage and retrieval
- **Gmail API** - Email parsing and processing
- **Shopify API** - E-commerce operations
- **Instagram Graph API** - Social media analytics
- **Meta Marketing API** - Facebook Ads automation

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

### Instagram Posts & Stories Automation

**Directory:** `instagram-posts-stories/`

#### Instagram Post & Stories Metrics Tracker

**File:** `instagram-post-and-stories.js`

Automatically tracks Instagram post performance metrics daily.

**Features:**
- ✅ Daily post discovery from Instagram feed
- ✅ Comprehensive metrics tracking:
  - Likes, comments, reach, saves, shares
  - Total interactions calculation
  - Engagement rate analysis
- ✅ Auto-refresh metrics for posts ≤7 days old
- ✅ Duplicate prevention (avoids re-processing same posts)
- ✅ Rate-limited API calls (200ms delay)
- ✅ Automatic Google Sheets export

**Configuration:**
```javascript
const CONFIG = {
  ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty('IG_ACCESS_TOKEN'),
  IG_USER_ID: PropertiesService.getScriptProperties().getProperty('IG_USER_ID'),
  SHEET_NAME: 'IG_Post_Metrics',
  METRICS_TO_REFRESH_DAYS: 7  // Refresh posts from last 7 days
};
```

**Setup Steps:**
1. Get Instagram Graph API access token from Meta Business Suite
2. Find your Instagram User ID
3. Store credentials in Google Apps Script Properties Service
4. Create Google Sheet with headers
5. Set up daily trigger for `runDailyInstagramSync()`

**Data Collected:**
- Post date, media ID, type (IMAGE/VIDEO/CAROUSEL)
- Post caption and permalink
- Engagement metrics (likes, comments, reach, saves, shares)
- Last updated timestamp

---

#### Instagram Follower Tracking

**File:** `follower-track.js`

Tracks daily follower growth and changes.

**Features:**
- ✅ Daily follower count tracking
- ✅ Follows vs unfollows metrics
- ✅ Net follower change calculation
- ✅ Prevents duplicate daily entries
- ✅ Automatic sheet creation and management

**Configuration:**
```javascript
const FOLLOWER_CONFIG = {
  ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty('IG_ACCESS_TOKEN'),
  IG_USER_ID: PropertiesService.getScriptProperties().getProperty('IG_USER_ID'),
  SHEET_NAME: 'IG_Follower_Stats'
};
```

**Setup Steps:**
1. Use same Instagram credentials as post tracker
2. Create separate Google Sheet for follower data
3. Set up daily trigger for `runDailyFollowerSync()`
4. Run debug function first: `debugFollowerInsights()`

**Data Collected:**
- Date and total follower count
- Followers gained/lost per day
- Net follower change
- Last update timestamp

---

### Meta (Facebook Ads) Automation

**Directory:** `meta/`

Comprehensive Facebook Ads analytics and performance tracking.

#### Audience Insights

**File:** `audience-insights.js`

Analyzes ad campaign performance by audience segment.

**Features:**
- ✅ Campaign performance by audience type (New/Engaged/Existing)
- ✅ Demographic breakdown and targeting analysis
- ✅ ROI calculation by audience segment
- ✅ Custom audience segment mapping
- ✅ Pagination support for large datasets

**Configuration:**
```javascript
var ACCESS_TOKEN   = PropertiesService.getScriptProperties().getProperty('META_ACCESS_TOKEN');
var AD_ACCOUNT_ID  = PropertiesService.getScriptProperties().getProperty('META_AD_ACCOUNT_ID');
var SHEET_AUDIENCE = 'Audience';
```

**Metrics Tracked:**
- Spend, impressions, clicks
- CPC (Cost Per Click), CPM (Cost Per Mille), CTR (Click-Through Rate)
- Purchase value and ROAS (Return on Ad Spend)
- Audience segmentation

---

#### Ad-Level Performance Insights

**File:** `insights-ad-level.js`

Detailed performance metrics at individual ad level.

**Features:**
- ✅ Ad-level performance breakdown
- ✅ Campaign and ad set association
- ✅ Detailed action tracking
- ✅ Cost metrics per action

---

#### Last 30 Days Ads Performance

**File:** `last-30-days-ads.js`

Rolling 30-day campaign analysis and performance summary.

**Features:**
- ✅ 30-day performance trends
- ✅ Campaign performance comparison
- ✅ Period-over-period analysis
- ✅ Automated daily refresh

---

#### Last 30 Days Audience Data

**File:** `last-30-days-audience-data.js`

30-day audience engagement and growth tracking.

**Features:**
- ✅ Audience growth trends
- ✅ Engagement by audience segment
- ✅ Historical audience data
- ✅ Automated data collection

---

#### Setup Instructions for Meta Scripts

**Prerequisites:**
1. Meta Business Account with admin access
2. Facebook Ad Account linked to business
3. Meta Marketing API access enabled
4. Service Account with appropriate permissions

**Steps:**
1. Generate long-lived access token from Meta Business Suite
2. Get your Ad Account ID (act_XXXXXXXXXX format)
3. Store in Google Apps Script Properties:
   - `META_ACCESS_TOKEN`
   - `META_AD_ACCOUNT_ID`
4. Create Google Sheets for each data type
5. Set up daily triggers for automatic data collection

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

### Storing Sensitive Data Securely

**Using Google Apps Script Properties Service:**
```javascript
// Set credentials (run once):
PropertiesService.getScriptProperties().setProperty('IG_ACCESS_TOKEN', 'your-token');
PropertiesService.getScriptProperties().setProperty('META_ACCESS_TOKEN', 'your-token');

// Retrieve in scripts:
const token = PropertiesService.getScriptProperties().getProperty('IG_ACCESS_TOKEN');
```

### Common Configuration Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `SHEET_NAME` | Google Sheet name | `'IG_Post_Metrics'` |
| `ACCESS_TOKEN` | API authentication token | `'IGQVJf...'` |
| `IG_USER_ID` | Instagram User ID | `'17841401240122082'` |
| `AD_ACCOUNT_ID` | Meta Ad Account ID | `'act_1234567890'` |
| `METRICS_TO_REFRESH_DAYS` | Days to keep refreshing | `7` |
| `GMAIL_SEARCH_QUERY` | Gmail search filter | `'from:no-reply@...'` |

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

| Automation | Recommended Frequency | Best Time |
|------------|----------------------|-----------|
| Instagram Post Metrics | Daily | 8:00 AM (UTC+0) |
| Instagram Follower Tracking | Daily | 8:30 AM |
| Meta Ads (30-day) | Daily | 9:00 AM |
| Meta Audience Insights | Daily | 9:30 AM |
| GA4 Export | Every 6 hours | Every 6 hours |
| Email to Sheets | Daily | 8:00 AM |
| Shopify Sync | Every 1 hour | - |

---

## 📊 Common Use Cases

### 1. Social Media Performance Dashboard
```javascript
// Combine Instagram post metrics + follower growth
// Track ROAS by audience segment (Meta Ads)
// Monitor Instagram reach vs. cost per reach
```

### 2. Abandoned Cart Email Reports to Sheets
```javascript
const CONFIG = {
  SHEET_NAME: 'GoKwik_Abandoned_Summary',
  QUERY: 'from:no-reply@gokwik.co subject:"Gokwik Abandoned Carts Report"'
};
```

### 3. Unified D2C Analytics Dashboard
```javascript
// GA4 metrics (traffic, conversions)
// Shopify orders and revenue
// Instagram follower growth
// Meta Ads ROAS and spend
// Email marketing metrics
```

### 4. Instagram Performance Analysis
```javascript
// Top performing posts by engagement
// Follower growth trends
// Best posting times and content types
// Reach vs. engagement correlation
```

### 5. Meta Ads Optimization
```javascript
// ROI by audience segment
// Campaign performance comparison
// Cost per action optimization
// Budget allocation by segment
```

---

## 🛠️ Troubleshooting

### Instagram & Meta API Issues

| Problem | Solution |
|---------|----------|
| "Invalid Access Token" | Verify token in Properties Service, refresh from Meta Business Suite |
| "User not authorized" | Check Instagram Graph API permissions in Meta App |
| "No posts found" | Verify IG_USER_ID is correct business account ID |
| "Follower metrics empty" | Ensure `follows_and_unfollows` permission is enabled |
| "API rate limited" | Check timeout delays (200ms minimum recommended) |

### Meta Ads Issues

| Problem | Solution |
|---------|----------|
| "Ad Account not found" | Verify AD_ACCOUNT_ID format (act_XXXXXXXXX) |
| "Insufficient permissions" | Grant Marketing API access in Meta Business Settings |
| "No campaign data" | Confirm campaigns exist and are within selected date range |

### Script Execution Issues

| Problem | Solution |
|---------|----------|
| "Gmail API error" | Enable Gmail API in Google Cloud Console |
| "Sheets not found" | Verify sheet name in CONFIG matches exactly |
| "Authorization error" | Re-run script to grant permissions |
| "No data appended" | Check API query returns results |
| "Timeout error" | Break large operations into smaller chunks |

### Sheet Data Issues

- **Duplicate data**: Check if post IDs or media IDs already exist
- **Missing metrics**: Verify API fields are accessible for your account type
- **Wrong audience types**: Validate `mapUserSegmentKeyToType_()` function for your Meta keys

---

## 📝 Code Comments

Each script file includes detailed comments explaining:
- Configuration requirements
- Function purposes
- Data transformation logic
- Error handling
- Setup instructions
- API pagination handling
- Rate limiting

Review comments within each script for implementation-specific details.

---

## 💡 Best Practices

### Security
- ✅ Never hardcode sensitive credentials in scripts
- ✅ Use Google Apps Script Properties Service for secrets
- ✅ Review API permissions before granting access
- ✅ Regularly audit webhook access logs
- ✅ Rotate long-lived tokens periodically
- ✅ Use least-privilege access for service accounts

### Performance
- ✅ Use appropriate API rate limits and delays (200ms minimum)
- ✅ Batch operations when possible
- ✅ Use appropriate trigger intervals
- ✅ Monitor script execution time (6-minute limit)
- ✅ Paginate large API responses
- ✅ Implement deduplication checks

### Maintenance
- ✅ Keep scripts organized and commented
- ✅ Update CONFIG objects for easy management
- ✅ Test scripts after API changes
- ✅ Version control all modifications
- ✅ Document custom functions
- ✅ Monitor error logs regularly

### Data Management
- ✅ Archive old data periodically
- ✅ Use consistent date formats (UTC recommended)
- ✅ Validate data before appending
- ✅ Maintain data integrity checks
- ✅ Deduplicate before insertion
- ✅ Track last update timestamps

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-automation`)
3. Make your changes with clear commit messages
4. Test thoroughly with your configuration
5. Submit a pull request with description

### Areas for Contribution
- New platform integrations (TikTok, Pinterest, LinkedIn)
- Enhanced error handling and logging
- Performance optimizations
- Additional email templates
- Webhook handler examples
- Documentation improvements
- Advanced analytics features

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 📧 Support & Issues

For questions, bugs, or feature requests:
- Open a [GitHub Issue](https://github.com/therealhimanshu/d2c-automation-templates/issues)
- Check existing issues for solutions
- Include script name and error messages in reports
- Provide API response details when applicable

---

## 🎯 Roadmap

- [ ] TikTok Ads analytics integration
- [ ] Pinterest analytics automation
- [ ] LinkedIn Campaign tracking
- [ ] TypeScript support for better type checking
- [ ] Enhanced error logging and monitoring dashboard
- [ ] Pre-built webhook handlers for popular platforms
- [ ] CLI tool for script management
- [ ] Webhook testing and validation tool
- [ ] Integration with more D2C platforms (WooCommerce, BigCommerce)
- [ ] Advanced data transformation templates
- [ ] Cost estimation and ROI optimization tools
- [ ] Multi-account management support
- [ ] Advanced segmentation and cohort analysis

---

## 📚 Related Resources

### Google APIs
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Gmail API Guide](https://developers.google.com/gmail/api)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)

### E-commerce & Marketing APIs
- [Shopify API Documentation](https://shopify.dev/api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [Meta Business SDK](https://developers.facebook.com/docs/business-sdk)

### Tools & Utilities
- [Meta Business Suite](https://business.facebook.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [Apps Script Debugger](https://developers.google.com/apps-script/guides/support/troubleshooting)

---

**Last Updated:** May 15, 2026  
**Repository:** [therealhimanshu/d2c-automation-templates](https://github.com/therealhimanshu/d2c-automation-templates)  
**Language:** JavaScript (100%)  
**Maintained by:** @therealhimanshu
