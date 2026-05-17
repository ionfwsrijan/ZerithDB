"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Copy, Check, Plus, Link2, Trash2 } from "lucide-react";
import type { SchemaEdge, SchemaField, SchemaNode } from "@/lib/schema-builder/types";
import { generateSchemaArtifacts } from "@/lib/schema-builder/codegen";

type Selected =
  | { kind: "none" }
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function centerOf(node: SchemaNode) {
  return { x: node.x + 130, y: node.y + 45 };
}

const FIELD_KIND_OPTIONS: Array<{ value: SchemaField["kind"]; label: string }> = [
  { value: "string", label: "string" },
  { value: "number", label: "number" },
  { value: "boolean", label: "boolean" },
  { value: "custom", label: "custom" },
];

export default function SchemaBuilderPage() {
  const [nodes, setNodes] = useState<SchemaNode[]>(() => [
    {
      id: uid("node"),
      name: "todos",
      x: 80,
      y: 80,
      fields: [
        { id: uid("field"), name: "text", kind: "string", required: true, array: false },
        { id: uid("field"), name: "done", kind: "boolean", required: false, array: false },
      ],
    },
  ]);
  const [edges, setEdges] = useState<SchemaEdge[]>([]);
  const [selected, setSelected] = useState<Selected>({ kind: "none" });
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dragRef = useRef<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const selectedNode = useMemo(() => {
    if (selected.kind !== "node") return null;
    return nodes.find((n) => n.id === selected.id) ?? null;
  }, [nodes, selected]);

  const selectedEdge = useMemo(() => {
    if (selected.kind !== "edge") return null;
    return edges.find((e) => e.id === selected.id) ?? null;
  }, [edges, selected]);

  const artifacts = useMemo(() => generateSchemaArtifacts(nodes, edges), [nodes, edges]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== dragRef.current?.nodeId) return n;
          const nextX = e.clientX - dragRef.current.offsetX;
          const nextY = e.clientY - dragRef.current.offsetY;
          return { ...n, x: clamp(nextX, 0, 2000), y: clamp(nextY, 0, 2000) };
        })
      );
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function addNode() {
    const id = uid("node");
    setNodes((prev) => [
      ...prev,
      {
        id,
        name: `collection_${prev.length + 1}`,
        x: 120 + prev.length * 30,
        y: 120 + prev.length * 30,
        fields: [],
      },
    ]);
    setSelected({ kind: "node", id });
  }

  function removeSelected() {
    if (selected.kind === "node") {
      const nodeId = selected.id;
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
      setSelected({ kind: "none" });
      if (connectFrom === nodeId) setConnectFrom(null);
    } else if (selected.kind === "edge") {
      const edgeId = selected.id;
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
      setSelected({ kind: "none" });
    }
  }

  function onNodePointerDown(e: React.PointerEvent, nodeId: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = { nodeId, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
  }

  function onNodeClick(nodeId: string) {
    if (connectFrom) {
      if (connectFrom === nodeId) return;
      const newEdge: SchemaEdge = {
        id: uid("edge"),
        from: connectFrom,
        to: nodeId,
        label: "rel",
      };
      setEdges((prev) => [...prev, newEdge]);
      setSelected({ kind: "edge", id: newEdge.id });
      setConnectFrom(null);
      return;
    }
    setSelected({ kind: "node", id: nodeId });
  }

  async function copyCode() {
    await navigator.clipboard.writeText(artifacts.typescript);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      <header className="bg-background border-b border-border px-6 h-16 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Docs
          </Link>
          <div className="h-4 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-lg tracking-tight">
              Visual Schema Builder (MVP)
            </span>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
              Issue #801
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addNode}
            className="inline-flex items-center gap-2 bg-foreground text-background px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            title="Add collection node"
          >
            <Plus className="w-4 h-4" /> Add Collection
          </button>
          <button
            onClick={() => setConnectFrom(selected.kind === "node" ? selected.id : null)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              connectFrom
                ? "bg-blue-500/15 border-blue-500/40 text-foreground"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
            title="Create a relation by selecting source then target"
          >
            <Link2 className="w-4 h-4" />
            Relation
          </button>
          <button
            onClick={removeSelected}
            disabled={selected.kind === "none"}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border bg-muted border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground transition-opacity"
            title="Delete selected node/edge"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-0">
        {/* Canvas */}
        <div className="col-span-8 border-r border-border relative overflow-hidden bg-muted/30">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map((e) => {
              const from = nodes.find((n) => n.id === e.from);
              const to = nodes.find((n) => n.id === e.to);
              if (!from || !to) return null;
              const a = centerOf(from);
              const b = centerOf(to);
              const isSelected = selected.kind === "edge" && selected.id === e.id;
              return (
                <g key={e.id}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={isSelected ? "rgb(59 130 246)" : "rgb(148 163 184)"}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={0.9}
                  />
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 6}
                    fontSize="12"
                    fill="rgb(100 116 139)"
                  >
                    {e.label}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="absolute inset-0">
            {nodes.map((n) => {
              const isSelected = selected.kind === "node" && selected.id === n.id;
              const isConnectSource = connectFrom === n.id;
              return (
                <div
                  key={n.id}
                  style={{ left: n.x, top: n.y }}
                  className={`absolute w-[260px] select-none rounded-xl border shadow-sm bg-background transition-colors ${
                    isSelected
                      ? "border-blue-500/60 ring-2 ring-blue-500/20"
                      : isConnectSource
                        ? "border-blue-500/60"
                        : "border-border"
                  }`}
                  onPointerDown={(e) => onNodePointerDown(e, n.id)}
                  onClick={() => onNodeClick(n.id)}
                >
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <div className="font-semibold text-sm text-foreground truncate">{n.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {n.fields.length} fields
                    </div>
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    {n.fields.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No fields yet.</div>
                    ) : (
                      n.fields.slice(0, 6).map((f) => (
                        <div key={f.id} className="flex items-center justify-between text-xs">
                          <span className="text-foreground/90 truncate">{f.name}</span>
                          <span className="text-muted-foreground font-mono">
                            {f.kind}
                            {f.array ? "[]" : ""}
                            {f.required ? "" : "?"}
                          </span>
                        </div>
                      ))
                    )}
                    {n.fields.length > 6 && (
                      <div className="text-[11px] text-muted-foreground">
                        +{n.fields.length - 6} more…
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {connectFrom && (
            <div className="absolute bottom-4 left-4 bg-background border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground shadow-sm">
              Select a target collection to create a relation.
            </div>
          )}
        </div>

        {/* Inspector + Code */}
        <div className="col-span-4 flex flex-col">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">Inspector</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select a node to edit fields, or select an edge to rename the relation.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {selectedNode && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Collection
                  </label>
                  <input
                    value={selectedNode.name}
                    onChange={(e) =>
                      setNodes((prev) =>
                        prev.map((n) => (n.id === selectedNode.id ? { ...n, name: e.target.value } : n))
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. todos"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Fields
                    </label>
                    <button
                      onClick={() => {
                        const newField: SchemaField = {
                          id: uid("field"),
                          name: `field_${selectedNode.fields.length + 1}`,
                          kind: "string",
                          required: true,
                          array: false,
                        };
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id ? { ...n, fields: [...n.fields, newField] } : n
                          )
                        );
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedNode.fields.map((f) => (
                      <div key={f.id} className="rounded-xl border border-border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <input
                            value={f.name}
                            onChange={(e) =>
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id !== selectedNode.id
                                    ? n
                                    : {
                                        ...n,
                                        fields: n.fields.map((ff) =>
                                          ff.id === f.id ? { ...ff, name: e.target.value } : ff
                                        ),
                                      }
                                )
                              )
                            }
                            className="flex-1 px-2 py-1.5 rounded-md bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="field name"
                          />
                          <button
                            onClick={() =>
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id !== selectedNode.id
                                    ? n
                                    : { ...n, fields: n.fields.filter((ff) => ff.id !== f.id) }
                                )
                              )
                            }
                            className="p-2 rounded-md border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Remove field"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <select
                            value={f.kind}
                            onChange={(e) =>
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id !== selectedNode.id
                                    ? n
                                    : {
                                        ...n,
                                        fields: n.fields.map((ff) =>
                                          ff.id === f.id
                                            ? { ...ff, kind: e.target.value as SchemaField["kind"] }
                                            : ff
                                        ),
                                      }
                                )
                              )
                            }
                            className="px-2 py-1.5 rounded-md bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            {FIELD_KIND_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <input
                            value={f.customType ?? ""}
                            onChange={(e) =>
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id !== selectedNode.id
                                    ? n
                                    : {
                                        ...n,
                                        fields: n.fields.map((ff) =>
                                          ff.id === f.id ? { ...ff, customType: e.target.value } : ff
                                        ),
                                      }
                                )
                              )
                            }
                            disabled={f.kind !== "custom"}
                            className="px-2 py-1.5 rounded-md bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Custom type"
                          />

                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={f.required}
                              onChange={(e) =>
                                setNodes((prev) =>
                                  prev.map((n) =>
                                    n.id !== selectedNode.id
                                      ? n
                                      : {
                                          ...n,
                                          fields: n.fields.map((ff) =>
                                            ff.id === f.id ? { ...ff, required: e.target.checked } : ff
                                          ),
                                        }
                                  )
                                )
                              }
                            />
                            Required
                          </label>

                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={f.array}
                              onChange={(e) =>
                                setNodes((prev) =>
                                  prev.map((n) =>
                                    n.id !== selectedNode.id
                                      ? n
                                      : {
                                          ...n,
                                          fields: n.fields.map((ff) =>
                                            ff.id === f.id ? { ...ff, array: e.target.checked } : ff
                                          ),
                                        }
                                  )
                                )
                              }
                            />
                            Array
                          </label>
                        </div>
                      </div>
                    ))}
                    {selectedNode.fields.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        Add fields to generate Zod + TypeScript types.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Relation Label
                </label>
                <input
                  value={selectedEdge.label}
                  onChange={(e) =>
                    setEdges((prev) =>
                      prev.map((ed) => (ed.id === selectedEdge.id ? { ...ed, label: e.target.value } : ed))
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. author"
                />
              </div>
            )}

            {selected.kind === "none" && (
              <div className="text-sm text-muted-foreground">
                Tip: click a collection to edit it, or use <span className="font-mono">Relation</span>{" "}
                then click source → target.
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Generated TypeScript</h3>
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-3 text-xs leading-relaxed bg-background border border-border rounded-xl p-3 overflow-auto max-h-[360px]">
                <code>{artifacts.typescript}</code>
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Note: this generator emits <span className="font-mono">zod</span> usage for validation, but
                does not change ZerithDB runtime behavior.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

