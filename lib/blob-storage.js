const { put, del } = require('@vercel/blob');

// Vercel Blob storage configuration
const BLOB_STORE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Blob storage helper functions
async function uploadToBlob(filename, buffer, contentType = 'audio/webm') {
    try {
        const blob = await put(filename, buffer, {
            access: 'public',
            contentType: contentType,
            token: BLOB_STORE_TOKEN
        });
        return blob;
    } catch (error) {
        console.error('Error uploading to blob:', error);
        throw error;
    }
}

async function deleteFromBlob(url) {
    try {
        await del(url, { token: BLOB_STORE_TOKEN });
    } catch (error) {
        console.error('Error deleting from blob:', error);
        throw error;
    }
}

module.exports = {
    uploadToBlob,
    deleteFromBlob
};