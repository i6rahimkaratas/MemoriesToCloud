// Frontend JavaScript - API Switch için
// Mevcut kodunuza ekleyebileceğiniz switch logic

// API Configuration
const API_CONFIG = {
  useS3: true, // false = Cloudinary, true = S3
  endpoints: {
    upload: {
      cloudinary: '/api/upload',
      s3: '/api/upload-s3'
    },
    getPhotos: {
      cloudinary: '/api/get-photos',
      s3: '/api/get-photos-s3'
    }
  }
};

// API Helper Functions
function getUploadEndpoint() {
  return API_CONFIG.useS3 ? API_CONFIG.endpoints.upload.s3 : API_CONFIG.endpoints.upload.cloudinary;
}

function getPhotosEndpoint() {
  return API_CONFIG.useS3 ? API_CONFIG.endpoints.getPhotos.s3 : API_CONFIG.endpoints.getPhotos.cloudinary;
}

// Mevcut upload function'ınızı güncelleyin
async function uploadPhotos(formData) {
  try {
    console.log(`Using ${API_CONFIG.useS3 ? 'S3' : 'Cloudinary'} for upload`);
    
    const response = await fetch(getUploadEndpoint(), {
      method: 'POST',
      body: formData // FormData object
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('Upload successful:', result.data);
      return result;
    } else {
      throw new Error(result.error || 'Upload failed');
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Mevcut getPhotos function'ınızı güncelleyin
async function loadPhotos(userId) {
  try {
    console.log(`Using ${API_CONFIG.useS3 ? 'S3' : 'Cloudinary'} for get photos`);
    
    const response = await fetch(`${getPhotosEndpoint()}?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`Loaded ${result.count} photos from ${API_CONFIG.useS3 ? 'S3' : 'Cloudinary'}`);
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to load photos');
    }
    
  } catch (error) {
    console.error('Load photos error:', error);
    throw error;
  }
}

// Test Switch Button (isteğe bağlı - test için)
function createSwitchButton() {
  const switchButton = document.createElement('button');
  switchButton.textContent = `Currently using: ${API_CONFIG.useS3 ? 'S3' : 'Cloudinary'}`;
  switchButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 10px;
    background: ${API_CONFIG.useS3 ? '#28a745' : '#007bff'};
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 1000;
  `;
  
  switchButton.addEventListener('click', () => {
    API_CONFIG.useS3 = !API_CONFIG.useS3;
    switchButton.textContent = `Currently using: ${API_CONFIG.useS3 ? 'S3' : 'Cloudinary'}`;
    switchButton.style.background = API_CONFIG.useS3 ? '#28a745' : '#007bff';
    console.log(`Switched to ${API_CONFIG.useS3 ? 'S3' : 'Cloudinary'}`);
  });
  
  document.body.appendChild(switchButton);
}

// Initialize switch button (test için)
document.addEventListener('DOMContentLoaded', () => {
  createSwitchButton();
});

// Example usage in your existing upload handler
document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  const fileInput = document.getElementById('fileInput');
  const userId = localStorage.getItem('userId') || 'default-user';
  
  if (fileInput.files.length > 0) {
    formData.append('file', fileInput.files[0]);
    formData.append('userId', userId);
    
    try {
      const result = await uploadPhotos(formData);
      console.log('Upload completed:', result);
      
      // Reload photos after upload
      await refreshPhotos();
      
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
  }
});

// Example usage for loading photos
async function refreshPhotos() {
  const userId = localStorage.getItem('userId') || 'default-user';
  
  try {
    const photos = await loadPhotos(userId);
    displayPhotos(photos); // Your existing display function
    
  } catch (error) {
    console.error('Failed to refresh photos:', error);
  }
}

// Performance comparison function (isteğe bağlı)
async function comparePerformance() {
  const userId = localStorage.getItem('userId') || 'default-user';
  
  console.log('=== Performance Comparison ===');
  
  // Test Cloudinary
  API_CONFIG.useS3 = false;
  const cloudinaryStart = performance.now();
  try {
    await loadPhotos(userId);
    const cloudinaryTime = performance.now() - cloudinaryStart;
    console.log(`Cloudinary load time: ${cloudinaryTime.toFixed(2)}ms`);
  } catch (error) {
    console.log('Cloudinary error:', error.message);
  }
  
  // Test S3
  API_CONFIG.useS3 = true;
  const s3Start = performance.now();
  try {
    await loadPhotos(userId);
    const s3Time = performance.now() - s3Start;
    console.log(`S3 load time: ${s3Time.toFixed(2)}ms`);
  } catch (error) {
    console.log('S3 error:', error.message);
  }
}