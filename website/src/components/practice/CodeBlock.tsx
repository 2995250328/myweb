"use client";

import { useEffect, useRef } from "react";
import { useState } from "react";
import { python } from "@codemirror/lang-python";
import {
  bracketMatching,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

interface Props {
  code: string;
  appearance: "light" | "dark";
}

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#7c3aed", fontWeight: "600" },
  { tag: tags.definitionKeyword, color: "#7c3aed", fontWeight: "600" },
  { tag: tags.function(tags.variableName), color: "#2563eb", fontWeight: "600" },
  { tag: tags.function(tags.propertyName), color: "#2563eb", fontWeight: "600" },
  { tag: tags.className, color: "#0891b2", fontWeight: "600" },
  { tag: tags.number, color: "#dc2626" },
  { tag: tags.string, color: "#15803d" },
  { tag: tags.comment, color: "#64748b", fontStyle: "italic" },
  { tag: tags.operator, color: "#475569" },
  { tag: tags.bool, color: "#be123c", fontWeight: "600" },
  { tag: tags.self, color: "#0f766e" },
  { tag: tags.propertyName, color: "#0369a1" },
  { tag: tags.variableName, color: "#0f172a" },
]);

const codeBlockTheme = EditorView.theme({
  "&": {
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "12px",
  },
  ".cm-scroller": {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    lineHeight: "1.55",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "12px 0",
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    color: "#64748b",
    borderRight: "1px solid #e2e8f0",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#f8fafc",
    color: "#64748b",
  },
});

const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#c084fc", fontWeight: "600" },
  { tag: tags.definitionKeyword, color: "#c084fc", fontWeight: "600" },
  { tag: tags.function(tags.variableName), color: "#60a5fa", fontWeight: "600" },
  { tag: tags.function(tags.propertyName), color: "#60a5fa", fontWeight: "600" },
  { tag: tags.className, color: "#22d3ee", fontWeight: "600" },
  { tag: tags.number, color: "#fb7185" },
  { tag: tags.string, color: "#4ade80" },
  { tag: tags.comment, color: "#94a3b8", fontStyle: "italic" },
  { tag: tags.operator, color: "#cbd5e1" },
  { tag: tags.bool, color: "#f472b6", fontWeight: "600" },
  { tag: tags.self, color: "#2dd4bf" },
  { tag: tags.propertyName, color: "#7dd3fc" },
  { tag: tags.variableName, color: "#e2e8f0" },
]);

const darkCodeBlockTheme = EditorView.theme({
  "&": {
    border: "1px solid #334155",
    borderRadius: "6px",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontSize: "12px",
  },
  ".cm-scroller": {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    lineHeight: "1.55",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "12px 0",
  },
  ".cm-gutters": {
    backgroundColor: "#111827",
    color: "#94a3b8",
    borderRight: "1px solid #334155",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#111827",
    color: "#94a3b8",
  },
});

export default function CodeBlock({ code, appearance }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;

    viewRef.current = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: code,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          bracketMatching(),
          python(),
          syntaxHighlighting(
            appearance === "light" ? highlightStyle : darkHighlightStyle,
          ),
          appearance === "light" ? codeBlockTheme : darkCodeBlockTheme,
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
        ],
      }),
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [appearance]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === code) return;
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: code,
      },
    });
  }, [code]);

  return (
    <div className="relative my-5">
      <button
        type="button"
        onClick={copyCode}
        className="absolute right-3 top-3 z-10 rounded-md border border-slate-300 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
      >
        {copied ? "已复制" : "复制"}
      </button>
      <div ref={hostRef} />
    </div>
  );
}
