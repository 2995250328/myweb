"use client";

import { useEffect, useRef } from "react";
import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  CompletionContext,
  completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

interface Props {
  value: string;
  onChange: (value: string) => void;
  appearance: "light" | "dark";
}

const pythonCompletionOptions = [
  { label: "torch", type: "namespace", detail: "PyTorch" },
  { label: "torch.tensor", type: "function" },
  { label: "torch.randn", type: "function" },
  { label: "torch.zeros", type: "function" },
  { label: "torch.ones", type: "function" },
  { label: "torch.arange", type: "function" },
  { label: "torch.stack", type: "function" },
  { label: "torch.cat", type: "function" },
  { label: "torch.matmul", type: "function" },
  { label: "torch.einsum", type: "function" },
  { label: "torch.softmax", type: "function" },
  { label: "torch.log_softmax", type: "function" },
  { label: "torch.exp", type: "function" },
  { label: "torch.log", type: "function" },
  { label: "torch.sum", type: "function" },
  { label: "torch.mean", type: "function" },
  { label: "torch.manual_seed", type: "function" },
  { label: "torch.no_grad", type: "function" },
  { label: "torch.nn", type: "namespace" },
  { label: "nn.Module", type: "class" },
  { label: "nn.Linear", type: "class" },
  { label: "nn.Embedding", type: "class" },
  { label: "nn.LayerNorm", type: "class" },
  { label: "nn.ReLU", type: "class" },
  { label: "nn.Sequential", type: "class" },
  { label: "F.softmax", type: "function" },
  { label: "F.cross_entropy", type: "function" },
  { label: "F.mse_loss", type: "function" },
  { label: "numpy", type: "namespace", apply: "np" },
  { label: "np.array", type: "function" },
  { label: "range", type: "function" },
  { label: "len", type: "function" },
  { label: "enumerate", type: "function" },
  { label: "zip", type: "function" },
  { label: "print", type: "function" },
  { label: "assert", type: "keyword" },
  { label: "def", type: "keyword" },
  { label: "class", type: "keyword" },
  { label: "return", type: "keyword" },
  { label: "import torch", type: "keyword" },
  { label: "import torch.nn as nn", type: "keyword" },
  { label: "import torch.nn.functional as F", type: "keyword" },
  { label: "import numpy as np", type: "keyword" },
];

function torchleetCompletions(context: CompletionContext) {
  const word = context.matchBefore(/[\w.]+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  return {
    from: word.from,
    options: pythonCompletionOptions,
    validFor: /^[\w.]*$/,
  };
}

const torchleetHighlightStyle = HighlightStyle.define([
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

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "13px",
  },
  ".cm-scroller": {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    lineHeight: "1.55",
  },
  ".cm-content": {
    padding: "14px 0",
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    color: "#64748b",
    borderRight: "1px solid #e2e8f0",
  },
  ".cm-activeLine": {
    backgroundColor: "#eff6ff",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "#bfdbfe",
  },
  ".cm-cursor": {
    borderLeftColor: "#2563eb",
  },
  ".cm-tooltip": {
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "#2563eb",
    color: "#ffffff",
  },
});

const darkEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontSize: "13px",
  },
  ".cm-scroller": {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    lineHeight: "1.55",
  },
  ".cm-content": {
    padding: "14px 0",
  },
  ".cm-gutters": {
    backgroundColor: "#111827",
    color: "#94a3b8",
    borderRight: "1px solid #334155",
  },
  ".cm-activeLine": {
    backgroundColor: "#1e293b",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
  ".cm-cursor": {
    borderLeftColor: "#38bdf8",
  },
  ".cm-tooltip": {
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.4)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "#2563eb",
    color: "#ffffff",
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

export default function CodeEditor({ value, onChange, appearance }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        syntaxHighlighting(
          appearance === "light" ? torchleetHighlightStyle : darkHighlightStyle,
        ),
        bracketMatching(),
        closeBrackets(),
        autocompletion({
          override: [torchleetCompletions],
          activateOnTyping: true,
          icons: true,
          maxRenderedOptions: 12,
        }),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        python(),
        appearance === "light" ? editorTheme : darkEditorTheme,
        keymap.of([
          { key: "Tab", run: acceptCompletion },
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
        ]),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: hostRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [appearance]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    });
  }, [value]);

  return <div ref={hostRef} className="h-full min-h-0" />;
}
