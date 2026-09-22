/**
 * Client-Side Direct Vercel Blob Upload Helper
 * Bypasses Vercel Serverless Function 4.5 MB request payload limit by uploading up to 15 MB files
 * directly from browser to Vercel Blob storage.
 */
async function uploadFileDirectToBlob(file) {
  if (!file) return null;

  // Step 1: Generate Client Upload Token from server
  const pathname = `notes/note-${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const tokenRes = await fetch('/api/blob/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: {
        pathname,
        clientPayload: null,
        multipart: false,
      },
    }),
  });

  if (!tokenRes.ok) {
    const errData = await tokenRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Vercel Blob storage is not configured or unavailable.');
  }

  const tokenData = await tokenRes.json();
  const clientToken = tokenData.clientToken;

  if (!clientToken) {
    throw new Error('Server did not return a valid client blob token.');
  }

  // Step 2: Upload file directly to Vercel Blob API
  const uploadUrl = `https://blob.vercel-storage.com/${pathname}`;

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'authorization': `Bearer ${clientToken}`,
      'x-api-version': '7',
      'content-type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => '');
    throw new Error(`Direct blob upload failed: ${putRes.statusText} ${errText}`);
  }

  const blobResult = await putRes.json();

  return {
    url: blobResult.url,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/pdf',
  };
}

// Attach client-side upload handling to note upload & edit forms
document.addEventListener('DOMContentLoaded', () => {
  const noteForm = document.querySelector('form[action="/notes"]') || document.querySelector('form[action^="/notes/"]');
  if (!noteForm) return;

  const fileInput = noteForm.querySelector('input[type="file"][name="file"]');
  if (!fileInput) return;

  // Ensure hidden fields for Blob metadata exist
  let hiddenUrl = noteForm.querySelector('input[name="fileUrl"]');
  if (!hiddenUrl) {
    hiddenUrl = document.createElement('input');
    hiddenUrl.type = 'hidden';
    hiddenUrl.name = 'fileUrl';
    noteForm.appendChild(hiddenUrl);
  }

  let hiddenName = noteForm.querySelector('input[name="fileName"]');
  if (!hiddenName) {
    hiddenName = document.createElement('input');
    hiddenName.type = 'hidden';
    hiddenName.name = 'fileName';
    noteForm.appendChild(hiddenName);
  }

  let hiddenSize = noteForm.querySelector('input[name="fileSize"]');
  if (!hiddenSize) {
    hiddenSize = document.createElement('input');
    hiddenSize.type = 'hidden';
    hiddenSize.name = 'fileSize';
    noteForm.appendChild(hiddenSize);
  }

  let hiddenMime = noteForm.querySelector('input[name="mimeType"]');
  if (!hiddenMime) {
    hiddenMime = document.createElement('input');
    hiddenMime.type = 'hidden';
    hiddenMime.name = 'mimeType';
    noteForm.appendChild(hiddenMime);
  }

  let isUploadingDirect = false;

  noteForm.addEventListener('submit', async (e) => {
    const selectedFile = fileInput.files[0];
    if (!selectedFile || isUploadingDirect) return;

    // Intercept form submit and attempt direct client Blob upload for attached files
    e.preventDefault();

    const submitBtn = noteForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Uploading file to cloud storage...';
      }

      const blobMeta = await uploadFileDirectToBlob(selectedFile);

      hiddenUrl.value = blobMeta.url;
      hiddenName.value = blobMeta.fileName;
      hiddenSize.value = blobMeta.fileSize;
      hiddenMime.value = blobMeta.mimeType;

      // Clear file input so raw file payload is not sent through Vercel Function
      fileInput.value = '';
      isUploadingDirect = true;

      // Submit metadata form
      noteForm.submit();
    } catch (err) {
      console.warn('Direct Blob upload failed:', err.message);
      // Fallback: If direct client Blob upload endpoint is unconfigured (e.g., local dev), submit standard form
      isUploadingDirect = true;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
      noteForm.submit();
    }
  });
});
