import { put, del } from '@vercel/blob';

// Upload a PDF file to Vercel Blob storage
export async function uploadPdfToBlob(file: File, docId: string): Promise<string> {
  try {
    const filename = `pdfs/${docId}.pdf`;
    
    // Upload the file to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public', // Make it publicly accessible
      addRandomSuffix: false, // Use exact filename
    });
    

    return blob.url;
  } catch (error) {
    console.error('❌ Failed to upload PDF to blob storage:', error);
    throw error;
  }
}

// Delete a PDF file from Vercel Blob storage
export async function deletePdfFromBlob(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);

  } catch (error) {
    console.error('❌ Failed to delete PDF from blob storage:', error);
    throw error;
  }
}

// Test blob storage connection
export async function testBlobStorageConnection(): Promise<boolean> {
  try {
    // Create a small test file to verify connection
    const testContent = new Blob(['test'], { type: 'text/plain' });
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
    
    const blob = await put('test/connection-test.txt', testFile, {
      access: 'public',
    });
    
    // Clean up test file
    await del(blob.url);
    
    return true;
  } catch (error) {
    console.error('❌ Blob storage connection failed:', error);
    return false;
  }
}
