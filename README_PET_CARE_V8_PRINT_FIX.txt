PET CARE V8 PRINT FIX

This version fixes print functions that could open a blank white page in VS Code Simple Browser or mobile-style browsers.

Changed:
- Print Invoice
- Print Statement
- Print Completed Report
- Print Unpaid Report

Technical change:
The app no longer uses window.open('', '_blank') for printing. It now prints through a temporary hidden iframe so the main app screen should not be replaced by a blank page.

No database migration required.
Keep your existing .env.local file.
