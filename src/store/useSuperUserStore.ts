"use client";
import { create } from "zustand";

export type SuperUserState = {
  enabled: boolean;
  pass: string | null;
  enable: (password: string) => Promise<boolean>;
  disable: () => void;
};

export const useSuperUserStore = create<SuperUserState>((set) => ({
  enabled: typeof window !== "undefined" && localStorage.getItem("superuser") === "true",
  pass: typeof window !== "undefined" ? localStorage.getItem("superuser-pass") : null,

  enable: async (password: string) => {
    try {
      const res = await fetch("/api/superuser/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (data.ok) {
        set({ enabled: true, pass: password });
        localStorage.setItem("superuser", "true");
        localStorage.setItem("superuser-pass", password);
        return true;
      } else {
        set({ enabled: false, pass: null });
        localStorage.removeItem("superuser");
        localStorage.removeItem("superuser-pass");
        return false;
      }
    } catch (err) {
      console.error("SuperUser verification failed:", err);
      set({ enabled: false });
      return false;
    }
  },

  disable: () => {
    set({ enabled: false, pass: null });
    localStorage.removeItem("superuser");
    localStorage.removeItem("superuser-pass");
  },
}));
