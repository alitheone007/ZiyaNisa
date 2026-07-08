import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Users, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, MapPin, Star, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { EMPTY_B, HYD_AREAS_ADMIN, SKILL_MAP } from "./shared";

export function BeauticiansTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_B);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-beauticians"],
    queryFn: () => api.get("/admin/beauticians").then(r => r.data),
    retry: false,
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload) => editId
      ? api.put(`/admin/beauticians/${editId}`, payload)
      : api.post("/admin/beauticians", payload),
    onSuccess: () => {
      toast.success(editId ? "Beautician updated" : "Beautician added");
      setShowForm(false); setEditId(null); setForm(EMPTY_B);
      qc.invalidateQueries({ queryKey: ["admin-beauticians"] });
    },
    onError: () => toast.error("Failed to save beautician"),
  });

  const { mutate: remove, variables: delVar } = useMutation({
    mutationFn: (id) => api.delete(`/admin/beauticians/${id}`),
    onSuccess: () => {
      toast.success("Beautician removed");
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["admin-beauticians"] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const { mutate: toggleDuty, variables: dutyVar } = useMutation({
    mutationFn: ({ id, on_duty }) => api.patch(`/admin/beauticians/${id}/duty`, { on_duty }),
    onSuccess: (_, { on_duty }) => {
      toast.success(on_duty ? "Marked On Duty" : "Marked Off Duty");
      qc.invalidateQueries({ queryKey: ["admin-beauticians"] });
    },
    onError: () => toast.error("Failed to toggle duty"),
  });

  function openEdit(b) {
    setEditId(b.id);
    setForm({
      name: b.name || "", photo: b.photo || "", phone: b.phone || "",
      lat: String(b.lat || ""), lng: String(b.lng || ""), area: b.area || "Banjara Hills",
      skills: b.skills || [], rating: String(b.rating || "5.0"), active: b.active !== false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSkill(sk) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(sk) ? f.skills.filter(s => s !== sk) : [...f.skills, sk],
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.area) {
      toast.error("Name, phone and area are required"); return;
    }
    save({
      name: form.name, photo: form.photo || null,
      phone: form.phone, lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0, area: form.area,
      skills: form.skills, rating: parseFloat(form.rating) || 5.0,
      active: form.active,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-taupe">{items.length} beauticians</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditId(null); setForm(EMPTY_B); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="gap-1.5 rounded-full bg-espresso text-ivory text-xs h-8 px-4">
            <Plus className="w-3.5 h-3.5" /> Add Beautician
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
            <form onSubmit={handleSubmit}
              className="bg-pearl border border-gold/20 rounded-2xl p-5 space-y-4">
              <h3 className="font-medium text-espresso text-sm">
                {editId ? "Edit Beautician" : "Add Beautician"}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: "name",   label: "Full Name *",    span: "col-span-2 md:col-span-1" },
                  { key: "phone",  label: "Phone *",         type: "tel" },
                  { key: "photo",  label: "Photo URL",       span: "col-span-2 md:col-span-1" },
                  { key: "rating", label: "Rating (0–5)",    type: "number" },
                  { key: "lat",    label: "Latitude",         type: "number" },
                  { key: "lng",    label: "Longitude",        type: "number" },
                ].map(({ key, label, type = "text", span = "" }) => (
                  <div key={key} className={span}>
                    <label className="text-[11px] text-taupe block mb-1">{label}</label>
                    <input type={type} step="any" value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
                  </div>
                ))}
                <div>
                  <label className="text-[11px] text-taupe block mb-1">Area *</label>
                  <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold">
                    {HYD_AREAS_ADMIN.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-taupe block mb-2">Services offered</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SKILL_MAP).map(([id, name]) => (
                    <button key={id} type="button" onClick={() => toggleSkill(id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        form.skills.includes(id)
                          ? "border-espresso bg-espresso text-ivory"
                          : "border-gold/20 bg-white text-taupe hover:border-gold/40"
                      }`}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className="flex items-center gap-2 text-sm text-espresso select-none">
                  {form.active
                    ? <ToggleRight className="w-7 h-7 text-green-600" />
                    : <ToggleLeft className="w-7 h-7 text-taupe" />}
                  {form.active ? "Active" : "Inactive"}
                </button>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}
                  className="rounded-full bg-espresso text-ivory px-6 text-sm h-9">
                  {saving ? "Saving…" : editId ? "Update" : "Add Beautician"}
                </Button>
                <Button type="button" variant="ghost"
                  onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_B); }}
                  className="rounded-full text-taupe text-sm h-9">Cancel</Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <p className="text-taupe text-sm py-8 text-center">Loading beauticians…</p>
      ) : items.length === 0 ? (
        <p className="text-taupe text-sm py-8 text-center">No beauticians yet. Add one above.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
              <tr>
                <th className="px-4 py-3 w-12">Photo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Skills</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Duty</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map(b => {
                const isDeleting = delVar === b.id;
                return (
                  <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      {b.photo
                        ? <img src={b.photo} alt={b.name} className="w-9 h-9 rounded-full object-cover border border-gold/15" />
                        : <div className="w-9 h-9 rounded-full bg-rosemist/50 grid place-items-center"><Users className="w-4 h-4 text-taupe" /></div>
                      }
                    </td>
                    <td className="px-4 py-3 font-medium text-espresso">{b.name}</td>
                    <td className="px-4 py-3 text-xs text-taupe">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.area}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-taupe">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="flex items-center gap-1 text-gold font-medium">
                        <Star className="w-3 h-3 fill-gold" />{b.rating}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(b.skills || []).map(sk => (
                          <span key={sk} className="text-[10px] bg-rosemist/60 text-taupe px-1.5 py-0.5 rounded-full">
                            {SKILL_MAP[sk] || sk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.active !== false ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                        {b.active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={dutyVar?.id === b.id}
                        onClick={() => toggleDuty({ id: b.id, on_duty: b.on_duty === false })}
                        className="flex items-center gap-1 text-xs disabled:opacity-50">
                        {b.on_duty !== false
                          ? <><ToggleRight className="w-5 h-5 text-blue-500" /><span className="text-blue-600">On Duty</span></>
                          : <><ToggleLeft className="w-5 h-5 text-taupe" /><span className="text-taupe">Off Duty</span></>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}
                          className="h-8 w-8 rounded-lg hover:bg-rosemist/60">
                          <Pencil className="w-3.5 h-3.5 text-taupe" />
                        </Button>
                        {deleteConfirm === b.id ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" disabled={isDeleting}
                              onClick={() => remove(b.id)}
                              className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100">
                              <Check className="w-3.5 h-3.5 text-red-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(null)}
                              className="h-8 w-8 rounded-lg">
                              <X className="w-3.5 h-3.5 text-taupe" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(b.id)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Applications Tab ──────────────────────────────────────────────────────────
