import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityBar } from './components/AccessibilityBar';
import { Navbar } from './components/Navbar';
import { ElderlyDashboard } from './pages/ElderlyDashboard';
import { MedicinesPage } from './pages/MedicinesPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { CareNetworkPage } from './pages/CareNetworkPage';
import { PrescriptionOCRPage } from './pages/PrescriptionOCRPage';
import { CareIntelligencePage } from './pages/CareIntelligencePage';
import { HealthContinuityPage } from './pages/HealthContinuityPage';
import { CaretakerDashboard } from './pages/CaretakerDashboard';
import { FamilyDashboard } from './pages/FamilyDashboard';
import { NotificationsPage } from './pages/NotificationsPage';
import { Heart, ShieldCheck } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentRole } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-ivory-100 dark:bg-navy-900 text-navy-800 dark:text-white transition-colors">
      <AccessibilityBar />
      <Navbar />
      <main id="main" className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<ElderlyDashboard />} />
          <Route path="/my-medicines" element={<MedicinesPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/care-circle" element={<CareNetworkPage />} />
          <Route path="/prescription-ocr" element={<PrescriptionOCRPage />} />
          <Route path="/intelligence" element={<CareIntelligencePage />} />
          <Route path="/health" element={<HealthContinuityPage />} />
          <Route path="/caretaker" element={<CaretakerDashboard />} />
          <Route path="/caretaker/handover" element={<CaretakerDashboard />} />
          <Route path="/caretaker/observations" element={<CaretakerDashboard />} />
          <Route path="/family" element={<FamilyDashboard />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Trust & Ethics Healthcare Footer */}
      <footer className="bg-white dark:bg-navy-950 border-t border-ivory-200 dark:border-navy-800 py-8 px-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-navy-800 dark:text-white">
            <Heart className="w-4 h-4 text-careteal-600 fill-careteal-600" />
            <span>CareCircle • Elderly Care & Medication Management Platform</span>
          </div>
          <div className="text-slate-400">
            <em>"Independence first. Assistance when needed. Intervention when necessary."</em>
          </div>
          <div className="text-[11px] text-slate-400">
            Hackathon Demonstration Edition • Multi-Role Access Control & Care Intelligence
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
