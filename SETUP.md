# Cloud Sync Setup

This version keeps saving progress locally, but it can also sync through Supabase so your PC and phone stay in sync.

## 1. Create the Supabase project

1. Create a free project at https://supabase.com/
2. Open **SQL Editor**.
3. Paste the contents of `database-setup.sql` and run it.
4. Open your project's **Connect** dialog (or **Settings → API Keys**).
5. Copy:
   - the **Project URL**
   - the **Publishable key** (`sb_publishable_...`)

Do **not** use a secret key.

## 2. Configure the website

Open `cloud-config.js` and replace the two placeholders:

```js
window.TRAINING_SYNC_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "sb_publishable_REPLACE_ME"
};
```

Save the file.

## 3. Put it on GitHub Pages

Create a GitHub repository and put these files in its root:

- `index.html`
- `TrainingPlan.html`
- `cloud-config.js`

(`database-setup.sql` and this setup file can be included too.)

Then:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select your main branch and `/(root)`.
5. Click **Save**.

GitHub will show the public Pages URL when deployment completes.

## 4. Connect your PC

1. Open the GitHub Pages URL.
2. Click **Cloud sync**.
3. Click **Generate new code**.
4. Click **Copy** and save the code somewhere private.
5. Click **Save & sync**.

## 5. Connect your phone

1. Open the same GitHub Pages URL on your phone.
2. Click **Cloud sync**.
3. Paste the same sync code.
4. Click **Save & sync**.

From then on, checkbox changes are saved locally immediately and synced to Supabase. When the page opens on either device, it loads cloud progress and merges changes by the most recent change to each individual day.

## Security note

The website itself can be public. The Supabase publishable key is designed to be used in browser code.

Your progress is protected by the random sync code. The database's Row Level Security policies only allow a request to read or modify the row whose `sync_code` matches the private `x-sync-code` request header.

Treat the sync code like a password. Anyone who obtains it can read or change this training-plan progress. Do not use this pattern for sensitive personal data.
