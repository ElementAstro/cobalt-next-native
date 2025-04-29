import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { FileItemType } from '../components/storage/types';

// Using require for JSZip since it doesn't have proper TypeScript support in React Native
const JSZip = require('jszip');

// Type definitions for magic numbers and extensions
type MagicNumbers = {
  [key in 'image/jpeg' | 'image/png' | 'application/pdf']: number[];
};

type ExtensionMap = {
  [key in 'jpeg' | 'jpg' | 'png' | 'pdf' | 'txt']: string;
};

interface JSZipObject {
  dir: boolean;
  async(type: 'base64'): Promise<string>;
}

interface JSZipFiles {
  [key: string]: JSZipObject;
}

/**
 * Utility functions for advanced file operations including:
 * - Compression/decompression
 * - Metadata management
 * - File integrity verification
 * - File type validation
 */

const METADATA_SUFFIX = '.metadata.json';
const ZIP_EXTENSION = '.zip';

/**
 * File type validation using MIME types and magic numbers
 */
export const fileTypes = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain', 'application/msword'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

/**
 * Validates file type using mime type and content analysis
 */
export async function validateFileType(uri: string, expectedType: string): Promise<boolean> {
  try {
    // Read first 4 bytes for magic number checking
    const header = await FileSystem.readAsStringAsync(uri, {
      length: 4,
      position: 0,
      encoding: FileSystem.EncodingType.Base64,
    });

    const buffer = Buffer.from(header, 'base64');
    
    // Common magic numbers
    const magicNumbers: MagicNumbers = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
    };

    if (expectedType in magicNumbers) {
      const expectedMagicNumbers = magicNumbers[expectedType as keyof MagicNumbers];
      return expectedMagicNumbers.every((num: number, i: number) => buffer[i] === num);
    }

    // Fallback to extension checking
    const extension = uri.split('.').pop()?.toLowerCase();
    const extensionMap: ExtensionMap = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
    };

    const ext = extension || '';
    if (ext in extensionMap) {
      return extensionMap[ext as keyof ExtensionMap] === expectedType;
    }
    return false;
  } catch (error) {
    console.error('Error validating file type:', error);
    return false;
  }
}

/**
 * Compresses a file or directory using JSZip
 */
export async function compressFile(uri: string, outputPath: string): Promise<string | null> {
  try {
    const zip = new JSZip();
    const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const filename = uri.split('/').pop() || 'compressed';

    zip.file(filename, content, { base64: true });
    const zipContent = await zip.generateAsync({ type: 'base64' });
    const zipPath = outputPath + ZIP_EXTENSION;

    await FileSystem.writeAsStringAsync(zipPath, zipContent, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return zipPath;
  } catch (error) {
    console.error('Error compressing file:', error);
    return null;
  }
}

/**
 * Decompresses a zip file
 */
export async function decompressFile(uri: string, outputPath: string): Promise<string[] | null> {
  try {
    const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const zip = await JSZip.loadAsync(content, { base64: true });
    const extractedFiles: string[] = [];

    const files = zip.files as JSZipFiles;
    for (const [filename, zipEntry] of Object.entries(files)) {
      if (!zipEntry.dir) {
        const content = await zipEntry.async('base64');
        const filePath = `${outputPath}/${filename}`;
        await FileSystem.writeAsStringAsync(filePath, content, {
          encoding: FileSystem.EncodingType.Base64,
        });
        extractedFiles.push(filePath);
      }
    }

    return extractedFiles;
  } catch (error) {
    console.error('Error decompressing file:', error);
    return null;
  }
}

/**
 * Manages file metadata
 */
export async function updateMetadata(uri: string, metadata: Record<string, any>): Promise<boolean> {
  try {
    const metadataPath = uri + METADATA_SUFFIX;
    const currentMetadata = await readMetadata(uri);
    const updatedMetadata = { ...currentMetadata, ...metadata, lastUpdated: Date.now() };

    await FileSystem.writeAsStringAsync(
      metadataPath,
      JSON.stringify(updatedMetadata, null, 2)
    );

    return true;
  } catch (error) {
    console.error('Error updating metadata:', error);
    return false;
  }
}

export async function readMetadata(uri: string): Promise<Record<string, any>> {
  try {
    const metadataPath = uri + METADATA_SUFFIX;
    const exists = (await FileSystem.getInfoAsync(metadataPath)).exists;

    if (!exists) {
      return {};
    }

    const content = await FileSystem.readAsStringAsync(metadataPath);
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading metadata:', error);
    return {};
  }
}

/**
 * Calculates file checksum for integrity verification
 */
export async function calculateChecksum(uri: string): Promise<string | null> {
  try {
    const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return createHash('md5').update(Buffer.from(content, 'base64')).digest('hex');
  } catch (error) {
    console.error('Error calculating checksum:', error);
    return null;
  }
}

/**
 * Verifies file integrity using stored checksum
 */
export async function verifyFileIntegrity(file: FileItemType): Promise<boolean> {
  try {
    if (!file.checksum) return true;

    const currentChecksum = await calculateChecksum(file.uri);
    return currentChecksum === file.checksum;
  } catch (error) {
    console.error('Error verifying file integrity:', error);
    return false;
  }
}

/**
 * Automatically organizes files based on type
 */
export async function organizeFiles(
  files: FileItemType[],
  baseDir: string
): Promise<Record<string, string[]>> {
  const organized: Record<string, string[]> = {
    images: [],
    documents: [],
    audio: [],
    video: [],
    other: [],
  };

  for (const file of files) {
    if (file.isDirectory) continue;

    let category = 'other';
    for (const [type, mimeTypes] of Object.entries(fileTypes)) {
      if (file.mimeType && mimeTypes.includes(file.mimeType)) {
        category = type;
        break;
      }
    }

    const newPath = `${baseDir}/${category}/${file.name}`;
    try {
      await FileSystem.makeDirectoryAsync(`${baseDir}/${category}`, { intermediates: true });
      await FileSystem.moveAsync({ from: file.uri, to: newPath });
      organized[category].push(newPath);
    } catch (error) {
      console.error(`Error organizing file ${file.name}:`, error);
    }
  }

  return organized;
}