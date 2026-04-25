import { v2 as cloudinary } from 'cloudinary';

const hasValidCloudinaryConfig =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME !== 'Root' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
  process.env.CLOUDINARY_API_SECRET;

if (hasValidCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadToCloudinary(
  base64Data: string,
  folder: string = 'eventease'
): Promise<{ url: string; publicId: string }> {
  try {
    // Development mode: if no valid credentials, generate data URL for testing
    if (!hasValidCloudinaryConfig) {
      console.warn('Cloudinary not configured properly. Using dev mode.');
      console.warn('Cloud name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
      return {
        url: `data:image/jpeg;base64,${base64Data.slice(0, 100)}...`,
        publicId: `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      };
    }

    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
      folder,
      resource_type: 'auto',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    if (!hasValidCloudinaryConfig) {
      return;
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
}
