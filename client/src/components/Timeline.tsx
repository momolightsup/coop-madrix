import React from 'react';
import { Play, Pause, RotateCcw, Repeat } from 'lucide-react';
import { VideoSettings } from '../types';

interface TimelineProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  currentTime: number;
  onSeek: (time: number) => void;
  settings: VideoSettings;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onToggleLoop: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  isPlaying,
  onTogglePlay,
  onRestart,
  currentTime,
  onSeek,
  settings,
  playbackSpeed,
  onChangeSpeed,
  onToggleLoop,
}) => {
  const currentFrame = Math.floor(currentTime * settings.fps);
  const totalFrames = Math.round(settings.duration * settings.fps);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="h-14 border-t border-studio-800 bg-studio-900 px-4 flex items-center justify-between shrink-0 select-none text-xs text-slate-300">
      {/* Playback Transport Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full bg-studio-accent hover:bg-sky-400 text-white flex items-center justify-center shadow-md shadow-sky-500/20 transition"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
        </button>

        <button
          onClick={onRestart}
          className="p-1.5 hover:bg-studio-800 rounded-md text-slate-400 hover:text-white transition"
          title="Restart from Frame 0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleLoop}
          className={`p-1.5 rounded-md transition ${
            settings.loop
              ? 'text-studio-accent bg-studio-accent/10 border border-studio-accent/30'
              : 'text-slate-500 hover:text-white'
          }`}
          title="Loop Playback"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Scrubbable Timeline Track */}
      <div className="flex-1 max-w-2xl mx-6 flex items-center space-x-3">
        <span className="font-mono text-[11px] text-slate-400 w-16 text-right">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={settings.duration}
            step={1 / settings.fps}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <span className="font-mono text-[11px] text-slate-500 w-16">
          {formatTime(settings.duration)}
        </span>
      </div>

      {/* Frame Counter & Speed Selector */}
      <div className="flex items-center space-x-3">
        <div className="font-mono text-[11px] bg-studio-800/80 px-2.5 py-1 rounded border border-studio-700/60 text-slate-300">
          Frame <span className="text-white font-medium">{currentFrame}</span> / {totalFrames}
        </div>

        <div className="flex items-center space-x-1 bg-studio-800 p-0.5 rounded border border-studio-700/60">
          {[0.25, 0.5, 1, 2].map((sp) => (
            <button
              key={sp}
              onClick={() => onChangeSpeed(sp)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                playbackSpeed === sp
                  ? 'bg-studio-700 text-studio-accent font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
