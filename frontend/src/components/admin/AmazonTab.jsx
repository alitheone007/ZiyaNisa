import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Sparkles, FileSpreadsheet, Trash2, Download, Cloud, Image as ImageIcon,
  ChevronDown, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

const SLOTS = ["MAIN", "OTHER1", "OTHER2", "OTHER3", "OTHER4", "OTHER5", "OTHER6", "OTHER7", "OTHER8", "SWATCH"];
const ITEM_TYPES = ["saree", "dress_material", "lehenga", "kurti", "blouse", "dupatta", "other"];

const QA_BADGE = {
  pass:          { label: "Pass",   cls: "text-green-700 bg-green-50 border-green-200" },
  manual_review: { label: "Review", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  fail:          { label: "Fail",   cls: "text-red-600 bg-red-50 border-red-200" },
};

const RESULT_ICON = {
  pass:          { Icon: CheckCircle2,  cls: "text-green-600" },
  upgraded:      { Icon: RefreshCw,     cls: "text-blue-600" },
  duplicate:     { Icon: AlertTriangle, cls: "text-amber-500" },
  manual_review: { Icon: AlertTriangle, cls: "text-amber-600" },
  fail:          { Icon: XCircle,       cls: "text-red-500" },
  unreadable:    { Icon: XCircle,       cls: "text-red-500" },
};

export default function AmazonTab() {
  const [sub, setSub] = useState("intake");
  const { data: status } = useQuery({
    queryKey: ["az-status"],
    queryFn: () => api.get("/admin/amazon/status").then(r => r.data),
  });

  const pills = [
    { id: "intake",  label: "Intake" },
    { id: "review",  label: `Review${status?.need_input ? ` (${status.need_input})` : ""}` },
    { id: "export",  label: "Export" },
    { id: "batches", label: "Batches" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-1.5 bg-rosemist/40 rounded-full p-1">
          {pills.map(p => (
            <button key={p.id} onClick={() => setSub(p.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                sub === p.id ? "bg-espresso text-ivory shadow-sm" : "text-taupe hover:text-espresso"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        {status && (
          <div className="flex gap-2 text-[11px]">
            <span className={`px-2.5 py-1 rounded-full border ${(status.gemini_key_set || status.anthropic_key_set) ? "text-green-700 border-green-200 bg-green-50" : "text-taupe border-gold/20 bg-pearl"}`}>
              AI {status.gemini_key_set ? "ready (Gemini)" : status.anthropic_key_set ? "ready (Claude)" : "no key"}
            </span>
            <span className={`px-2.5 py-1 rounded-full border ${status.drive_configured ? "text-green-700 border-green-200 bg-green-50" : "text-taupe border-gold/20 bg-pearl"}`}>
              Drive {status.drive_configured ? "connected" : "not set up"}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {sub === "intake"  && <Fade key="intake"><IntakePanel /></Fade>}
        {sub === "review"  && <Fade key="review"><ReviewPanel status={status} /></Fade>}
        {sub === "export"  && <Fade key="export"><ExportPanel /></Fade>}
        {sub === "batches" && <Fade key="batches"><BatchesPanel status={status} /></Fade>}
      </AnimatePresence>
    </div>
  );
}

function Fade({ children }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {children}
    </motion.div>
  );
}

/* ── Intake: drag-drop upload + Drive sync ─────────────────────────────────── */
function IntakePanel() {
  const qc = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [driveFolder, setDriveFolder] = useState("");
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef();

  async function uploadFiles(fileList) {
    const files = [...fileList].filter(f => f.type.startsWith("image/"));
    if (!files.length) { toast.error("No image files found"); return; }
    setUploading(true);
    setResults(null);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      const { data } = await api.post("/admin/amazon/images", fd, { timeout: 300000 });
      setResults(data);
      const s = data.summary;
      toast.success(`Batch ${data.batch_date}: ${s.pass || 0} passed, ${s.manual_review || 0} for review, ${s.fail || 0} failed, ${(s.duplicate || 0) + (s.upgraded || 0)} duplicates`);
      qc.invalidateQueries({ queryKey: ["az-status"] });
      qc.invalidateQueries({ queryKey: ["az-images"] });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function driveSync() {
    if (!driveFolder.trim()) { toast.error("Paste the Drive folder link or ID"); return; }
    setSyncing(true);
    setResults(null);
    try {
      const { data } = await api.post("/admin/amazon/drive-sync", { folder: driveFolder.trim() }, { timeout: 600000 });
      setResults(data);
      if (data.note) toast(data.note, { duration: 8000 });
      else {
        const s = data.summary;
        toast.success(`Drive sync: ${s.pass || 0} passed, ${s.manual_review || 0} review, ${s.fail || 0} failed, ${(s.duplicate || 0) + (s.upgraded || 0)} dup`);
      }
      qc.invalidateQueries({ queryKey: ["az-status"] });
      qc.invalidateQueries({ queryKey: ["az-images"] });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Drive sync failed", { duration: 8000 });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center h-44 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
          dragOver ? "border-gold bg-gold/10" : "border-gold/30 bg-pearl hover:border-gold/60"
        }`}>
        {uploading ? (
          <><Loader2 className="w-7 h-7 text-gold animate-spin mb-2" />
            <p className="text-sm text-taupe">Running QA + dedupe on the server…</p></>
        ) : (
          <><Upload className="w-7 h-7 text-taupe mb-2" />
            <p className="text-sm font-medium text-espresso">Drop saree / suit images here, or tap to browse</p>
            <p className="text-xs text-taupe mt-1">WhatsApp & supplier photos welcome — QA, dedupe and registration are automatic</p></>
        )}
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Drive sync */}
      <div className="bg-pearl rounded-2xl border border-gold/15 p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex items-center gap-2 text-espresso text-sm font-medium shrink-0">
          <Cloud className="w-4 h-4 text-gold" /> Google Drive folder
        </div>
        <input
          value={driveFolder}
          onChange={e => setDriveFolder(e.target.value)}
          placeholder="Paste folder link or ID (share the folder with the service account first)"
          className="flex-1 h-10 rounded-xl border border-gold/25 bg-ivory px-3 text-sm text-espresso placeholder:text-taupe/50 focus:outline-none focus:border-espresso/50"
        />
        <Button onClick={driveSync} disabled={syncing}
          className="h-10 rounded-full bg-espresso text-ivory px-5 text-sm shrink-0">
          {syncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing…</> : "Pull images"}
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-pearl rounded-2xl border border-gold/15 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-taupe mb-3">
            Intake results — batch {results.batch_date}
          </p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {results.results.map((r, i) => {
              const { Icon, cls } = RESULT_ICON[r.result] || RESULT_ICON.unreadable;
              return (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cls}`} />
                  <span className="font-medium text-espresso shrink-0">{r.file}</span>
                  <span className="text-taupe">{r.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Review: grid + AI classify + assign ───────────────────────────────────── */
function ReviewPanel({ status }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("todo");
  const [provider, setProvider] = useState("gemini");

  const params = {
    todo:     "uploaded=no",
    pass:     "status=pass&uploaded=no",
    review:   "status=manual_review",
    fail:     "status=fail",
    exported: "uploaded=yes",
    all:      "",
  }[filter];

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["az-images", filter],
    queryFn: () => api.get(`/admin/amazon/images?${params}`).then(r => r.data),
  });
  const { data: skus = [] } = useQuery({
    queryKey: ["az-skus"],
    queryFn: () => api.get("/admin/amazon/skus").then(r => r.data),
  });

  const classify = useMutation({
    mutationFn: () => api.post("/admin/amazon/classify", { provider }, { timeout: 600000 }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.classified ? `${d.classified} image(s) classified via ${d.provider}` : "Nothing pending classification");
      qc.invalidateQueries({ queryKey: ["az-images"] });
      qc.invalidateQueries({ queryKey: ["az-status"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Classification failed", { duration: 8000 }),
  });

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-1 flex-wrap">
          {[["todo", "To process"], ["pass", "Passed"], ["review", "Needs review"], ["fail", "Failed"], ["exported", "Exported"], ["all", "All"]].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                filter === id ? "bg-espresso text-ivory border-espresso" : "border-gold/25 text-taupe hover:text-espresso"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={provider} onChange={e => setProvider(e.target.value)}
            className="h-9 rounded-full border border-gold/25 bg-pearl px-3 text-xs text-espresso focus:outline-none">
            <option value="gemini">Gemini (cloud)</option>
            <option value="claude">Claude (cloud)</option>
            <option value="ollama">Ollama (local)</option>
          </select>
          <Button onClick={() => classify.mutate()} disabled={classify.isPending}
            className="h-9 rounded-full bg-gold text-espresso hover:bg-gold/85 px-4 text-xs font-semibold">
            {classify.isPending
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Classifying…</>
              : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI classify pending{status?.pending_ai ? ` (${status.pending_ai})` : ""}</>}
          </Button>
        </div>
      </div>

      {isLoading && <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-rosemist/40 animate-pulse" />)}</div>}
      {!isLoading && images.length === 0 && (
        <div className="text-center py-14 bg-pearl rounded-2xl border border-gold/10">
          <ImageIcon className="w-9 h-9 text-taupe mx-auto mb-3" />
          <p className="text-taupe text-sm">No images in this view. Add some from the Intake tab.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {images.map(img => <ImageCard key={img.phash} img={img} skus={skus} />)}
      </div>
    </div>
  );
}

function ImageCard({ img, skus }) {
  const qc = useQueryClient();
  const [itemType, setItemType] = useState(img.item_type || "");
  const [sku, setSku]           = useState(img.sku || "");
  const [slot, setSlot]         = useState(img.slot || "");
  const [itemName, setItemName] = useState("");
  const badge = QA_BADGE[img.qa_status] || QA_BADGE.manual_review;
  const skuMeta = skus.find(s => s.sku === sku.trim());
  const usedSlots = skuMeta?.slots?.filter(s => !(img.sku === sku.trim() && s === img.slot)) || [];
  const isNewSku = sku.trim() && !skuMeta;
  const ai = img.ai_meta;

  const save = useMutation({
    mutationFn: (payload) => api.patch(`/admin/amazon/images/${img.phash}`, payload).then(r => r.data),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["az-images"] });
      qc.invalidateQueries({ queryKey: ["az-skus"] });
      qc.invalidateQueries({ queryKey: ["az-status"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Save failed", { duration: 6000 }),
  });
  const del = useMutation({
    mutationFn: () => api.delete(`/admin/amazon/images/${img.phash}`),
    onSuccess: () => {
      toast.success("Image removed");
      qc.invalidateQueries({ queryKey: ["az-images"] });
      qc.invalidateQueries({ queryKey: ["az-status"] });
    },
  });

  return (
    <div className="bg-pearl rounded-2xl border border-gold/15 overflow-hidden flex flex-col">
      <div className="relative h-44 bg-rosemist/30">
        {img.lib_file ? (
          <img src={`/api/uploads/amazon/thumbs/${img.lib_file}`} alt={img.src_name}
            className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <div className="w-full h-full grid place-items-center text-taupe text-xs">rejected — no library copy</div>
        )}
        <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
          {badge.label}
        </span>
        {img.uploaded && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-espresso text-ivory">
            Exported
          </span>
        )}
        {img.main_ok && !img.uploaded && (
          <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-green-600/90 text-white">
            MAIN-eligible
          </span>
        )}
      </div>

      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <p className="text-[11px] text-taupe truncate" title={img.src_name}>
          {img.src_name} · {img.size} · batch {img.batch_date}
        </p>
        {img.qa_reasons && <p className="text-[11px] text-amber-700 leading-snug">{img.qa_reasons}</p>}
        {ai && (
          <p className="text-[11px] text-taupe">
            <Sparkles className="w-3 h-3 inline text-gold mr-1" />
            AI: {ai.item_type}{ai.color ? `, ${ai.color}` : ""}{ai.fabric_guess ? `, ${ai.fabric_guess}` : ""} ({ai.confidence})
          </p>
        )}

        {!img.uploaded && (
          <div className="space-y-1.5 mt-auto pt-1">
            <div className="flex gap-1.5">
              <select value={itemType} onChange={e => setItemType(e.target.value)}
                className="flex-1 h-8 rounded-lg border border-gold/25 bg-ivory px-2 text-xs text-espresso focus:outline-none">
                <option value="">type?</option>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
              <select value={slot} onChange={e => setSlot(e.target.value)}
                className="w-24 h-8 rounded-lg border border-gold/25 bg-ivory px-2 text-xs text-espresso focus:outline-none">
                <option value="">slot: auto</option>
                {SLOTS.map(s => (
                  <option key={s} value={s} disabled={usedSlots.includes(s)}>
                    {s}{usedSlots.includes(s) ? " ✕" : ""}
                  </option>
                ))}
              </select>
            </div>
            <input value={sku} onChange={e => setSku(e.target.value)} list="az-sku-list"
              placeholder="SKU (e.g. ZN-SAREE-001)"
              className="w-full h-8 rounded-lg border border-gold/25 bg-ivory px-2 text-xs font-mono text-espresso placeholder:text-taupe/50 focus:outline-none" />
            <datalist id="az-sku-list">
              {skus.map(s => <option key={s.sku} value={s.sku}>{s.item_name}</option>)}
            </datalist>
            {isNewSku && (
              <input value={itemName} onChange={e => setItemName(e.target.value)}
                placeholder="New SKU — Amazon listing title"
                className="w-full h-8 rounded-lg border border-gold/25 bg-ivory px-2 text-xs text-espresso placeholder:text-taupe/50 focus:outline-none" />
            )}
            {usedSlots.length > 0 && (
              <p className="text-[10px] text-taupe">SKU has: {usedSlots.join(", ")}</p>
            )}
            <div className="flex gap-1.5 pt-0.5">
              <button
                onClick={() => save.mutate({ item_type: itemType || null, sku, slot: slot || null, item_name: itemName || null })}
                disabled={save.isPending}
                className="flex-1 h-8 rounded-lg bg-espresso text-ivory text-xs font-medium hover:bg-espresso/90 transition inline-flex items-center justify-center gap-1.5">
                {save.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
              {img.qa_status === "manual_review" && (
                <button onClick={() => save.mutate({ qa_status: "pass" })}
                  className="h-8 px-2.5 rounded-lg border border-green-300 text-green-700 text-xs hover:bg-green-50 transition">
                  Pass
                </button>
              )}
              {img.qa_status !== "fail" && (
                <button onClick={() => save.mutate({ qa_status: "fail" })}
                  className="h-8 px-2.5 rounded-lg border border-amber-300 text-amber-700 text-xs hover:bg-amber-50 transition">
                  Reject
                </button>
              )}
              <button onClick={() => { if (window.confirm("Remove this image from the registry?")) del.mutate(); }}
                className="h-8 px-2.5 rounded-lg border border-red-200 text-red-500 text-xs hover:bg-red-50 transition">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Export: templates + flat file generation ──────────────────────────────── */
function ExportPanel() {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ["az-templates"],
    queryFn: () => api.get("/admin/amazon/templates").then(r => r.data),
  });
  const { data: skus = [] } = useQuery({
    queryKey: ["az-skus"],
    queryFn: () => api.get("/admin/amazon/skus").then(r => r.data),
  });

  const [showUpload, setShowUpload] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplPtype, setTplPtype] = useState("SAREE");
  const [tplTypes, setTplTypes] = useState("saree");
  const [tplFile, setTplFile] = useState(null);
  const [uploadingTpl, setUploadingTpl] = useState(false);

  const [selTpl, setSelTpl] = useState("");
  const [urlBase, setUrlBase] = useState(`${window.location.origin}/api/uploads/amazon/library`);
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);

  const readySkus = skus.filter(s => s.ready > 0);
  const selected = templates.find(t => t.id === selTpl);
  const matchingReady = selected
    ? readySkus.filter(s => selected.item_types.includes(s.item_type))
    : [];

  async function uploadTemplate() {
    if (!tplFile || !tplName.trim()) { toast.error("Template file and name are required"); return; }
    setUploadingTpl(true);
    try {
      const fd = new FormData();
      fd.append("file", tplFile);
      fd.append("name", tplName.trim());
      fd.append("product_type", tplPtype.trim());
      fd.append("item_types", tplTypes.trim());
      const { data } = await api.post("/admin/amazon/templates", fd, { timeout: 120000 });
      toast.success(`Template "${data.name}" added — ${data.image_slots.length} image slots detected`);
      setShowUpload(false); setTplName(""); setTplFile(null);
      qc.invalidateQueries({ queryKey: ["az-templates"] });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Template upload failed", { duration: 8000 });
    } finally {
      setUploadingTpl(false);
    }
  }

  async function runExport() {
    if (!selTpl) { toast.error("Select a template"); return; }
    setExporting(true);
    setLastExport(null);
    try {
      const { data } = await api.post("/admin/amazon/export", { template_id: selTpl, url_base: urlBase }, { timeout: 300000 });
      setLastExport(data);
      toast.success(`${data.skus_written} SKU row(s) written`);
      qc.invalidateQueries({ queryKey: ["az-images"] });
      qc.invalidateQueries({ queryKey: ["az-skus"] });
      qc.invalidateQueries({ queryKey: ["az-status"] });
      window.open(data.download_url, "_blank");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Export failed", { duration: 10000 });
    } finally {
      setExporting(false);
    }
  }

  async function deleteTemplate(t) {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      await api.delete(`/admin/amazon/templates/${t.id}`);
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["az-templates"] });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  }

  return (
    <div className="space-y-5">
      {/* Templates */}
      <div className="bg-pearl rounded-2xl border border-gold/15 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.18em] text-taupe flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-gold" /> Flat-file templates
          </p>
          <button onClick={() => setShowUpload(v => !v)}
            className="text-xs text-gold hover:text-espresso transition font-medium inline-flex items-center gap-1">
            + Add template <ChevronDown className={`w-3 h-3 transition-transform ${showUpload ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showUpload && (
          <div className="border border-gold/20 rounded-xl p-4 mb-4 space-y-3 bg-ivory/50">
            <div className="grid sm:grid-cols-3 gap-3">
              <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Name (e.g. Sarees IN)"
                className="h-9 rounded-lg border border-gold/25 bg-ivory px-3 text-xs text-espresso focus:outline-none" />
              <input value={tplPtype} onChange={e => setTplPtype(e.target.value)} placeholder="Product type (e.g. SAREE)"
                className="h-9 rounded-lg border border-gold/25 bg-ivory px-3 text-xs font-mono text-espresso focus:outline-none" />
              <input value={tplTypes} onChange={e => setTplTypes(e.target.value)} placeholder="Item types csv (e.g. saree)"
                className="h-9 rounded-lg border border-gold/25 bg-ivory px-3 text-xs font-mono text-espresso focus:outline-none" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="file" accept=".xlsm,.xlsx" onChange={e => setTplFile(e.target.files?.[0] || null)}
                className="text-xs text-taupe file:mr-3 file:h-9 file:px-4 file:rounded-full file:border-0 file:bg-espresso file:text-ivory file:text-xs file:cursor-pointer" />
              <Button onClick={uploadTemplate} disabled={uploadingTpl}
                className="h-9 rounded-full bg-gold text-espresso hover:bg-gold/85 px-5 text-xs font-semibold">
                {uploadingTpl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Upload & introspect"}
              </Button>
            </div>
            <p className="text-[11px] text-taupe">
              Upload Amazon's own .xlsm for the category (e.g. your SAREE.xlsm). Columns are detected automatically from
              Amazon's machine-name row — future templates (dress material, lehenga…) plug in the same way.
            </p>
          </div>
        )}

        {templates.length === 0 && !showUpload && (
          <p className="text-sm text-taupe py-2">No templates yet. Add your SAREE.xlsm to get started.</p>
        )}
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition ${
              selTpl === t.id ? "border-espresso bg-espresso/5" : "border-gold/20 hover:border-gold/50"
            }`} onClick={() => setSelTpl(t.id)}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-espresso">{t.name}
                  <span className="ml-2 text-[10px] font-mono bg-gold/15 text-espresso px-1.5 py-0.5 rounded-full">{t.product_type}</span>
                </p>
                <p className="text-[11px] text-taupe mt-0.5">
                  accepts: {t.item_types.join(", ")} · {t.image_slots.length} image slots · {t.src_filename}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-4 h-4 rounded-full border-2 ${selTpl === t.id ? "border-espresso bg-espresso" : "border-gold/40"}`} />
                <button onClick={e => { e.stopPropagation(); deleteTemplate(t); }}
                  className="text-taupe hover:text-red-500 transition p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export action */}
      <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-taupe">Generate batch flat file</p>
        <div>
          <label className="text-[11px] text-taupe block mb-1">Image URL base (must be publicly reachable by Amazon)</label>
          <input value={urlBase} onChange={e => setUrlBase(e.target.value)}
            className="w-full h-9 rounded-lg border border-gold/25 bg-ivory px-3 text-xs font-mono text-espresso focus:outline-none" />
        </div>
        {selected ? (
          <p className="text-xs text-taupe">
            {matchingReady.length > 0
              ? <>Ready for <b className="text-espresso">{selected.name}</b>: {matchingReady.map(s => `${s.sku} (${s.ready} img)`).join(", ")}</>
              : <>No QA-passed, SKU-assigned {selected.item_types.join("/")} images pending export.</>}
          </p>
        ) : (
          <p className="text-xs text-taupe">Select a template above. Ready SKUs: {readySkus.length ? readySkus.map(s => `${s.sku} [${s.item_type}]`).join(", ") : "none yet"}</p>
        )}
        <Button onClick={runExport} disabled={exporting || !selTpl}
          className="h-11 rounded-full bg-espresso text-ivory hover:bg-espresso/90 px-6 text-sm w-full sm:w-auto">
          {exporting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            : <><Download className="w-4 h-4 mr-2" /> Generate & download flat file</>}
        </Button>
        {lastExport && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 space-y-1">
            <p><b>{lastExport.file}</b> — {lastExport.skus_written} SKU row(s), {lastExport.images_marked} images marked exported.
              <a href={lastExport.download_url} className="underline ml-2" target="_blank" rel="noreferrer">Download again</a></p>
            {lastExport.skipped?.length > 0 && (
              <p className="text-amber-700">Held for other templates: {lastExport.skipped.map(s => `${s.sku} (${s.item_type})`).join(", ")}</p>
            )}
            <p className="text-green-700">{lastExport.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Batches: status dashboard ─────────────────────────────────────────────── */
function BatchesPanel({ status }) {
  const batches = status?.batches || [];
  return (
    <div className="bg-pearl rounded-2xl border border-gold/15 overflow-hidden">
      {batches.length === 0 ? (
        <p className="text-sm text-taupe text-center py-12">No batches yet — start from the Intake tab.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-taupe border-b border-gold/15">
                {["Batch", "Total", "Passed", "Review", "Failed", "Assigned", "Exported"].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.batch_date} className="border-b border-gold/10 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-espresso">{b.batch_date}</td>
                  <td className="px-4 py-3 text-espresso">{b.total}</td>
                  <td className="px-4 py-3 text-green-700">{b.passed}</td>
                  <td className="px-4 py-3 text-amber-600">{b.review}</td>
                  <td className="px-4 py-3 text-red-500">{b.failed}</td>
                  <td className="px-4 py-3 text-espresso">{b.assigned}</td>
                  <td className="px-4 py-3 text-espresso">{b.exported}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
