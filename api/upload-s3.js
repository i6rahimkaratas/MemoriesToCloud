// /api/upload-s3.js - S3 version of your existing upload.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// AWS S3 configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export default async function handler(req, res) {
  // CORS headers - same as your original
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST metodu destekleniyor' });
  }

  try {
    console.log('S3 Upload request received');
    console.log('Content-Type:', req.headers['content-type']);
    
    // Same multipart parser as your original code
    const parseMultipart = (req) => {
      return new Promise((resolve, reject) => {
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
          reject(new Error('No boundary found'));
          return;
        }

        let data = '';
        req.setEncoding('binary');
        
        req.on('data', chunk => {
          data += chunk;
        });
        
        req.on('end', () => {
          const parts = data.split(`--${boundary}`);
          const files = {};
          const fields = {};
          
          for (const part of parts) {
            if (part.includes('Content-Disposition: form-data')) {
              const nameMatch = part.match(/name="([^"]+)"/);
              const filenameMatch = part.match(/filename="([^"]+)"/);
              const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
              
              if (nameMatch) {
                const name = nameMatch[1];
                
                if (filenameMatch && contentTypeMatch) {
                  // Bu bir dosya
                  const filename = filenameMatch[1];
                  const contentType = contentTypeMatch[1];
                  
                  const dataStart = part.indexOf('\r\n\r\n') + 4;
                  const fileData = part.substring(dataStart, part.lastIndexOf('\r\n'));
                  
                  files[name] = {
                    originalFilename: filename,
                    mimetype: contentType,
                    size: Buffer.byteLength(fileData, 'binary'),
                    data: Buffer.from(fileData, 'binary')
                  };
                } else {
                  // Bu bir form field
                  const dataStart = part.indexOf('\r\n\r\n') + 4;
                  const fieldValue = part.substring(dataStart, part.lastIndexOf('\r\n'));
                  fields[name] = fieldValue;
                }
              }
            }
          }
          
          resolve({ files, fields });
        });
        
        req.on('error', reject);
      });
    };

    const { files, fields } = await parseMultipart(req);
    console.log('Parsed files:', Object.keys(files));
    console.log('Parsed fields:', fields);
    
    if (!files.file) {
      return res.status(400).json({ error: 'Dosya bulunamadı' });
    }

    // User ID - same logic as your original
    const userId = fields.userId || 'default-user';
    console.log('User ID:', userId);

    const file = files.file;
    console.log('File info:', {
      name: file.originalFilename,
      type: file.mimetype,
      size: file.size
    });
    
    // Same file type validation
    const allowedTypes = ['image/', 'video/'];
    const isAllowedType = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (!isAllowedType) {
      return res.status(400).json({ error: 'Sadece resim ve video dosyaları destekleniyor' });
    }

    // Generate unique filename for S3
    const fileExtension = file.originalFilename.split('.').pop() || 'jpg';
    const uniqueFilename = `${Date.now()}-${uuidv4()}.${fileExtension}`;
    const s3Key = `photo-uploader/${userId}/${uniqueFilename}`;

    // S3 upload parameters
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: file.data, // Direct buffer upload (more efficient than base64)
      ContentType: file.mimetype,
      CacheControl: 'max-age=31536000', // 1 year cache
      Metadata: {
        'user-id': userId,
        'upload-date': new Date().toISOString(),
        'original-name': file.originalFilename,
        'file-size': file.size.toString()
      }
    };

    console.log('Uploading to S3...');
    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('S3 upload successful:', uploadResult.Key);

    // CloudFront URL (faster than S3 direct URL)
    const cloudFrontUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`;

    // Success response - same format as your Cloudinary version
    res.status(200).json({
      success: true,
      message: 'Dosya başarıyla yüklendi!',
      data: {
        id: s3Key, // S3 key instead of Cloudinary public_id
        url: cloudFrontUrl, // CloudFront URL for fast delivery
        originalName: file.originalFilename,
        size: file.size,
        type: file.mimetype,
        uploadDate: new Date().toISOString(),
        userId: userId,
        // Additional S3-specific info
        s3Key: s3Key,
        bucket: process.env.S3_BUCKET_NAME
      }
    });

  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ 
      error: 'Dosya yüklenirken hata oluştu',
      details: error.message 
    });
  }
}