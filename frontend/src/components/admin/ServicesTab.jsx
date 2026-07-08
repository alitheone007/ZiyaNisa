import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Plus, Pencil, Trash2, X, Check, Loader2, Upload, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { EMPTY_SERVICE, SERVICE_LEVELS } from "./shared";

export function ServicesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgFileRef = useRef();

  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => api.get("/services").then(r => r.data),
    retry: false,
  });

  const { mutate: saveService, isPending: saving } = useMutation({
    mutationFn: (payload) => editId
      ? api.put(`/admin/services/${editId}`, payload)
      : api.post("/admin/services", payload),
    onSuccess: () => {
      toast.success(editId ? "Service updated" : "Service created");
      setShowForm(false); setEditId(null); setForm(EMPTY_SERVICE);
      qc.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: () => toast.error("Failed to save service"),
  });

  const { mutate: deleteService, variables: delVar } = useMutation({
    mutationFn: (id) => api.delete(`/admin/services/${id}`),
    onSuccess: () => { toast.success("Service deleted"); setDeleteConfirm(null); qc.invalidateQueries({ queryKey: ["admin-services"] }); },
    onError: () => toast.error("Failed to delete service"),
  });

  function openAdd() { setEditId(null); setForm(EMPTY_SERVICE); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openEdit(s) {
    setEditId(s.id);
    setForm({ name: s.name || "", duration: s.duration || "60 min", price: String(s.price || ""), img: s.img || "", level: s.level || "Trained", tag: s.tag || "" });
    setShowForm(true);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.price || !form.img) { toast.error("Name, price and image are required"); return; }
    saveService({ name: form.name, duration: form.duration, price: parseInt(form.price, 10), img: form.img, level: form.level, tag: form.tag });
  }
  async function handleImgUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: res } = await api.post("/admin/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, img: res.url }));
      toast.success("Image uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingImg(false); e.target.value = ""; }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-taupe">{services.length} services</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe"><RefreshCw className="w-3 h-3" /> Refresh</Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5 rounded-full bg-espresso text-ivory text-xs h-8 px-4"><Plus className="w-3.5 h-3.5" /> Add Service</Button>
        </div>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
            <form onSubmit={handleSubmit} className="bg-pearl border border-gold/20 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
              <h3 className="col-span-2 md:col-span-3 font-medium text-espresso text-sm mb-1">{editId ? "Edit Service" : "New Service"}</h3>
              <div className="col-span-2 md:col-span-3">
                <label className="text-[11px] text-taupe block mb-1">Image</label>
                <div className="flex gap-2 items-center">
                  <input type="text" value={form.img} onChange={e => setForm(f => ({ ...f, img: e.target.value }))} placeholder="Paste image URL  —  or upload →"
                    className="flex-1 h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
                  <button type="button" onClick={() => imgFileRef.current?.click()} disabled={uploadingImg}
                    className="h-9 px-3 rounded-lg border border-stone-200 text-xs text-taupe flex items-center gap-1.5 hover:border-gold hover:text-espresso transition-colors disabled:opacity-50 shrink-0">
                    {uploadingImg ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</> : <><Upload className="w-3.5 h-3.5" />Upload</>}
                  </button>
                  <input ref={imgFileRef} type="file" accept="image/*" className="sr-only" onChange={handleImgUpload} />
                  {form.img && <img src={form.img} alt="preview" className="w-9 h-9 rounded-lg object-cover border border-stone-200 shrink-0" />}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-taupe block mb-1">Service Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div>
                <label className="text-[11px] text-taupe block mb-1">Duration</label>
                <input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 60 min"
                  className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div>
                <label className="text-[11px] text-taupe block mb-1">Price (₹)</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div>
                <label className="text-[11px] text-taupe block mb-1">Level</label>
                <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold">
                  {SERVICE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-taupe block mb-1">Tag</label>
                <input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. K-Glow, Best Seller"
                  className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div className="col-span-2 md:col-span-3 flex gap-2 pt-1">
                <Button type="submit" disabled={saving} className="rounded-full bg-espresso text-ivory px-6 text-sm h-9">{saving ? "Saving…" : editId ? "Update Service" : "Create Service"}</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_SERVICE); }} className="rounded-full text-taupe text-sm h-9">Cancel</Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {isLoading ? <p className="text-taupe text-sm py-8 text-center">Loading services…</p>
        : services.length === 0 ? <p className="text-taupe text-sm py-8 text-center">No services yet. Add one above.</p>
        : (
          <div className="overflow-x-auto rounded-xl border border-stone-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
                <tr>
                  <th className="px-4 py-3 w-14">Img</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3"><img src={s.img} alt={s.name} className="w-10 h-10 rounded-lg object-cover border border-gold/10" /></td>
                    <td className="px-4 py-3 font-medium text-espresso max-w-[200px] truncate">{s.name}</td>
                    <td className="px-4 py-3 text-taupe text-xs">{s.duration}</td>
                    <td className="px-4 py-3 font-medium">₹{s.price?.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-taupe text-xs">{s.level}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)} className="h-8 w-8 rounded-lg hover:bg-rosemist/60"><Pencil className="w-3.5 h-3.5 text-taupe" /></Button>
                        {deleteConfirm === s.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" disabled={delVar === s.id} onClick={() => deleteService(s.id)} className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100"><Check className="w-3.5 h-3.5 text-red-600" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(null)} className="h-8 w-8 rounded-lg"><X className="w-3.5 h-3.5 text-taupe" /></Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(s.id)} className="h-8 w-8 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

// ── Categories Tab ────────────────────────────────────────────────────────────
