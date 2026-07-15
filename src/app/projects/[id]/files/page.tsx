"use client";

import { useMemo, useRef, useState } from "react";
import {
  FolderPlus,
  Upload,
  Folder,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  Download,
  Pencil,
  Trash2,
  ChevronRight,
  Home,
  MoreVertical,
  Check,
} from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { makeId } from "@/lib/defaults";
import { useI18n } from "@/lib/i18n";
import type { Project, ProjectFile } from "@/lib/types";

/** Per-file size cap. Files persist as data URLs inside the project JSON, so
 *  keep individual uploads sensible. */
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

function formatBytes(n: number): string {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Could not read file"));
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(file);
  });
}

/** Icon for a file by MIME / extension. */
function fileIconFor(f: ProjectFile) {
  const m = f.mime || "";
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (m.startsWith("image/")) return FileImage;
  if (m === "application/pdf" || ext === "pdf") return FileText;
  if (["xls", "xlsx", "csv", "numbers"].includes(ext) || m.includes("sheet")) return FileSpreadsheet;
  if (["doc", "docx", "txt", "md", "rtf"].includes(ext) || m.startsWith("text/")) return FileText;
  return FileIcon;
}

export default function FilesPage() {
  const { t } = useI18n();
  const { project, setProject, loading, error } = useProjectContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folderId, setFolderId] = useState<string | null>(null); // null = root
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allFiles: ProjectFile[] = useMemo(() => project?.files ?? [], [project]);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">{t("Loading…")}</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{t(error)}</div>;
  if (!project) return null;

  function setFiles(updater: (files: ProjectFile[]) => ProjectFile[]) {
    setProject((p: Project) => ({ ...p, files: updater(p.files ?? []) }));
  }

  // --- Navigation helpers ---------------------------------------------------
  const byId = (id: string | null) => allFiles.find((f) => f.id === id) ?? null;
  const children = allFiles
    .filter((f) => f.parentId === folderId)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1; // folders first
      return a.name.localeCompare(b.name);
    });
  const folders = children.filter((f) => f.kind === "folder");
  const files = children.filter((f) => f.kind === "file");

  // Breadcrumb trail from root → current folder.
  const trail: ProjectFile[] = [];
  for (let cur = byId(folderId); cur; cur = byId(cur.parentId)) trail.unshift(cur);

  /** All descendant ids of a folder (inclusive), for cascade delete / move guards. */
  function descendantIds(id: string): Set<string> {
    const out = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of allFiles) {
        if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
          out.add(f.id);
          added = true;
        }
      }
    }
    return out;
  }

  // --- Actions --------------------------------------------------------------
  function createFolder() {
    const id = makeId();
    setFiles((fs) => [
      ...fs,
      { id, name: "Untitled folder", kind: "folder", parentId: folderId, dataUrl: "", mime: "", size: 0, createdAt: new Date().toISOString() },
    ]);
    setRenamingId(id);
    setRenameValue("Untitled folder");
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    setBusy(true);
    try {
      const tooBig = picked.filter((f) => f.size > MAX_FILE_BYTES);
      const ok = picked.filter((f) => f.size <= MAX_FILE_BYTES);
      if (tooBig.length > 0) {
        window.alert(t("Skipped {count} file(s) over {size}: {names}", { count: tooBig.length, size: formatBytes(MAX_FILE_BYTES), names: tooBig.map((f) => f.name).join(", ") }));
      }
      const nodes: ProjectFile[] = [];
      for (const f of ok) {
        nodes.push({
          id: makeId(),
          name: f.name,
          kind: "file",
          parentId: folderId,
          dataUrl: await readAsDataUrl(f),
          mime: f.type,
          size: f.size,
          createdAt: new Date().toISOString(),
        });
      }
      if (nodes.length) setFiles((fs) => [...fs, ...nodes]);
    } catch (err) {
      window.alert(t((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function startRename(f: ProjectFile) {
    setMenuId(null);
    setRenamingId(f.id);
    setRenameValue(f.name);
  }
  function commitRename() {
    const name = renameValue.trim();
    if (renamingId && name) {
      setFiles((fs) => fs.map((f) => (f.id === renamingId ? { ...f, name } : f)));
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function remove(f: ProjectFile) {
    setMenuId(null);
    const isFolder = f.kind === "folder";
    const msg = isFolder
      ? t("Delete the folder “{name}” and everything inside it? This can't be undone.", { name: f.name })
      : t("Delete “{name}”? This can't be undone.", { name: f.name });
    if (!window.confirm(msg)) return;
    const doomed = isFolder ? descendantIds(f.id) : new Set([f.id]);
    setFiles((fs) => fs.filter((x) => !doomed.has(x.id)));
  }

  function download(f: ProjectFile) {
    setMenuId(null);
    if (!f.dataUrl) return;
    const a = document.createElement("a");
    a.href = f.dataUrl;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /** Move `id` into folder `targetParentId` (null = root), guarding cycles. */
  function moveInto(id: string, targetParentId: string | null) {
    if (id === targetParentId) return;
    const node = byId(id);
    if (!node) return;
    if (node.kind === "folder" && targetParentId && descendantIds(id).has(targetParentId)) return; // no folder into itself/descendant
    if (node.parentId === targetParentId) return;
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, parentId: targetParentId } : f)));
  }

  const dropCardProps = (targetId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragId && dragId !== targetId) {
        e.preventDefault();
        setDropTarget(targetId);
      }
    },
    onDragLeave: () => setDropTarget((t) => (t === targetId ? null : t)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragId) moveInto(dragId, targetId);
      setDropTarget(null);
      setDragId(null);
    },
  });

  const totalSize = allFiles.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <div className="space-y-6" onClick={() => setMenuId(null)}>
      {/* Intro + save */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-2xl leading-none">{t("Files")}</h1>
          <p className="text-sm text-ink-muted mt-1.5 max-w-2xl">{t("Drag items onto a folder to move them.")}</p>
        </div>
      </div>

      {/* Toolbar: breadcrumb + actions */}
      <div className="panel p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm min-w-0 flex-wrap">
          <button
            onClick={() => setFolderId(null)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] font-bold transition-colors ${folderId === null ? "text-accent" : "text-ink-muted hover:bg-[var(--accent-soft)]"}`}
            style={dropTarget === "__root__" ? { background: "var(--accent-soft)", outline: "1.5px solid var(--accent)" } : undefined}
            onDragOver={(e) => { if (dragId) { e.preventDefault(); setDropTarget("__root__"); } }}
            onDragLeave={() => setDropTarget((t) => (t === "__root__" ? null : t))}
            onDrop={(e) => { e.preventDefault(); if (dragId) moveInto(dragId, null); setDropTarget(null); setDragId(null); }}
          >
            <Home size={15} /> {project.name}
          </button>
          {trail.map((node) => (
            <span key={node.id} className="inline-flex items-center gap-1 min-w-0">
              <ChevronRight size={14} className="text-faint shrink-0" />
              <button
                onClick={() => setFolderId(node.id)}
                className={`px-2 py-1.5 rounded-[10px] font-bold truncate max-w-[180px] transition-colors ${node.id === folderId ? "text-accent" : "text-ink-muted hover:bg-[var(--accent-soft)]"}`}
              >
                {node.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={createFolder} className="btn inline-flex items-center gap-1.5">
            <FolderPlus size={15} /> {t("New folder")}
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={onUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="btn btn-blue inline-flex items-center gap-1.5">
            <Upload size={15} /> {t(busy ? "Uploading…" : "Upload")}
          </button>
        </div>
      </div>

      {/* Contents */}
      {children.length === 0 ? (
        <div className="panel p-12 text-center">
          <Folder size={40} className="mx-auto text-faint mb-3" />
          <p className="text-sm text-ink-muted">
            {t("This folder is empty. Use")} <span className="font-bold">{t("Upload")}</span> {t("to add files or")} <span className="font-bold">{t("New folder")}</span> {t("to organize them.")}
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Folders */}
          {folders.map((f) => {
            const Icon = Folder;
            const isDrop = dropTarget === f.id;
            return (
              <div
                key={f.id}
                draggable={renamingId !== f.id}
                onDragStart={() => setDragId(f.id)}
                onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                {...dropCardProps(f.id)}
                onDoubleClick={() => setFolderId(f.id)}
                className="relative group cursor-pointer transition-all border-b border-hair last:border-0 hover:bg-[var(--glass-2)]"
                style={{
                  ...(isDrop ? { outline: "2px solid var(--accent)", background: "var(--accent-soft)" } : {}),
                  ...(dragId === f.id ? { opacity: 0.4 } : {}),
                }}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-accent shrink-0"
                    style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
                  >
                    <Icon size={21} style={{ fill: "var(--accent-soft)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {renamingId === f.id ? (
                      <RenameInput value={renameValue} onChange={setRenameValue} onCommit={commitRename} onCancel={() => setRenamingId(null)} />
                    ) : (
                      <>
                        <div className="text-[13px] font-bold truncate" title={f.name}>{f.name}</div>
                        <div className="text-[11.5px] text-ink-muted">{t("Folder - double-click to open")}</div>
                      </>
                    )}
                  </div>
                  <ItemMenu
                    open={menuId === f.id}
                    onToggle={(e) => { e.stopPropagation(); setMenuId((m) => (m === f.id ? null : f.id)); }}
                    onRename={() => startRename(f)}
                    onDelete={() => remove(f)}
                  />
                </div>
              </div>
            );
          })}

          {/* Files */}
          {files.map((f) => {
            const Icon = fileIconFor(f);
            return (
              <div
                key={f.id}
                draggable={renamingId !== f.id}
                onDragStart={() => setDragId(f.id)}
                onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                onDoubleClick={() => download(f)}
                className="relative group transition-all border-b border-hair last:border-0 hover:bg-[var(--glass-2)]"
                style={dragId === f.id ? { opacity: 0.4 } : undefined}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-accent shrink-0"
                    style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {renamingId === f.id ? (
                      <RenameInput value={renameValue} onChange={setRenameValue} onCommit={commitRename} onCancel={() => setRenamingId(null)} />
                    ) : (
                      <>
                        <div className="text-[13px] font-bold truncate" title={f.name}>{f.name}</div>
                        <div className="text-[11.5px] text-ink-muted truncate">{t("File - ready to download")}</div>
                      </>
                    )}
                  </div>
                  <div className="font-mono text-[11.5px] text-ink-muted shrink-0">{formatBytes(f.size)}</div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); download(f); }}
                    className="icon-btn !w-8 !h-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={t("Download {name}", { name: f.name })}
                  >
                    <Download size={14} />
                  </button>
                  <ItemMenu
                    open={menuId === f.id}
                    onToggle={(e) => { e.stopPropagation(); setMenuId((m) => (m === f.id ? null : f.id)); }}
                    onRename={() => startRename(f)}
                    onDelete={() => remove(f)}
                    onDownload={() => download(f)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer summary */}
      <div className="text-[11px] text-ink-muted font-mono">
        {t("{files} file(s) · {folders} folder(s) · {size} total", { files: allFiles.filter((f) => f.kind === "file").length, folders: allFiles.filter((f) => f.kind === "folder").length, size: formatBytes(totalSize) })}
      </div>
    </div>
  );
}

/** Inline rename field shared by folder + file cards. */
function RenameInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onCommit}
        className="cell-input !py-1 text-[13px] font-semibold"
      />
      <button onMouseDown={(e) => { e.preventDefault(); onCommit(); }} className="icon-btn !w-7 !h-7 shrink-0" aria-label={t("Save name")}>
        <Check size={13} />
      </button>
    </div>
  );
}

/** Kebab menu with rename / download / delete actions. */
function ItemMenu({
  open,
  onToggle,
  onRename,
  onDelete,
  onDownload,
}: {
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onRename: () => void;
  onDelete: () => void;
  onDownload?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="relative shrink-0">
      <button onClick={onToggle} className="icon-btn !w-7 !h-7 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t("More actions")}>
        <MoreVertical size={14} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-[150px] p-1.5 z-[80]"
          onClick={(e) => e.stopPropagation()}
          style={{
            borderRadius: 14,
            background: "var(--glass-strong)",
            backdropFilter: "var(--blur)",
            WebkitBackdropFilter: "var(--blur)",
            border: "1px solid var(--border)",
            borderTopColor: "var(--border-top)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {onDownload && (
            <button onClick={onDownload} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[12.5px] font-semibold transition-colors hover:bg-[var(--accent-soft)]">
              <Download size={14} /> {t("Download")}
            </button>
          )}
          <button onClick={onRename} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[12.5px] font-semibold transition-colors hover:bg-[var(--accent-soft)]">
            <Pencil size={14} /> {t("Rename")}
          </button>
          <button onClick={onDelete} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[12.5px] font-semibold text-red transition-colors hover:bg-[var(--accent-soft)]">
            <Trash2 size={14} /> {t("Delete")}
          </button>
        </div>
      )}
    </div>
  );
}
