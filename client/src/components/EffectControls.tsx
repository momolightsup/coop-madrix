import React from 'react';
import { Sliders, Sparkles, Flame, Snowflake, Heart, Music, Type, Sun } from 'lucide-react';
import { EffectType, AnyEffectParams } from '../types';

interface EffectControlsProps {
  effectType: EffectType;
  onChangeEffectType: (type: EffectType) => void;
  params: AnyEffectParams;
  onChangeParams: (newParams: AnyEffectParams) => void;
}

export const EffectControls: React.FC<EffectControlsProps> = ({
  effectType,
  onChangeEffectType,
  params,
  onChangeParams,
}) => {
  const updateParam = (key: string, value: any) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  const effectList: Array<{ id: EffectType; label: string; icon: any }> = [
    { id: 'diamond_glints', label: 'Diamond Glints', icon: Sparkles },
    { id: 'christmas_sparkles', label: 'Christmas Sparkles', icon: Sparkles },
    { id: 'gentle_snowfall', label: 'Gentle Snowfall', icon: Snowflake },
    { id: 'organic_fire', label: 'Organic Fire Sparkles', icon: Flame },
    { id: 'rising_hearts', label: 'Rising Hearts', icon: Heart },
    { id: 'stationary_hearts', label: 'Stationary Hearts', icon: Heart },
    { id: 'musical_sparkles', label: 'Musical Sparkles', icon: Music },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'all_lights_on', label: 'All Lights On', icon: Sun },
  ];

  return (
    <aside className="w-80 border-l border-studio-800 bg-studio-900/95 flex flex-col shrink-0 select-none overflow-y-auto">
      {/* Effect Selector */}
      <div className="p-4 border-b border-studio-800">
        <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center justify-between">
          <span>Active Lighting Effect</span>
          <span className="text-[10px] text-studio-accent font-mono uppercase">Patch-Aware</span>
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {effectList.map((eff) => {
            const Icon = eff.icon;
            const active = effectType === eff.id;
            return (
              <button
                key={eff.id}
                onClick={() => onChangeEffectType(eff.id)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium text-left transition ${
                  active
                    ? 'bg-studio-accent text-white shadow-sm shadow-studio-accent/20'
                    : 'text-slate-400 hover:text-white hover:bg-studio-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-500'}`} />
                <span>{eff.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Particle Controls */}
      <div className="p-4 space-y-4 border-b border-studio-800">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
          <Sliders className="w-3.5 h-3.5 text-studio-accent" />
          <span>Core Particle Dynamics</span>
        </div>

        {/* Speed */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-400">Animation Speed</span>
            <span className="font-mono text-white">{params.speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={3.0}
            step={0.05}
            value={params.speed}
            onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
            className="w-full h-1 bg-studio-800 rounded appearance-none"
          />
        </div>

        {/* Amount */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-400">Particle Amount / Density</span>
            <span className="font-mono text-white">{params.amount.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={3.0}
            step={0.05}
            value={params.amount}
            onChange={(e) => updateParam('amount', parseFloat(e.target.value))}
            className="w-full h-1 bg-studio-800 rounded appearance-none"
          />
        </div>

        {/* Fade In Range */}
        <div className="bg-studio-850 p-2.5 rounded-lg border border-studio-800 space-y-2">
          <div className="text-[11px] font-medium text-slate-300 flex justify-between">
            <span>Particle Fade-In (Attack)</span>
            <span className="font-mono text-[10px] text-sky-400">
              {params.fadeInMin.toFixed(2)}s – {params.fadeInMax.toFixed(2)}s
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-500 block">Min Attack</span>
              <input
                type="range"
                min={0.02}
                max={1.0}
                step={0.02}
                value={params.fadeInMin}
                onChange={(e) => updateParam('fadeInMin', parseFloat(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Max Attack</span>
              <input
                type="range"
                min={0.05}
                max={2.0}
                step={0.05}
                value={params.fadeInMax}
                onChange={(e) => updateParam('fadeInMax', parseFloat(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Fade Out Range */}
        <div className="bg-studio-850 p-2.5 rounded-lg border border-studio-800 space-y-2">
          <div className="text-[11px] font-medium text-slate-300 flex justify-between">
            <span>Particle Fade-Out (Decay)</span>
            <span className="font-mono text-[10px] text-sky-400">
              {params.fadeOutMin.toFixed(2)}s – {params.fadeOutMax.toFixed(2)}s
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-500 block">Min Decay</span>
              <input
                type="range"
                min={0.1}
                max={2.5}
                step={0.05}
                value={params.fadeOutMin}
                onChange={(e) => updateParam('fadeOutMin', parseFloat(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Max Decay</span>
              <input
                type="range"
                min={0.3}
                max={5.0}
                step={0.1}
                value={params.fadeOutMax}
                onChange={(e) => updateParam('fadeOutMax', parseFloat(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Brightness Range */}
        <div className="bg-studio-850 p-2.5 rounded-lg border border-studio-800 space-y-2">
          <div className="text-[11px] font-medium text-slate-300 flex justify-between">
            <span>Brightness Intensity</span>
            <span className="font-mono text-[10px] text-sky-400">
              {params.brightnessMin}% – {params.brightnessMax}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-500 block">Min %</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={params.brightnessMin}
                onChange={(e) => updateParam('brightnessMin', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Max %</span>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={params.brightnessMax}
                onChange={(e) => updateParam('brightnessMax', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Isolated Dot Boost */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-400">Isolated Dot Participation</span>
            <span className="font-mono text-white">{params.isolatedDotBoost.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.0}
            max={3.0}
            step={0.2}
            value={params.isolatedDotBoost}
            onChange={(e) => updateParam('isolatedDotBoost', parseFloat(e.target.value))}
            className="w-full h-1 bg-studio-800 rounded appearance-none"
          />
        </div>
      </div>

      {/* Effect-Specific Parameters */}
      <div className="p-4 space-y-3">
        <span className="text-xs font-semibold text-slate-300 block">
          Effect Specific Adjustments
        </span>

        {effectType === 'gentle_snowfall' && (
          <>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Vertical Falling Speed</span>
                <span className="font-mono text-white">{(params as any).verticalSpeed}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={4.0}
                step={0.2}
                value={(params as any).verticalSpeed}
                onChange={(e) => updateParam('verticalSpeed', parseFloat(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Horizontal Drift & Wind</span>
                <span className="font-mono text-white">{(params as any).horizontalDrift}</span>
              </div>
              <input
                type="range"
                min={-3}
                max={3}
                step={0.5}
                value={(params as any).horizontalDrift}
                onChange={(e) => updateParam('horizontalDrift', parseFloat(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Upper Façade Concentration</span>
                <span className="font-mono text-white">{(params as any).upperConcentration}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={(params as any).upperConcentration}
                onChange={(e) => updateParam('upperConcentration', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
          </>
        )}

        {effectType === 'organic_fire' && (
          <>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Bottom Concentration</span>
                <span className="font-mono text-white">{(params as any).bottomConcentration}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={(params as any).bottomConcentration}
                onChange={(e) => updateParam('bottomConcentration', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Upward Ember Drift</span>
                <span className="font-mono text-white">{(params as any).upwardDrift}</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={(params as any).upwardDrift}
                onChange={(e) => updateParam('upwardDrift', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
          </>
        )}

        {effectType === 'rising_hearts' && (
          <>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Heart Count</span>
                <span className="font-mono text-white">{(params as any).heartCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                step={1}
                value={(params as any).heartCount}
                onChange={(e) => updateParam('heartCount', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Heart Size Range</span>
                <span className="font-mono text-white">
                  {(params as any).minHeartSize} – {(params as any).maxHeartSize} px
                </span>
              </div>
              <input
                type="range"
                min={6}
                max={30}
                step={1}
                value={(params as any).maxHeartSize}
                onChange={(e) => updateParam('maxHeartSize', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
          </>
        )}

        {effectType === 'stationary_hearts' && (
          <>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Heart Count</span>
                <span className="font-mono text-white">{(params as any).heartCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={(params as any).heartCount}
                onChange={(e) => updateParam('heartCount', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Full Hold Duration</span>
                <span className="font-mono text-white">{(params as any).holdDuration}s</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={(params as any).holdDuration}
                onChange={(e) => updateParam('holdDuration', parseFloat(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
          </>
        )}

        {effectType === 'typography' && (
          <>
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Text String</span>
              <input
                type="text"
                value={(params as any).text}
                onChange={(e) => updateParam('text', e.target.value)}
                className="w-full bg-studio-800 border border-studio-700 rounded px-2.5 py-1.5 text-xs text-white uppercase font-mono"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Font Size (px)</span>
                <span className="font-mono text-white">{(params as any).fontSize}</span>
              </div>
              <input
                type="range"
                min={14}
                max={80}
                step={2}
                value={(params as any).fontSize}
                onChange={(e) => updateParam('fontSize', parseInt(e.target.value))}
                className="w-full h-1 bg-studio-800 rounded appearance-none"
              />
            </div>
          </>
        )}

        {effectType === 'all_lights_on' && (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Constant Diagnostic Brightness</span>
              <span className="font-mono text-white">{(params as any).constantBrightness}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={(params as any).constantBrightness}
              onChange={(e) => updateParam('constantBrightness', parseInt(e.target.value))}
              className="w-full h-1 bg-studio-800 rounded appearance-none"
            />
          </div>
        )}
      </div>
    </aside>
  );
};
