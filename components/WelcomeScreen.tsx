import { Wifi, Monitor, MessageSquare, Zap } from 'lucide-react';

export default function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center flex-col bg-surface-900">
      <div className="animate-fade-in flex flex-col items-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-accent-500/10 flex items-center justify-center mb-6">
          <Wifi className="text-accent-400" size={40} />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white">OfflineConnect</h1>
        <p className="text-slate-400 mt-2">LAN Chat &amp; Presence System</p>

        {/* Divider */}
        <div className="w-16 h-0.5 bg-surface-600 rounded my-6" />

        {/* Instruction Cards */}
        <div className="flex flex-col gap-3 max-w-xs w-full">
          <div className="flex items-center gap-3 bg-surface-800 rounded-xl p-4 border border-surface-600">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
              <Monitor className="text-accent-400" size={20} />
            </div>
            <p className="text-sm text-slate-300">
              Devices are discovered automatically via UDP broadcast
            </p>
          </div>

          <div className="flex items-center gap-3 bg-surface-800 rounded-xl p-4 border border-surface-600">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
              <MessageSquare className="text-accent-400" size={20} />
            </div>
            <p className="text-sm text-slate-300">
              Select a device to start chatting over TCP
            </p>
          </div>

          <div className="flex items-center gap-3 bg-surface-800 rounded-xl p-4 border border-surface-600">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
              <Zap className="text-accent-400" size={20} />
            </div>
            <p className="text-sm text-slate-300">
              No internet required — works on any local network
            </p>
          </div>
        </div>

        {/* Bottom Note */}
        <p className="mt-8 text-xs text-slate-600">
          Select a device from the sidebar to begin
        </p>
      </div>
    </div>
  );
}
