import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { EMPTY_FORM, Pagination } from "./shared";

export function ProductsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgFileRef = useRef();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-products", page],
    queryFn: () => api.get(`/products?limit=12&page=${page}`).then(r => r.data),
    retry: false,
  });

  const { mutate: saveProduct, isPending: saving } = useMutation({
    mutationFn: (payload) => editId
      ? api.put(`/admin/products/${editId}`, payload)
      : api.post("/admin/products", payload),
    onSuccess: () => {
      toast.success(editId ? "Product updated" : "Product created");
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products-featured"] });
    },
    onError: () => toast.error("Failed to save product"),
  });

  const { mutate: deleteProduct, variables: delVar } = useMutation({
    mutationFn: (id) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const { mutate: toggleStock, variables: stockVar } = useMutation({
    mutationFn: ({ id, in_stock }) => api.patch(`/admin/products/${id}/stock`, { in_stock }),
    onSuccess: (_, { in_stock }) => {
      toast.success(in_stock ? "Marked in stock" : "Marked out of stock");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Failed to toggle stock"),
  });

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(p) {
    setEditId(p.id);
    setForm({
      name: p.name || "",
      brand: p.brand || "",
      price: String(p.price || ""),
      mrp: String(p.mrp || ""),
      img: p.img || "",
      category_id: p.category_id || "",
      actives: (p.actives || []).join(", "),
      badges: (p.badges || []).join(", "),
      in_stock: p.in_stock !== false,
    });
    setShowForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.brand || !form.price || !form.img) {
      toast.error("Name, brand, price and image URL are required");
      return;
    }
    saveProduct({
      name: form.name,
      brand: form.brand,
      price: parseInt(form.price, 10),
      mrp: parseInt(form.mrp || form.price, 10),
      img: form.img,
      category_id: form.category_id || null,
      actives: form.actives.split(",").map(s => s.trim()).filter(Boolean),
      badges: form.badges.split(",").map(s => s.trim()).filter(Boolean),
      in_stock: form.in_stock,
    });
  }

  async function handleImgUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: res } = await api.post("/admin/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(f => ({ ...f, img: res.url }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  }

  const products = data?.items || [];
  const FIELDS = [
    { key: "name",        label: "Product Name",              span: "col-span-2 md:col-span-2" },
    { key: "brand",       label: "Brand" },
    { key: "price",       label: "Price (₹)",                 type: "number" },
    { key: "mrp",         label: "MRP (₹)",                   type: "number" },
    { key: "category_id", label: "Category ID" },
    { key: "actives",     label: "Actives (comma-separated)", span: "col-span-2" },
    { key: "badges",      label: "Badges (comma-separated)",  span: "col-span-2 md:col-span-1" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-taupe">{data?.total || 0} products</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd}
            className="gap-1.5 rounded-full bg-espresso text-ivory text-xs h-8 px-4">
            <Plus className="w-3.5 h-3.5" /> Add Product
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <form onSubmit={handleSubmit}
              className="bg-pearl border border-gold/20 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
              <h3 className="col-span-2 md:col-span-3 font-medium text-espresso text-sm mb-1">
                {editId ? "Edit Product" : "New Product"}
              </h3>

              {/* Image — URL input + Drive upload button */}
              <div className="col-span-2 md:col-span-3">
                <label className="text-[11px] text-taupe block mb-1">Image</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={form.img}
                    onChange={e => setForm(f => ({ ...f, img: e.target.value }))}
                    placeholder="Paste image URL  —  or upload →"
                    className="flex-1 h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  <button type="button" onClick={() => imgFileRef.current?.click()}
                    disabled={uploadingImg}
                    className="h-9 px-3 rounded-lg border border-stone-200 text-xs text-taupe flex items-center gap-1.5 hover:border-gold hover:text-espresso transition-colors disabled:opacity-50 shrink-0">
                    {uploadingImg
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</>
                      : <><Upload className="w-3.5 h-3.5" />Upload</>}
                  </button>
                  <input ref={imgFileRef} type="file" accept="image/*" className="sr-only"
                    onChange={handleImgUpload} />
                  {form.img && (
                    <img src={form.img} alt="preview"
                      className="w-9 h-9 rounded-lg object-cover border border-stone-200 shrink-0" />
                  )}
                </div>
              </div>

              {FIELDS.map(({ key, label, span = "", type = "text" }) => (
                <div key={key} className={span}>
                  <label className="text-[11px] text-taupe block mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, in_stock: !f.in_stock }))}
                  className="flex items-center gap-2 text-sm text-espresso select-none">
                  {form.in_stock
                    ? <ToggleRight className="w-7 h-7 text-green-600" />
                    : <ToggleLeft className="w-7 h-7 text-taupe" />}
                  In Stock
                </button>
              </div>
              <div className="col-span-2 md:col-span-3 flex gap-2 pt-1">
                <Button type="submit" disabled={saving}
                  className="rounded-full bg-espresso text-ivory px-6 text-sm h-9">
                  {saving ? "Saving…" : editId ? "Update Product" : "Create Product"}
                </Button>
                <Button type="button" variant="ghost"
                  onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }}
                  className="rounded-full text-taupe text-sm h-9">
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <p className="text-taupe text-sm py-8 text-center">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="text-taupe text-sm py-8 text-center">No products in DB yet. Add one above.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
              <tr>
                <th className="px-4 py-3 w-14">Img</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map(p => {
                const isTogglingStock = stockVar?.id === p.id;
                const isDeleting = delVar === p.id;
                return (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <img src={p.img} alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border border-gold/10" />
                    </td>
                    <td className="px-4 py-3 font-medium text-espresso max-w-[180px] truncate">{p.name}</td>
                    <td className="px-4 py-3 text-taupe text-xs">{p.brand}</td>
                    <td className="px-4 py-3 font-medium">₹{p.price?.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => !isTogglingStock && toggleStock({ id: p.id, in_stock: p.in_stock === false })}
                        className="flex items-center gap-1 text-xs">
                        {p.in_stock !== false
                          ? <><ToggleRight className="w-5 h-5 text-green-600" /><span className="text-green-600">In Stock</span></>
                          : <><ToggleLeft className="w-5 h-5 text-taupe" /><span className="text-taupe">Out of Stock</span></>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}
                          className="h-8 w-8 rounded-lg hover:bg-rosemist/60">
                          <Pencil className="w-3.5 h-3.5 text-taupe" />
                        </Button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" disabled={isDeleting}
                              onClick={() => deleteProduct(p.id)}
                              className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100">
                              <Check className="w-3.5 h-3.5 text-red-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(null)}
                              className="h-8 w-8 rounded-lg">
                              <X className="w-3.5 h-3.5 text-taupe" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(p.id)}
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
      <Pagination page={page} totalPages={data?.total_pages || 1} onPage={setPage} />
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
