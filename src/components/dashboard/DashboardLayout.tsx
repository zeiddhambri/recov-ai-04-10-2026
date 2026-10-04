import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { GlobalSearchDialog } from '@/components/common/GlobalSearchDialog';
import { DEMO_MODE_ALLOWED } from '@/contexts/AuthContext';

export default function DashboardLayout() {
  return (
    <div className="flex bg-mist dark:bg-slate-950 text-foreground min-h-screen transition-colors duration-200">
      {DEMO_MODE_ALLOWED && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-[11px] font-bold uppercase tracking-wider text-center py-1">
          ⚠ Environnement de démonstration — données 100 % synthétiques — aucune donnée client réelle ne doit être saisie
        </div>
      )}
      <GlobalSearchDialog />
      <AppSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
