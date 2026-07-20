import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { DataProvider, useData } from './app/DataContext';
import { LoadingScreen } from './app/LoadingScreen';
import { AppShell } from './app/AppShell';
import { useModeStore } from './stores/modeStore';

// Compendium
import { CompendiumPage }    from './features/compendium/CompendiumPage';
import { SpellListPage }     from './features/compendium/SpellListPage';
import { SpellDetailPage }   from './features/compendium/SpellDetailPage';
import { BestiaryListPage }  from './features/compendium/BestiaryListPage';
import { MonsterDetailPage } from './features/compendium/MonsterDetailPage';
import { ItemListPage }      from './features/compendium/ItemListPage';
import { ItemDetailPage }    from './features/compendium/ItemDetailPage';
import { RacesPage }         from './features/compendium/RacesPage';
import { ClassesPage }       from './features/compendium/ClassesPage';
import { BackgroundsPage }   from './features/compendium/BackgroundsPage';
import { FeatsPage }         from './features/compendium/FeatsPage';
import { ConditionsPage }    from './features/compendium/ConditionsPage';

// Characters
import { CharacterListPage } from './features/character/CharacterListPage';
import { CharacterWizard }   from './features/character/creation/CharacterWizard';
import { CharacterSheetPage } from './features/character/sheet/CharacterSheetPage';

// Dashboard / Tools / Settings
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ToolsPage }     from './features/tools/ToolsPage';
import { SettingsPage }  from './features/settings/SettingsPage';

// DM mode
import { DmHomePage }    from './features/dm/DmHomePage';
import { NpcsPage }      from './features/dm/NpcsPage';
import { NpcDetailPage } from './features/dm/NpcDetailPage';

function HomeRouter() {
  const { mode } = useModeStore();
  return mode === 'dm' ? <DmHomePage /> : <DashboardPage />;
}

function UpdateToast() {
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (needRefresh[0]) setVisible(true); }, [needRefresh]);
  if (!visible) return null;
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex items-center justify-between bg-slate-700 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-sm text-slate-200">App updated — reload to apply.</p>
      <div className="flex gap-3 ml-3 shrink-0">
        <button onClick={() => setVisible(false)} className="text-xs text-slate-400 hover:text-slate-200">Later</button>
        <button onClick={() => updateServiceWorker(true)} className="text-xs font-semibold text-amber-400 hover:text-amber-300">Reload</button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { ready, progress, error } = useData();
  if (!ready) return <LoadingScreen progress={progress} error={error} />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Home — player dashboard or DM session view, depending on mode */}
        <Route path="dashboard" element={<HomeRouter />} />

        {/* Compendium hub + sections */}
        <Route path="compendium" element={<CompendiumPage />} />
        <Route path="spells"           element={<SpellListPage />} />
        <Route path="spells/:key"      element={<SpellDetailPage />} />
        <Route path="bestiary"         element={<BestiaryListPage />} />
        <Route path="bestiary/:key"    element={<MonsterDetailPage />} />
        <Route path="items"            element={<ItemListPage />} />
        <Route path="items/:key"       element={<ItemDetailPage />} />
        <Route path="races"            element={<RacesPage />} />
        <Route path="classes"          element={<ClassesPage />} />
        <Route path="backgrounds"      element={<BackgroundsPage />} />
        <Route path="feats"            element={<FeatsPage />} />
        <Route path="conditions"       element={<ConditionsPage />} />

        {/* Characters */}
        <Route path="characters"       element={<CharacterListPage />} />
        <Route path="characters/new"   element={<CharacterWizard />} />
        <Route path="characters/:id"   element={<CharacterSheetPage />} />

        {/* DM mode — NPCs / Settings */}
        <Route path="npcs"           element={<NpcsPage />} />
        <Route path="npcs/:npcId"    element={<NpcDetailPage />} />

        {/* Tools + Settings */}
        <Route path="tools"     element={<ToolsPage />} />
        <Route path="settings"  element={<SettingsPage />} />

        {/* Legacy DM route */}
        <Route path="dm" element={<Navigate to="/dashboard" replace />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AppRoutes />
        <UpdateToast />
      </DataProvider>
    </BrowserRouter>
  );
}
