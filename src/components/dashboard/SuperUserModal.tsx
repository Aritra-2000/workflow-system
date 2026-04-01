"use client";
import { useState } from "react";
import { X, ShieldAlert, Lock, CheckCircle2 } from "lucide-react";
import { useSuperUserStore } from "@/store/useSuperUserStore";
import { toast } from "react-hot-toast";

interface SuperUserModalProps {
  onClose: () => void;
}

export default function SuperUserModal({ onClose }: SuperUserModalProps) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const enableSuperUser = useSuperUserStore((state) => state.enable);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    try {
      setIsVerifying(true);
      const success = await enableSuperUser(password);
      if (success) {
        toast.success("Admin mode activated!");
        onClose();
      } else {
        toast.error("Invalid admin password");
      }
    } catch (err) {
      toast.error("Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-indigo-500/20">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Admin Access</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Enter the secret key to unlock elevated privileges</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                Security Key
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-100/50 transition-all outline-none text-sm font-bold tracking-widest"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !password}
                className="flex-[1.5] px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/50 transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verify
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Warning */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Warning: Elevated actions will be logged</span>
        </div>
      </div>
    </div>
  );
}
