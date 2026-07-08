import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Plus, Pencil, Trash2, X, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { EMPTY_CATEGORY } from "./shared";

export function CategoriesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgFileRef = useRef();

  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get("/categories").then(r => r.data),
    retry: false,
  });

  const { mutate: saveCategory, isPending: saving } = useMutation({
    mutationFn: (payload) => editId
      ? api.put(`/admin/categories/${editId}`, payload)
      : api.post("/admin/categories", payload),
    onSuccess: () => {
      toast.success(editId ? "Category updated" : "Category created");
      setShowForm(false); setEditId(null); setForm(EMPTY_CATEGORY);
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to save category"),
  });

  const { mutate: deleteCategory, variables: delVar } = useMutation({
    mutationFn: (id) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => { toast.success("Category deleted"); setDeleteConfirm(null); qc.invalidateQueries({ queryKey: ["admin-categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: () => toast.error("Failed to delete category"),
  });

  function openAdd() { setEditId(null); setForm(EMPTY_CATEGORY); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openEdit(c) { setEditId(c.id); setForm({ id: c.id, label: c.label || "", img: c.img || "" }); setShowForm(true); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.label || !form.img) { toast.error("Label and image are required"); return; }
    if (!editId && !form.id) { toast.error("Category ID (slug) is required"); return; }
    const payload = editId
      ? { label: form.label, img: form.img }
      : { id: form.id.toLowerCase().replace(/\s+/g, "-"), label: form.label, img: form.img };
    saveCategory(payload);
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
        <p className="text-sm text-taupe">{categories.length} categories</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe"><RefreshCw className="w-3 h-3" /> Refresh</Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5 rounded-full bg-espresso text-ivory text-xs h-8 px-4"><Plus className="w-3.5 h-3.5" /> Add Category</Button>
        </div>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
            <form onSubmit={handleSubmit} className="bg-pearl border border-gold/20 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
              <h3 className="col-span-2 md:col-span-3 font-medium text-espresso text-sm mb-1">{editId ? "Edit Category" : "New Category"}</h3>
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
              {!editId && (
                <div>
                  <label className="text-[11px] text-taupe block mb-1">ID (slug)</label>
                  <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="e.g. skincare"
                    className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
              )}
              <div className={editId ? "col-span-2" : ""}>
                <label className="text-[11px] text-taupe block mb-1">Display Label</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Skincare"
                  className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div className="col-span-2 md:col-span-3 flex gap-2 pt-1">
                <Button type="submit" disabled={saving} className="rounded-full bg-espresso text-ivory px-6 text-sm h-9">{saving ? "Saving…" : editId ? "Update Category" : "Create Category"}</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_CATEGORY); }} className="rounded-full text-taupe text-sm h-9">Cancel</Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {isLoading ? <p className="text-taupe text-sm py-8 text-center">Loading categories…</p>
        : categories.length === 0 ? <p className="text-taupe text-sm py-8 text-center">No categories yet. Add one above.</p>
        : (
          <div className="overflow-x-auto rounded-xl border border-stone-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
                <tr>
                  <th className="px-4 py-3 w-14">Img</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {categories.map(c => (
                  <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3"><img src={c.img} alt={c.label} className="w-10 h-10 rounded-lg object-cover border border-gold/10" /></td>
                    <td className="px-4 py-3 text-taupe text-xs font-mono">{c.id}</td>
                    <td className="px-4 py-3 font-medium text-espresso">{c.label}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} className="h-8 w-8 rounded-lg hover:bg-rosemist/60"><Pencil className="w-3.5 h-3.5 text-taupe" /></Button>
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" disabled={delVar === c.id} onClick={() => deleteCategory(c.id)} className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100"><Check className="w-3.5 h-3.5 text-red-600" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(null)} className="h-8 w-8 rounded-lg"><X className="w-3.5 h-3.5 text-taupe" /></Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(c.id)} className="h-8 w-8 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
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

