"use client";

import { useEffect, useState } from "react";
import { Copy, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type View = "improver" | "responder";

const DEMO_USER_ID = "demo-user";
const EDGY_TEMPLATE =
  "Write a sharp, provocative, but still coherent and concise response. Keep it under 240 characters and avoid hate speech or threats.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fakeStreamFromText(
  text: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const chunks = text.split(" ");

  for (let index = 0; index < chunks.length; index += 1) {
    const token = chunks[index];
    onChunk(index === 0 ? token : ` ${token}`);
    await sleep(30 + Math.random() * 70);
  }
}

function buildImproverOutput(args: {
  draft: string;
  specific: string;
  context: string;
  system: string;
}): string {
  const { draft, specific, context, system } = args;
  return [
    "Revised draft:",
    "",
    `${draft.trim()} ${specific ? `(${specific.trim()})` : ""}`.trim(),
    "",
    context ? `Context used: ${context.trim()}.` : "",
    system ? `System style applied: ${system.trim()}.` : "",
    "",
    "This output is currently streamed from a frontend mock. Next step is wiring `/api/improve` with AI SDK streaming.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildResponderOutput(args: {
  target: string;
  custom: string;
  system: string;
  mode: "custom" | "edgy";
}): string {
  const { target, custom, system, mode } = args;

  if (mode === "edgy") {
    return [
      "Edgy response:",
      "",
      `Hot take on: ${target.trim()}`,
      "",
      `Prompt template: ${EDGY_TEMPLATE}`,
      system ? `Global style constraints: ${system.trim()}.` : "",
      "",
      "This output is currently streamed from a frontend mock. Next step is wiring `/api/respond` with AI SDK streaming.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Custom response:",
    "",
    `Reply to: ${target.trim()}`,
    custom ? `Angle/Tone: ${custom.trim()}` : "",
    system ? `Global style constraints: ${system.trim()}.` : "",
    "",
    "This output is currently streamed from a frontend mock. Next step is wiring `/api/respond` with AI SDK streaming.",
  ]
    .filter(Boolean)
    .join("\n");
}

function Field({
  id,
  label,
  value,
  onChange,
  rows = 3,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground/90">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <textarea
        id={id}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        rows={rows}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </label>
  );
}

function OutputPanel({
  title,
  output,
  streaming,
  copied,
  onCopy,
}: {
  title: string;
  output: string;
  streaming: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground/90">{title}</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={onCopy}
          disabled={!output}
          className="gap-1.5"
        >
          <Copy className="size-3.5" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="min-h-40 rounded-xl border border-border bg-background/70 p-3 text-sm leading-6 whitespace-pre-wrap text-foreground/90">
        {output || "Generated text will appear here in streaming mode."}
        {streaming ? (
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" />
            streaming...
          </span>
        ) : null}
      </div>
    </section>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("improver");
  const storageKey = `user-preferences:${DEMO_USER_ID}:default-system-instructions`;
  const [systemInstructions, setSystemInstructions] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(storageKey) ?? "";
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const [draft, setDraft] = useState("");
  const [specificInstructions, setSpecificInstructions] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [improverOutput, setImproverOutput] = useState("");
  const [improverStreaming, setImproverStreaming] = useState(false);
  const [improverCopied, setImproverCopied] = useState(false);

  const [targetPost, setTargetPost] = useState("");
  const [customAngle, setCustomAngle] = useState("");
  const [responderOutput, setResponderOutput] = useState("");
  const [responderStreaming, setResponderStreaming] = useState(false);
  const [responderCopied, setResponderCopied] = useState(false);

  useEffect(() => {
    let clearStateTimer: number | null = null;

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, systemInstructions);
      setSaveState("saved");

      clearStateTimer = window.setTimeout(() => {
        setSaveState("idle");
      }, 1200);
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
      if (clearStateTimer !== null) {
        window.clearTimeout(clearStateTimer);
      }
    };
  }, [storageKey, systemInstructions]);

  async function streamImprover(): Promise<void> {
    if (!draft.trim()) {
      return;
    }

    setImproverOutput("");
    setImproverStreaming(true);
    setImproverCopied(false);

    const generated = buildImproverOutput({
      draft,
      specific: specificInstructions,
      context: additionalContext,
      system: systemInstructions,
    });

    await fakeStreamFromText(generated, (chunk) => {
      setImproverOutput((previous) => `${previous}${chunk}`);
    });

    setImproverStreaming(false);
  }

  async function streamResponder(mode: "custom" | "edgy"): Promise<void> {
    if (!targetPost.trim()) {
      return;
    }

    setResponderOutput("");
    setResponderStreaming(true);
    setResponderCopied(false);

    const generated = buildResponderOutput({
      target: targetPost,
      custom: customAngle,
      system: systemInstructions,
      mode,
    });

    await fakeStreamFromText(generated, (chunk) => {
      setResponderOutput((previous) => `${previous}${chunk}`);
    });

    setResponderStreaming(false);
  }

  async function copyText(value: string, mode: "improver" | "responder"): Promise<void> {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);

    if (mode === "improver") {
      setImproverCopied(true);
      window.setTimeout(() => setImproverCopied(false), 1400);
      return;
    }

    setResponderCopied(true);
    window.setTimeout(() => setResponderCopied(false), 1400);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#fff3c4,transparent_36%),radial-gradient(circle_at_80%_0%,#d4ecff,transparent_35%),linear-gradient(180deg,#fcfcf7,#f7f8fa)] text-foreground">
      <aside className="border-b border-border/70 bg-background/85 p-4 backdrop-blur md:fixed md:top-0 md:bottom-0 md:left-0 md:w-80 md:border-r md:border-b-0 md:p-5">
        <div className="flex h-full flex-col gap-5">
          <section className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Workspace
            </p>
            <div className="rounded-xl border border-border bg-card/80 p-2">
              <label className="text-xs text-muted-foreground" htmlFor="view-select">
                View Selector
              </label>
              <select
                id="view-select"
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
                value={view}
                onChange={(event) => {
                  setView(event.target.value as View);
                }}
              >
                <option value="improver">Post Improver</option>
                <option value="responder">Edgy Responder</option>
              </select>
            </div>
          </section>

          <section className="flex-1 rounded-xl border border-border bg-card/70 p-3 shadow-sm">
            <label className="mb-2 block text-sm font-semibold" htmlFor="system-instructions">
              Default System Instructions
            </label>
            <textarea
              id="system-instructions"
              className="h-48 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Set default behavior, tone, constraints, and style."
              value={systemInstructions}
              onChange={(event) => {
                setSaveState("saving");
                setSystemInstructions(event.target.value);
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Autosave status: {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Idle"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Current storage key is scoped by user identity placeholder ({DEMO_USER_ID}).
            </p>
          </section>

          <section className="mt-auto rounded-xl border border-border bg-card/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Authenticated User</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="grid size-8 place-content-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                DU
              </div>
              <div>
                <p className="text-sm font-semibold">Demo User</p>
                <p className="text-xs text-muted-foreground">Replace with Clerk &lt;UserButton /&gt;</p>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl p-4 md:ml-80 md:p-8">
        <header className="mb-6 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Tweet Copilot MVP</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {view === "improver" ? "Post Improver" : "Post Responder"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Frontend scaffold prepared from the PRD, including sidebar autosave and streaming-ready output panes.
          </p>
        </header>

        {view === "improver" ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur">
              <Field
                id="draft-post"
                label="Draft Post"
                value={draft}
                onChange={setDraft}
                rows={5}
                required
              />
              <Field
                id="specific-instructions"
                label="Specific Instructions"
                value={specificInstructions}
                onChange={setSpecificInstructions}
              />
              <Field
                id="additional-context"
                label="Additional Context"
                value={additionalContext}
                onChange={setAdditionalContext}
              />
              <Button onClick={() => void streamImprover()} disabled={!draft.trim() || improverStreaming}>
                {improverStreaming ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Improve Draft
                  </>
                )}
              </Button>
            </div>

            <OutputPanel
              title="Revised Post"
              output={improverOutput}
              streaming={improverStreaming}
              copied={improverCopied}
              onCopy={() => void copyText(improverOutput, "improver")}
            />
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur">
              <Field
                id="target-post"
                label="Target Tweet"
                value={targetPost}
                onChange={setTargetPost}
                rows={5}
                required
              />
              <Field
                id="custom-angle"
                label="Custom Angle / Tone"
                value={customAngle}
                onChange={setCustomAngle}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void streamResponder("custom")}
                  disabled={!targetPost.trim() || responderStreaming}
                >
                  {responderStreaming ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Custom Reply"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void streamResponder("edgy")}
                  disabled={!targetPost.trim() || responderStreaming}
                >
                  Edgy Response
                </Button>
              </div>
            </div>

            <OutputPanel
              title="Generated Reply"
              output={responderOutput}
              streaming={responderStreaming}
              copied={responderCopied}
              onCopy={() => void copyText(responderOutput, "responder")}
            />
          </section>
        )}
      </main>
    </div>
  );
}
