/**
 * useCall Hook
 *
 * Custom React hook for managing call state with real-time Firestore subscriptions.
 * Provides upload functionality and live updates as the call progresses through
 * transcription and analysis stages.
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Call } from '@/types/models';

interface UseCallReturn {
  call: Call | null;
  isLoading: boolean;
  error: string | null;
  uploadFile: (file: File) => Promise<string | undefined>;
  progress: number;
}

export function useCall(callId?: string): UseCallReturn {
  const [call, setCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Real-time subscription to call document
  useEffect(() => {
    if (!callId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'calls', callId),
      (snapshot) => {
        if (snapshot.exists()) {
          setCall({ id: snapshot.id, ...snapshot.data() } as Call);
        } else {
          setError('Call not found');
        }
      },
      (err) => {
        console.error('Error listening to call:', err);
        setError(err.message);
      }
    );

    return () => unsubscribe();
  }, [callId]);

  const uploadFile = useCallback(async (file: File): Promise<string | undefined> => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      // Step 1: Create call document and get upload URL
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'anonymous-user', // In production, use Firebase Auth
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create call');
      }

      const { callId: newCallId, uploadUrl } = await response.json();

      if (!uploadUrl) {
        throw new Error('No upload URL received from server');
      }

      console.log('Upload URL received:', uploadUrl);
      setProgress(10);

      // Step 2: Upload file to storage (Firebase Storage or mock endpoint)
      try {
        // If it's a relative URL (mock), use it as-is. If it's absolute (Firebase), use it directly
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
          });
          throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
      } catch (fetchError) {
        // Enhanced error logging for CORS or network issues
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          console.error('Network error during upload. This might be a CORS issue.');
          console.error('Upload URL:', uploadUrl);
          throw new Error('Network error: Unable to upload file. Please check CORS configuration in Firebase Storage.');
        }
        throw fetchError;
      }

      setProgress(30);

      console.log(`File uploaded successfully. Call ID: ${newCallId}`);
      return newCallId;

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculate progress based on status
  useEffect(() => {
    if (!call) return;

    const progressMap: Record<Call['status'], number> = {
      created: 10,
      uploading: 30,
      transcribing: 50,
      transcribed: 70,
      analyzing: 85,
      complete: 100,
      failed: 0,
    };

    setProgress(progressMap[call.status] || 0);
  }, [call?.status]);

  return {
    call,
    isLoading,
    error,
    uploadFile,
    progress,
  };
}
