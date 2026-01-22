# Run Import Script - Step by Step

## Quick Method (Browser Console)

### Step 1: Create SSH Tunnel

**Open a NEW terminal window** and run:

```bash
ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23
```

**Keep this terminal open** - don't close it!

### Step 2: Open PocketBase Admin UI

1. Go to: `http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512`
2. Make sure you're **logged in**

### Step 3: Open Browser Console

1. Press **F12** (or right-click → Inspect)
2. Click the **Console** tab
3. Make sure you're on the PocketBase Admin page (not your website)

### Step 4: Copy and Paste Script

Copy the **ENTIRE** script from `COPY_PASTE_THIS.js` and paste it into the console, then press **Enter**.

### Step 5: Wait for Completion

The script will:
- Load senators (100 records)
- Load governors (50 records)  
- Import each one
- Show progress every 10 records
- Display final summary

**Expected output:**
```
🔄 Starting import...
📦 Loading Senators...
   Found 100 records
   Progress: 10/100 (10 created, 0 updated)
   ...
   ✅ Senators: Created: 100, Updated: 0, Errors: 0
📦 Loading Governors...
   ...
📊 Final Summary:
   ✅ Total Created: 150
   ✅ Total Updated: 0
   ❌ Total Errors: 0
📈 Total records in collection: 150
✅ Import complete!
```

## Troubleshooting

**If you see "ERR_CONNECTION_REFUSED":**
- Make sure the SSH tunnel is running (Step 1)
- Check that the terminal with the tunnel is still open

**If you see "401 Unauthorized":**
- Make sure you're logged into PocketBase Admin UI
- Refresh the page and log in again

**If you see "404 Not Found":**
- Check that the collection ID is correct: `pbc_3830222512`
- Verify you're on the right collection page

## Verify Import

After import, check your website:
- https://app.socialpolitician.com/senators
- https://app.socialpolitician.com/governors

You should see the politician cards!
