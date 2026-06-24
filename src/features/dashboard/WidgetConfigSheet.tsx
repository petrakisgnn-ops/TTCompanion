import { useState } from 'react';
import type { WidgetInstance } from '../../domain/widgets/types';
import type { Character } from '../../domain/character/types';
import type { ResourceTrackerConfig } from '../../widgets/ResourceTrackerWidget';
import type { CombatStatsConfig } from '../../widgets/CombatStatsWidget';

interface WidgetConfigSheetProps {
  instance: WidgetInstance;
  character: Character;
  onSave: (id: string, config: unknown) => void;
  onClose: () => void;
}

function ResourceTrackerConfigPanel({
  instance,
  character,
  onSave,
  onClose,
}: WidgetConfigSheetProps) {
  const config = instance.config as ResourceTrackerConfig;
  const [resourceId, setResourceId] = useState(config.resourceId);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Resource
        </label>
        {character.resources.length === 0 ? (
          <p className="text-sm text-slate-500">No resources on this character.</p>
        ) : (
          <div className="space-y-1">
            {character.resources.map(r => (
              <button
                key={r.id}
                onClick={() => setResourceId(r.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                  resourceId === r.id
                    ? 'bg-amber-500/20 border border-amber-500/40'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs text-slate-500">
                  {r.current}/{r.max} · {r.resetOn === 'shortRest' ? 'SR' : 'LR'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-white/10 rounded-xl"
        >
          Cancel
        </button>
        <button
          onClick={() => { onSave(instance.id, { resourceId } satisfies ResourceTrackerConfig); onClose(); }}
          disabled={!resourceId}
          className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function CombatStatsConfigPanel({
  instance,
  onSave,
  onClose,
}: WidgetConfigSheetProps) {
  const config = instance.config as CombatStatsConfig;
  const [acOverride, setAcOverride] = useState<string>(
    config.acOverride !== undefined ? String(config.acOverride) : '',
  );
  const [speedFt, setSpeedFt] = useState<string>(
    config.speedFt !== undefined ? String(config.speedFt) : '',
  );

  const handleSave = () => {
    const next: CombatStatsConfig = {};
    const ac = parseInt(acOverride, 10);
    const sp = parseInt(speedFt, 10);
    if (!isNaN(ac) && ac > 0) next.acOverride = ac;
    if (!isNaN(sp) && sp > 0) next.speedFt = sp;
    onSave(instance.id, next);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          AC Override
        </label>
        <p className="text-xs text-slate-600">Leave blank to use 10 + DEX mod.</p>
        <input
          type="number"
          min={1}
          max={30}
          value={acOverride}
          onChange={e => setAcOverride(e.target.value)}
          placeholder="e.g. 17"
          className="w-full bg-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Speed (ft)
        </label>
        <p className="text-xs text-slate-600">Leave blank to use default 30 ft.</p>
        <input
          type="number"
          min={0}
          step={5}
          value={speedFt}
          onChange={e => setSpeedFt(e.target.value)}
          placeholder="e.g. 35"
          className="w-full bg-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-white/10 rounded-xl"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400"
        >
          Save
        </button>
      </div>
    </div>
  );
}

const CONFIG_PANELS: Record<
  string,
  (props: WidgetConfigSheetProps) => React.ReactElement | null
> = {
  'resource-tracker': (props) => <ResourceTrackerConfigPanel {...props} />,
  'combat-stats':     (props) => <CombatStatsConfigPanel {...props} />,
};

export function WidgetConfigSheet(props: WidgetConfigSheetProps) {
  const { instance, onClose } = props;
  const Panel = CONFIG_PANELS[instance.type];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 rounded-t-2xl p-5 space-y-4 safe-area-bottom">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Widget Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
        </div>

        {Panel ? (
          <Panel {...props} />
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">No settings for this widget.</p>
        )}
      </div>
    </>
  );
}
