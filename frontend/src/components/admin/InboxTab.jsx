import { useState } from "react";
import { ClipboardList, Bug, Sparkles } from "lucide-react";
import { ApplicationsTab } from "./ApplicationsTab";
import { BugReportsTab } from "./BugReportsTab";
import { FeatureRequestsTab } from "./FeatureRequestsTab";

export function InboxTab() {
  const [sub, setSub] = useState("applications");
  const SUBS = [
    { id: "applications", label: "Beautician Applications", Icon: ClipboardList },
    { id: "bugs",         label: "Bug Reports",              Icon: Bug },
    { id: "features",     label: "Feature Requests",         Icon: Sparkles },
  ];
  return (
    <div>
      <div className="flex gap-1 mb-5 bg-stone-50 rounded-xl p-1 border border-stone-100">
        {SUBS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setSub(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              sub === id ? "bg-white shadow-sm text-espresso" : "text-taupe hover:text-espresso"
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
      {sub === "applications" && <ApplicationsTab />}
      {sub === "bugs"         && <BugReportsTab />}
      {sub === "features"     && <FeatureRequestsTab />}
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
