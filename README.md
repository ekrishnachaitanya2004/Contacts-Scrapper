# Directory Email Importer Chrome Extension

A Chrome Extension that automatically imports all organization directory contacts into your Google Contacts.

## Features

- Automatically scrolls through the entire directory
- Clicks "Add to contacts" for each person
- Provides progress feedback
- Simple one-click operation

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the folder containing these files
5. The extension icon should appear in your Chrome toolbar

## Usage

1. Navigate to `https://contacts.google.com/directory`
2. Click the extension icon in your toolbar
3. Click "Start Import"
4. Wait for the process to complete
5. Once done, go to `https://contacts.google.com/` to export your contacts

## Exporting Contacts

After the import is complete:
1. Visit `https://contacts.google.com/`
2. Click "Export" in the left sidebar
3. Choose your preferred format (Google CSV or Outlook CSV)
4. Download the file

## Notes

- The extension adds a small delay between clicks to avoid overwhelming the UI
- Progress is shown in the console (press F12 to view)
- If you encounter any issues, try refreshing the directory page and running the import again 