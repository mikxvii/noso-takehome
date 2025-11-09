'use client';

/**
 * AudioPlayer Component
 *
 * Audio player with synchronized transcript highlighting.
 * Displays current timestamp and allows playback control.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number | null;
}

export function AudioPlayer({ audioUrl, onTimeUpdate, seekToTime }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Seek to timestamp when requested from transcript/analysis
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
    }
  }, [seekToTime]);

  // Handle time updates
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      if (onTimeUpdate) {
        onTimeUpdate(time);
      }
    }
  };

  // Handle metadata loaded (get duration)
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Play/Pause toggle
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Skip forward 10 seconds
  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + 10,
        duration
      );
    }
  };

  // Skip backward 10 seconds
  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const percentage = x / bounds.width;
      audioRef.current.currentTime = percentage * duration;
    }
  };

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  if (!audioUrl) {
    return (
      <div className="h-20 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center">
        <p className="text-xs text-zinc-500">No audio available</p>
      </div>
    );
  }

  return (
    <div className="h-20 bg-zinc-900 border-t border-zinc-800 px-6 flex items-center gap-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={skipBackward}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Skip backward 10s"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={togglePlayPause}
          className="p-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={skipForward}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Skip forward 10s"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Time Display */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <span className="text-xs text-zinc-400 font-mono">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-zinc-600">/</span>
        <span className="text-xs text-zinc-500 font-mono">
          {formatTime(duration)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex-1">
        <div
          onClick={handleProgressClick}
          className="h-2 bg-zinc-800 rounded-full cursor-pointer relative overflow-hidden"
        >
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <span className="text-xs text-zinc-500">Vol</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-xs text-zinc-500 font-mono min-w-[2ch]">
          {Math.round(volume * 100)}
        </span>
      </div>
    </div>
  );
}
