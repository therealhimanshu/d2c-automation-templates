<<<<<<< HEAD
# d2c-automation-templates

A collection of automation scripts and templates for Direct-to-Consumer (D2C) businesses, primarily focused on Shopify integrations and data synchronization using Google Apps Script.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Shopify Scripts](#shopify-scripts)
  - [Email to Sheets Automation](automation-for-apps-without-api)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Shopify Scripts**: Automate tasks related to shopify environment.
- **Design Velocity Automation**: Scripts for handling new product introductions and order processing.

## Project Structure

```
repository/
├── README.md
└── shopify-scripts/
    └── design-velocity-automation/
        ├── new-product-orders.js
        └── new-products-to-sheets.js
    └── collection-create/
        └── collection-create.js
```

## Prerequisites

- Shopify API access (for Shopify-related scripts)
- Google Apps Script environment (for running the scripts)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/d2c-automation-templates.git
   cd d2c-automation-templates
   ```

2. Copy the script files to your Google Apps Script projects.

## Usage

### GA4 Automation
  - sessionsandproductviews.js - prequisites for running this code is you need google analytics data api and then you need to give the service account created for this api admin role in your ga4.

### Email to Sheets Automation

 - `scheduled-report-to-sheets.js`: Allows you to get the scheduled report emails data into google sheets on trigger basis.

### Shopify Scripts

Design Velocity Automation
- `new-product-orders.js`: Handles automation for new product orders.
- `new-products-to-sheets.js`: Syncs new product data to Google Sheets.

Collection Create
- `collection-create.js`: Creates new collection with manual master sku list.

To use these scripts:

1. Open the Google Apps Script editor for your project.
2. Copy the contents of the desired `.js` file into a new script file in the editor. ( In apps script file extension will be .gs )
3. Set up any required API keys or configurations (e.g., Shopify API credentials).
4. Save and run the script as needed.

For detailed setup instructions, refer to the comments within each script file.

## Contributing

Feel free to submit issues and pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
>>>>>>> 75f63a7a44d5264454c5c122495f5473677bb56b
