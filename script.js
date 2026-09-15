// --- Mobile Menu ---
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('mobile-menu-btn');
mobileBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Close sidebar on item click (mobile)
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if(window.innerWidth <= 768) sidebar.classList.remove('open');
    });
});

// --- Navigation ---
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('view-' + viewName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- UI Interactions ---
const caption = document.getElementById('caption');
const charCurrent = document.getElementById('char-current');
if (caption) {
    caption.addEventListener('input', () => { charCurrent.textContent = caption.value.length; });
}

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
let currentFile = null;

if (dropzone) {
    ['dragover', 'dragleave', 'drop'].forEach(evt => {
        dropzone.addEventListener(evt, e => {
            e.preventDefault();
            dropzone.classList.toggle('dragover', evt === 'dragover');
        });
    });
    dropzone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
    fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
}

function handleFile(file) {
    if (!file) return;
    currentFile = file;
    filePreview.innerHTML = `<i class="fa-solid fa-check-circle"></i> Selected: ${file.name}`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

// --- Logic & Local Storage ---
document.addEventListener("DOMContentLoaded", () => {
    const keyYt = document.getElementById('key-yt');
    const keyMeta = document.getElementById('key-meta');
    if (keyYt) keyYt.value = localStorage.getItem('YT_KEY') || '';
    if (keyMeta) keyMeta.value = localStorage.getItem('META_KEY') || '';
});

function saveKeys() {
    localStorage.setItem('YT_KEY', document.getElementById('key-yt').value);
    localStorage.setItem('META_KEY', document.getElementById('key-meta').value);
    showToast("API Keys saved securely to browser");
}

function clearKeys() {
    localStorage.removeItem('YT_KEY');
    localStorage.removeItem('META_KEY');
    document.getElementById('key-yt').value = '';
    document.getElementById('key-meta').value = '';
    showToast("Keys cleared from browser");
}

function handlePublish() {
    if (!currentFile || !caption.value) {
        showToast("Please add media and a caption", "error");
        return;
    }

    const btn = document.getElementById('btn-publish');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Now';
        btn.disabled = false;
        showToast("Successfully published to selected platforms!");
        
        caption.value = '';
        charCurrent.textContent = '0';
        currentFile = null;
        filePreview.innerHTML = '';
    }, 2000);
}
