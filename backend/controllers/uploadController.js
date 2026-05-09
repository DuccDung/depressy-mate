const supabase = require('../config/supabase');
const crypto = require('crypto');

// Cấu hình giới hạn upload
const UPLOAD_LIMITS = {
  IMAGE: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  VIDEO: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/quicktime'],
  },
};

/**
 * POST /api/upload/request-url
 * Tạo Presigned URL để client upload file trực tiếp lên Supabase Storage.
 * Body: { fileName, fileSize, contentType, mediaType: 'IMAGE' | 'VIDEO' }
 */
exports.requestUploadUrl = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileName, fileSize, contentType, mediaType } = req.body;

    // Validate input
    if (!fileName || !fileSize || !contentType || !mediaType) {
      return res.status(400).json({
        error: 'Missing required fields: fileName, fileSize, contentType, mediaType',
      });
    }

    const limits = UPLOAD_LIMITS[mediaType];
    if (!limits) {
      return res.status(400).json({ error: 'mediaType must be IMAGE or VIDEO' });
    }

    // Validate file size
    if (fileSize > limits.maxSize) {
      return res.status(400).json({
        error: `File too large. Max size for ${mediaType}: ${limits.maxSize / (1024 * 1024)}MB`,
      });
    }

    // Validate content type
    if (!limits.allowedTypes.includes(contentType)) {
      return res.status(400).json({
        error: `Invalid content type. Allowed for ${mediaType}: ${limits.allowedTypes.join(', ')}`,
      });
    }

    // Tạo tên file unique để tránh trùng
    const ext = fileName.split('.').pop();
    const uniqueName = `${userId}/${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const bucketName = 'social-media';
    const filePath = `posts/${uniqueName}`;

    // Tạo signed upload URL (rỗng 5 phút)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error('Supabase signed URL error:', error);
      return res.status(500).json({ error: 'Failed to generate upload URL' });
    }

    // Tạo public URL cho file sau khi upload xong
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    res.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: filePath,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (err) {
    console.error('Error requesting upload URL:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
