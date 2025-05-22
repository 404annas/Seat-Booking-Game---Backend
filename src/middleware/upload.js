const { uploadToCloudinary } = require('../config/cloudinary');

const handleImageUpload = async (req, res, next) => {
  try {
    // Initialize req.body if it doesn't exist
    req.body = req.body || {};    // Check if a file was uploaded
    if (!req.files || (!req.files.giftImage && !req.files.gameImage)) {
      // No file uploaded, continue without processing
      return next();
    }

    const file = req.files.giftImage || req.files.gameImage;

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Please upload only image files' });
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size should be less than 5MB' });
    }

    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(file);
      if (!result || !result.secure_url) {
        throw new Error('Failed to get image URL from Cloudinary');
      }

      // Add the image URL to the request body
      req.body = {
        ...req.body,
        imageUrl: result.secure_url
      };
      next();
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload image to cloud storage' });
    }
  } catch (error) {
    console.error('Error processing image upload:', error);
    return res.status(500).json({ message: 'Error processing image upload' });
  }
};

module.exports = {
  handleImageUpload
};