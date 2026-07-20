import { useState } from 'react';
import type { AbilityScores } from '../../domain/character/types';
import type { Disposition, NpcDefinition, NpcStatBlock } from '../../domain/dm/types';
import { entriesToText, textToEntries } from '../../domain/dm/statBlockText';
import { ALL_SKILLS } from '../../domain/rules/classSkills';
import { Sheet } from '../../ui/Sheet';

const ABILITIES: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const DISPOSITIONS: Disposition[] = ['friendly', 'neutral', 'hostile'];

const DEFAULT_ABILITIES: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

const DEFAULT_STAT_BLOCK: NpcStatBlock = {
  ac: 10,
  hp: { current: 10, max: 10 },
  speed: '30 ft.',
  abilityScores: DEFAULT_ABILITIES,
  saves: [],
  skills: [],
  senses: '',
  languages: '',
  cr: '',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--color-card-inner)', border: '1px solid var(--color-border)',
  borderRadius: 10, padding: '8px 11px', fontSize: 13.5, color: 'var(--color-text)',
  outline: 'none', fontFamily: 'inherit', width: '100%',
};

const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase',
  letterSpacing: '.04em', marginBottom: 6, display: 'block',
};

interface NpcFullEditorProps {
  npc: NpcDefinition;
  onSave: (updated: NpcDefinition) => void;
  onClose: () => void;
}

export function NpcFullEditor({ npc, onSave, onClose }: NpcFullEditorProps) {
  const [name, setName] = useState(npc.name);
  const [race, setRace] = useState(npc.race ?? '');
  const [disposition, setDisposition] = useState<Disposition>(npc.disposition);
  const [description, setDescription] = useState(npc.description);
  const sb = npc.statBlock ?? DEFAULT_STAT_BLOCK;
  const [ac, setAc] = useState(String(sb.ac));
  const [hpMax, setHpMax] = useState(String(sb.hp.max));
  const [speed, setSpeed] = useState(sb.speed);
  const [abilities, setAbilities] = useState<AbilityScores>(sb.abilityScores ?? DEFAULT_ABILITIES);
  const [saves, setSaves] = useState<string[]>(sb.saves ?? []);
  const [skills, setSkills] = useState<string[]>(sb.skills ?? []);
  const [senses, setSenses] = useState(sb.senses ?? '');
  const [languages, setLanguages] = useState(sb.languages ?? '');
  const [cr, setCr] = useState(sb.cr ?? '');
  const [traitsText, setTraitsText] = useState(entriesToText(sb.traits));
  const [actionsText, setActionsText] = useState(entriesToText(sb.actions));
  const [reactionsText, setReactionsText] = useState(entriesToText(sb.reactions));

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  const submit = () => {
    if (!name.trim()) return;
    const hpNum = Number(hpMax) || 10;
    const statBlock: NpcStatBlock = {
      ac: Number(ac) || 10,
      hp: { current: hpNum, max: hpNum },
      speed: speed.trim() || '30 ft.',
      abilityScores: abilities,
      saves: saves.length ? saves : undefined,
      skills: skills.length ? skills : undefined,
      senses: senses.trim() || undefined,
      languages: languages.trim() || undefined,
      cr: cr.trim() || undefined,
      traits: textToEntries(traitsText),
      actions: textToEntries(actionsText),
      reactions: textToEntries(reactionsText),
    };
    onSave({ ...npc, name: name.trim(), race: race.trim() || undefined, disposition, description: description.trim(), statBlock });
  };

  return (
    <Sheet icon="badge" title="Full Stat Block" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 2 }}>
            <label style={label}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Race</label>
            <input value={race} onChange={e => setRace(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={label}>Description / personality note</label>
          <input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={label}>Disposition</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {DISPOSITIONS.map(d => (
              <button key={d} onClick={() => setDisposition(d)} style={{
                flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                background: disposition === d ? '#b87333' : 'var(--color-raised)',
                color: disposition === d ? '#1a1206' : 'var(--color-muted)',
                border: '1px solid var(--color-border)', cursor: 'pointer', fontFamily: 'inherit',
              }}>{d}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label style={label}>AC</label><input type="number" value={ac} onChange={e => setAc(e.target.value)} style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={label}>Max HP</label><input type="number" value={hpMax} onChange={e => setHpMax(e.target.value)} style={inputStyle} /></div>
          <div style={{ flex: 2 }}><label style={label}>Speed</label><input value={speed} onChange={e => setSpeed(e.target.value)} style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={label}>CR</label><input value={cr} onChange={e => setCr(e.target.value)} style={inputStyle} /></div>
        </div>

        <div>
          <label style={label}>Ability scores</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {ABILITIES.map(a => (
              <div key={a}>
                <p style={{ fontSize: 10, color: 'var(--color-faint)', textAlign: 'center', textTransform: 'uppercase', marginBottom: 3 }}>{a}</p>
                <input
                  type="number"
                  value={abilities[a]}
                  onChange={e => setAbilities(s => ({ ...s, [a]: Number(e.target.value) || 0 }))}
                  style={{ ...inputStyle, padding: '6px 4px', textAlign: 'center' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label style={label}>Saving throw proficiencies</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ABILITIES.map(a => (
              <button key={a} onClick={() => toggle(saves, setSaves, a)} style={chip(saves.includes(a))}>{a.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={label}>Skill proficiencies</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_SKILLS.map(s => (
              <button key={s} onClick={() => toggle(skills, setSkills, s)} style={chip(skills.includes(s))}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label style={label}>Senses</label><input value={senses} onChange={e => setSenses(e.target.value)} placeholder="darkvision 60 ft." style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={label}>Languages</label><input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="Common, Goblin" style={inputStyle} /></div>
        </div>

        {[
          { title: 'Traits', value: traitsText, set: setTraitsText },
          { title: 'Actions', value: actionsText, set: setActionsText },
          { title: 'Reactions', value: reactionsText, set: setReactionsText },
        ].map(({ title, value, set }) => (
          <div key={title}>
            <label style={label}>{title}</label>
            <textarea
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={'Name: description of the trait or action.\n\nSeparate multiple entries with a blank line.'}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={submit}
        style={{ marginTop: 18, width: '100%', padding: '13px 0', borderRadius: 13, border: 'none', background: '#b87333', color: '#1a1206', fontWeight: 800, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Save Stat Block
      </button>
    </Sheet>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    fontSize: 11.5, padding: '5px 10px', borderRadius: 999,
    background: active ? '#b87333' : 'var(--color-raised)',
    color: active ? '#1a1206' : 'var(--color-muted)',
    border: '1px solid var(--color-border)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
  };
}
