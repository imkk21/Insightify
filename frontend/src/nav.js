import {
  LayoutDashboard, Activity, Radar, ShieldCheck, Bot, Waves, BadgeCheck, Radio, Users, FileText, Timer, Code2, Settings,
} from 'lucide-react';

// Single source of truth for the sidebar and the ⌘K palette.
export const NAV_GROUPS = [
  { label: 'Overview', items: [
    { label: 'Today', to: '/', icon: LayoutDashboard, end: true },
  ] },
  { label: 'Engineering', items: [
    { label: 'Activity', to: '/activity', icon: Activity },
    { label: 'Codebase X-ray', to: '/codebase', icon: Radar },
    { label: 'Security', to: '/security', icon: ShieldCheck },
    { label: 'Autopilot', to: '/autopilot', icon: Bot },
  ] },
  { label: 'You', items: [
    { label: 'Flow & wellbeing', to: '/flow', icon: Waves },
    { label: 'Proof of skill', to: '/skills', icon: BadgeCheck },
    { label: 'Morning briefing', to: '/briefing', icon: Radio },
  ] },
  { label: 'Together', items: [
    { label: 'Rooms & challenges', to: '/rooms', icon: Users },
  ] },
  { label: 'Workspace', items: [
    { label: 'Reports', to: '/reports', icon: FileText },
    { label: 'Focus', to: '/focus', icon: Timer },
    { label: 'Assistant', to: '/assistant', icon: Code2 },
  ] },
];

export const SETTINGS_ITEM = { label: 'Settings', to: '/settings', icon: Settings };
export const ALL_NAV = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];
