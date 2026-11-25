# Tumaini Group – Invitation Mail Merge

A static HTML/CSS/JavaScript invitation manager designed for GitHub Pages.

## What it does

- Keeps the invitation artwork as one background image.
- Adds one guest's designation and name in the recipient position.
- Allows manual entry of one guest at a time.
- Imports attendee lists from CSV, XLSX or XLS.
- Previews each personalized invitation.
- Prints one invitation or the entire batch, with one landscape page per guest.
- Use **Save as PDF** in the browser print dialog to create PDFs.

## Important: add the final Canva artwork

The Canva design is 1920 × 1080 (16:9). To preserve it exactly and print sharply:

1. Open the final Canva design.
2. Export/download it as **PNG**, preferably at the highest available size.
3. Before export, remove or replace the existing recipient text `Dr. Wilson Kogo` in Canva with a blank area (or a neutral placeholder). This app places the mail-merge name in that same position.
4. Save the exported image in this project folder with the exact filename `poster.png`. The app will load it automatically. The on-page upload option is also available for temporary previews.
5. Commit the files to GitHub and enable GitHub Pages.

**Why the recipient text should be cleared in Canva first:** the web app uses the final Canva export as a flattened background image. It cannot erase the old printed letters from a PNG without changing the artwork. Removing only that one name in Canva lets the website insert each new guest at the exact same location without changing the rest of the poster.

## CSV / Excel format

Use these column headings:

| Name | Designation |
|---|---|
| Jane Doe | Dr. |
| John and Mary Smith | Mr. & Mrs. |

The `Name` column is required. `Designation` is optional. `Title`, `Salutation`, `Honourific`, `Honorific`, `Attendee`, `Attendee Name`, `Full Name`, and `Guest` are also recognized as aliases where applicable.

## GitHub Pages deployment

1. Create a GitHub repository, for example `tumaini-invitation-manager`.
2. Upload `index.html`, `styles.css`, `app.js`, `attendees-template.csv`, and your final `poster.png`.
3. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and `/ (root)`, then Save.
6. Wait for GitHub Pages to publish the site.

No server or database is required. Imported names are processed in the browser and are not sent to a server. The uploaded list is not permanently stored by this static site.

## Fine-tuning the name position

The current overlay is calibrated from the Canva design's 1920 × 1080 canvas and the `Dr. Wilson Kogo` text box:

- left: 7.18%
- top: 18.75%
- width: 35.58%
- height: 10.4%

These values are in `.recipient` in `styles.css`. The print overlay uses the matching `.print-recipient` values. If the name box was moved in Canva after the inspected version, adjust both sets of values to match.
