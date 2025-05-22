const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    // Check if we have tempFilePath (from express-fileupload) or buffer
    const fileData = file.tempFilePath || file.data;

    const uploadOptions = {
      resource_type: "auto",
      folder: "game-gifts",
    };

    // If we have a buffer instead of a path, we need to handle it differently
    if (!file.tempFilePath && file.data) {
      uploadOptions.file = `data:${file.mimetype};base64,${file.data.toString('base64')}`;
    } cloudinary.uploader.upload(
      file.tempFilePath || uploadOptions.file,
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (!result || !result.secure_url) {
          reject(new Error('Invalid response from Cloudinary'));
        } else {
          resolve(result);
        }
      }
    );
  });
};

module.exports = {
  uploadToCloudinary
};