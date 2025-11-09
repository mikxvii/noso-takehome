/**
 * useCall Hook
 *
 * Custom React hook for managing call state with real-time Firestore subscriptions.
 * Provides upload functionality and live updates as the call progresses through
 * transcription and analysis stages.
 */

import { useState, useEffect, useCallback } from 'react';
import { db, ensureInitialized } from '@/lib/firebase/config';
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

    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      await ensureInitialized();
      if (!db) {
        console.error('Firestore is not initialized');
        return;
      }

      // Dynamic import to avoid build-time execution
      const { doc, onSnapshot } = await import('firebase/firestore');
      
      unsubscribe = onSnapshot(
        doc(db, 'calls', callId),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const callData = { id: snapshot.id, ...data } as Call;
            
            // Debug logging
            if (callData.transcript) {
              console.log('[useCall] Transcript updated:', {
                hasSegments: !!callData.transcript.segments,
                segmentCount: callData.transcript.segments?.length || 0,
                status: callData.status,
              });
            }
            
            setCall(callData);
          } else {
            setError('Call not found');
          }
        },
        (err) => {
          console.error('Error listening to call:', err);
          setError(err.message);
        }
      );
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [callId]);

  // Poll for transcription status when transcribing (for local dev when webhooks don't work)
  useEffect(() => {
    if (!callId || !call) return;
    
    // Only poll if transcribing and no transcript yet
    if (call.status === 'transcribing' && !call.transcript && call.transcriptionJobId) {
      console.log('[useCall] Starting polling for transcription status...');
      
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/calls/${callId}/poll-transcription`);
          if (response.ok) {
            const result = await response.json();
            if (result.status === 'completed') {
              clearInterval(pollInterval);
              console.log('[useCall] Polling found completed transcript');
            }
          }
        } catch (err) {
          console.error('[useCall] Polling error:', err);
        }
      }, 5000); // Poll every 5 seconds

      // Clean up polling after 5 minutes
      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
        console.log('[useCall] Polling timeout reached');
      }, 5 * 60 * 1000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeout);
      };
    }
  }, [callId, call?.status, call?.transcript, call?.transcriptionJobId]);

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

      // Step 3: Notify server that upload is complete and start transcription
      const startTranscriptionResponse = await fetch(`/api/calls/${newCallId}/start-transcription`, {
        method: 'POST',
      });

      if (!startTranscriptionResponse.ok) {
        const errorData = await startTranscriptionResponse.json();
        throw new Error(errorData.error || 'Failed to start transcription');
      }

      setProgress(50);
      console.log(`File uploaded successfully and transcription started. Call ID: ${newCallId}`);
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
