
// 1. Point to your Node.js backend
const API_URL = '/api';

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const fileInput = document.getElementById('file-input');
const fileLabel = document.getElementById('file-label');
const textInput = document.getElementById('text-input');
const generateBtn = document.getElementById('generate-btn');
const sendResult = document.getElementById('send-result');
const sendError = document.getElementById('send-error');
const generatedCode = document.getElementById('generated-code');

const codeInput = document.getElementById('code-input');
const getBtn = document.getElementById('get-btn');
const receiveResult = document.getElementById('receive-result');
const receiveError = document.getElementById('receive-error');
const textResult = document.getElementById('text-result');
const fileResult = document.getElementById('file-result');
const receivedText = document.getElementById('received-text');
const copyBtn = document.getElementById('copy-btn');
const fileInfo = document.getElementById('file-info');

// Tab Switching Logic
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetTab = button.dataset.tab;

    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    button.classList.add('active');
    document.getElementById(`${targetTab}-tab`).classList.add('active');

    clearMessages();
  });
});

// File Input Handling
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    fileLabel.textContent = file.name;
    textInput.value = '';
  } else {
    fileLabel.textContent = 'Choose a file';
  }
});

textInput.addEventListener('input', () => {
  if (textInput.value.trim()) {
    fileInput.value = '';
    fileLabel.textContent = 'Choose a file';
  }
});

// Generate Code (Upload)
generateBtn.addEventListener('click', async () => {
  const text = textInput.value.trim();
  const file = fileInput.files[0];

  if (!text && !file) {
    showError('send', 'Please enter text or select a file to share.');
    return;
  }

  if (text && file) {
    showError('send', 'Please choose either text OR a file, not both.');
    return;
  }

  setLoading('generate', true);
  clearMessages();

  try {
    let response;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      response = await fetch(`${API_URL}/upload-item`, {
        method: 'POST',
        body: formData,
      });
    } else {
      response = await fetch(`${API_URL}/upload-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate code');
    }

    generatedCode.textContent = data.code;
    sendResult.style.display = 'block';

    textInput.value = '';
    fileInput.value = '';
    fileLabel.textContent = 'Choose a file';
  } catch (error) {
    showError('send', error.message || 'An error occurred. Please try again.');
  } finally {
    setLoading('generate', false);
  }
});

// Get Item (Retrieve)
getBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();

  if (!code || code.length !== 4 || !/^\d{4}$/.test(code)) {
    showError('receive', 'Please enter a valid 4-digit code.');
    return;
  }

  setLoading('get', true);
  clearMessages();

  try {
    const response = await fetch(`${API_URL}/get-item?code=${code}`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to retrieve item');
    }

    receiveResult.style.display = 'block';

    if (data.itemType === 'text') {
      textResult.style.display = 'block';
      fileResult.style.display = 'none';
      receivedText.value = data.content;
    } else {
      textResult.style.display = 'none';
      fileResult.style.display = 'block';
      fileInfo.textContent = `File: ${data.fileName}`;

      // Automatically trigger download
      const link = document.createElement('a');
      link.href = data.fileUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    showError('receive', error.message || 'An error occurred. Please try again.');
  } finally {
    setLoading('get', false);
  }
});

// Copy Text
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(receivedText.value);
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span>Copied!</span>';
    copyBtn.style.background = 'var(--success)';

    setTimeout(() => {
      copyBtn.innerHTML = originalText;
      copyBtn.style.background = '';
    }, 2000);
  } catch (error) {
    showError('receive', 'Failed to copy to clipboard');
  }
});

// Code Input Formatting (4 digits only)
codeInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
});

// Helper: Loading State
function setLoading(button, loading) {
  const btn = button === 'generate' ? generateBtn : getBtn;
  const spinner = btn.querySelector('.spinner');
  const text = btn.querySelector('.btn-text');

  if (loading) {
    btn.disabled = true;
    spinner.style.display = 'inline-block';
    text.style.display = 'none';
  } else {
    btn.disabled = false;
    spinner.style.display = 'none';
    text.style.display = 'inline-block';
  }
}

// Helper: Show Error
function showError(tab, message) {
  const errorEl = tab === 'send' ? sendError : receiveError;
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

// Helper: Clear Messages
function clearMessages() {
  sendResult.style.display = 'none';
  sendError.style.display = 'none';
  receiveResult.style.display = 'none';
  receiveError.style.display = 'none';
  textResult.style.display = 'none';
  fileResult.style.display = 'none';
}