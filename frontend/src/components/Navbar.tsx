import React, { useState, useRef, useEffect } from 'react';

// Focus trap for mobile drawer
const useFocusTrap = (containerRef: React.RefObject<HTMLDivElement>, active: boolean) => {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const focusableSelectors = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)).filter(el => !el.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    first.focus();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [active, containerRef]);
};
import { NavLink, Link } from 'react-router-dom';
import {
  Heart, Pill, Calendar, Activity, Users, FileScan,
  TrendingUp, Bell, Menu, X, Shield, FileText, ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { currentRole, t, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, mobileMenuOpen);

  // Navigation Links tailored to user role as required in Section 8
  const getNavLinks = () => {
    if (currentRole === 'caretaker') {
      return [
        { to: '/caretaker', label: t('navCaretaker'), icon: ClipboardList },
        { to: '/caretaker/handover', label: 'Handover Logs', icon: FileText },
        { to: '/caretaker/observations', label: 'Observations', icon: Activity },
        { to: '/intelligence', label: t('navIntelligence'), icon: TrendingUp },
        { to: '/notifications', label: t('navNotifications'), icon: Bell },
      ];
    }
    if (currentRole === 'family_member') {
      return [
        { to: '/family', label: t('navFamily'), icon: Users },
        { to: '/health', label: t('navHealth'), icon: Activity },
        { to: '/appointments', label: t('navAppointments'), icon: Calendar },
        { to: '/intelligence', label: t('navIntelligence'), icon: TrendingUp },
        { to: '/notifications', label: t('navNotifications'), icon: Bell },
      ];
    }
    // Elderly (Primary Decision Maker)
    return [
      { to: '/', label: t('navHome'), icon: Heart },
      { to: '/my-medicines', label: t('navMedicines'), icon: Pill },
      { to: '/appointments', label: t('navAppointments'), icon: Calendar },
      { to: '/health', label: t('navHealth'), icon: Activity },
      { to: '/care-circle', label: t('navCareCircle'), icon: Users },
      { to: '/prescription-ocr', label: t('navPrescriptionOCR'), icon: FileScan },
      { to: '/intelligence', label: t('navIntelligence'), icon: TrendingUp },
      { to: '/notifications', label: t('navNotifications'), icon: Bell },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <nav role="navigation" aria-label="Main navigation" className="bg-white dark:bg-navy-900 border-b border-ivory-200 dark:border-navy-800 sticky top-0 z-40 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-careteal-700 to-careteal-500 flex items-center justify-center text-white shadow-md shadow-careteal-500/20 group-hover:scale-105 transition-transform">
              <Heart className="w-7 h-7 fill-white/20" />
            </div>
            <div>
              <span className="text-2xl font-black text-navy-800 dark:text-white tracking-tight">
                Care<span className="text-careteal-600">Circle</span>
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Elderly Healthcare Ecosystem
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-careteal-50 dark:bg-navy-800 text-careteal-700 dark:text-careteal-400 font-bold border border-careteal-200/60 dark:border-navy-700'
                        : 'text-slate-600 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Active Profile Pill */}
          <div className="hidden md:flex items-center gap-3 bg-ivory-100 dark:bg-navy-800 border border-ivory-300 dark:border-navy-700 rounded-2xl px-4 py-2">
            <div className="w-9 h-9 rounded-xl bg-careteal-100 dark:bg-careteal-900/50 text-careteal-700 dark:text-careteal-300 flex items-center justify-center font-bold text-sm">
              {user?.full_name ? user.full_name.charAt(0) : 'M'}
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-navy-800 dark:text-white leading-tight">
                {user?.full_name || 'Margaret Sharma'}
              </div>
              <div className="text-[11px] font-semibold text-careteal-700 dark:text-careteal-400 capitalize">
                {currentRole === 'elderly' ? 'Primary Account Holder' : currentRole.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="xl:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-navy-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white dark:bg-navy-900 border-b border-slate-200 px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold ${
                    isActive
                      ? 'bg-careteal-600 text-white'
                      : 'text-navy-800 dark:text-slate-200 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </nav>
  );
};
