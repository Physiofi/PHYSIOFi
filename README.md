# Frontend Single-Page Website

This is a single-page site (HTML/CSS/JS) with dark-blue + green theme, quick contact icons, and a contact form.

## Run

- Open `index.html` in your browser, or
- Use VS Code/Cursor Live Server.

## Update contact details

Edit in `script.js`:

- `CONTACT.phoneDisplay`
- `CONTACT.phoneE164`
- `CONTACT.whatsappE164`
- `CONTACT.email`

## Enable admin email + sheet storage

The form now posts to `FORM_DELIVERY.endpoint` in `script.js`.
Use Google Apps Script so you do not need to host your own backend.

### 1) Create Google Sheet

Create a sheet with header row:

- `Submitted At`
- `Name`
- `Mobile`
- `Email`
- `Problem`

### 2) Create Apps Script

In that sheet: **Extensions -> Apps Script**, then paste this:

```javascript
const SHEET_NAME = "Sheet1";
const ADMIN_EMAIL = "your-admin@email.com";

function doPost(e) {
  try {
    const data = e.parameter || {};
    const submittedAt = data.submittedAt || new Date().toISOString();
    const name = data.name || "";
    const mobile = data.mobile || "";
    const email = data.email || "";
    const problem = data.problem || "";

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sheet.appendRow([submittedAt, name, mobile, email, problem]);

    const subject = "New website form submission";
    const body =
      "Submitted At: " + submittedAt + "\n" +
      "Name: " + name + "\n" +
      "Mobile: " + mobile + "\n" +
      "Email: " + email + "\n\n" +
      "Problem:\n" + problem;

    MailApp.sendEmail(ADMIN_EMAIL, subject, body);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 3) Deploy Web App

- Click **Deploy -> New deployment**
- Type: **Web app**
- Execute as: **Me**
- Who has access: **Anyone**
- Deploy and copy the Web App URL

### 4) Add endpoint in website

In `script.js` set:

- `FORM_DELIVERY.endpoint = "YOUR_WEB_APP_URL"`

Now each submit:

- sends an email to admin
- appends a row in Google Sheet

You can download the sheet as Excel anytime: **File -> Download -> Microsoft Excel (.xlsx)**.

