import { useCallback, useState } from 'react';
import { logError } from '../utils/errorTracking';

/**
 * Custom hook for managing upload composer state
 * Handles image selection, editing, and metadata
 */
export function useUploadComposer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [editRotation, setEditRotation] = useState<number>(0);
  const [editBrightness, setEditBrightness] = useState<number>(100);
  const [editContrast, setEditContrast] = useState<number>(100);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resetUploadState = useCallback(() => {
    setSelectedFile(null);
    setCaption('');
    setEditRotation(0);
    setEditBrightness(100);
    setEditContrast(100);
    setUploadProgress(null);
    setUploadError(null);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    try {
      setSelectedFile(file);
      setUploadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File selection failed';
      setUploadError(message);
      logError('Upload composer file selection failed', error, { action: 'file_select' });
    }
  }, []);

  const handleCaptionChange = useCallback((newCaption: string) => {
    setCaption(newCaption);
  }, []);

  const handleRotationChange = useCallback((rotation: number) => {
    setEditRotation(rotation);
  }, []);

  const handleBrightnessChange = useCallback((brightness: number) => {
    setEditBrightness(brightness);
  }, []);

  const handleContrastChange = useCallback((contrast: number) => {
    setEditContrast(contrast);
  }, []);

  return {
    selectedFile,
    caption,
    editRotation,
    editBrightness,
    editContrast,
    uploadProgress,
    uploadError,
    setSelectedFile: handleFileSelect,
    setCaption: handleCaptionChange,
    setEditRotation: handleRotationChange,
    setEditBrightness: handleBrightnessChange,
    setEditContrast: handleContrastChange,
    setUploadProgress,
    setUploadError,
    resetUploadState,
  };
}
