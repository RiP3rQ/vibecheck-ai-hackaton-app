"use client";

import { useEffect, useState } from "react";
import { Copy, LoaderCircle, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type View = "improver" | "responder";

function isView(value: string): value is View {
  return value === "improver" || value === "responder";
}

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
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground/90">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </Label>
      <Textarea
        id={id}
        className="min-h-0 rounded-xl"
        rows={rows}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </div>
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
    <Card className="rounded-2xl border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold tracking-wide text-foreground/90">{title}</CardTitle>
        <CardAction>
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
        </CardAction>
      </CardHeader>

      <CardContent>
      <div className="min-h-40 rounded-xl border border-border bg-background/70 p-3 text-sm leading-6 whitespace-pre-wrap text-foreground/90">
        {output || "Generated text will appear here in streaming mode."}
        {streaming ? (
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" />
            streaming...
          </span>
        ) : null}
      </div>
      </CardContent>
    </Card>
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
            <Card className="rounded-xl border border-border bg-card/80 py-3">
              <CardContent className="space-y-1">
                <Label className="text-xs text-muted-foreground" htmlFor="view-select">
                  View Selector
                </Label>
                <Select
                  value={view}
                  onValueChange={(nextValue) => {
                    if (isView(nextValue)) {
                      setView(nextValue);
                    }
                  }}
                >
                  <SelectTrigger id="view-select" className="mt-1 w-full">
                    <SelectValue placeholder="Pick view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="improver">Post Improver</SelectItem>
                    <SelectItem value="responder">Edgy Responder</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </section>

          <Card className="flex-1 rounded-xl border border-border bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Default System Instructions</CardTitle>
              <CardDescription>
                Set default behavior, tone, constraints, and style.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="system-instructions"
                className="h-48 rounded-xl"
                placeholder="Set default behavior, tone, constraints, and style."
                value={systemInstructions}
                onChange={(event) => {
                  setSaveState("saving");
                  setSystemInstructions(event.target.value);
                }}
              />
            <p className="mt-2 text-xs text-muted-foreground">
              Autosave status{" "}
              <Badge variant={saveState === "saved" ? "secondary" : "outline"} className="ml-1 align-middle">
                {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Idle"}
              </Badge>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Current storage key is scoped by user identity placeholder ({DEMO_USER_ID}).
            </p>
            </CardContent>
          </Card>

          <Card className="mt-auto rounded-xl border border-border bg-card/80 py-3">
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground">Authenticated User</p>
              <div className="mt-2 flex items-center gap-2">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">DU</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">Demo User</p>
                  <p className="text-xs text-muted-foreground">Replace with Clerk &lt;UserButton /&gt;</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl p-4 md:ml-80 md:p-8">
        <Card className="mb-6 rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription className="text-xs font-semibold tracking-[0.2em] uppercase">Tweet Copilot MVP</CardDescription>
            <CardTitle className="mt-1 text-2xl tracking-tight">
              {view === "improver" ? "Post Improver" : "Post Responder"}
            </CardTitle>
            <CardDescription>
              Frontend scaffold prepared from the PRD, including sidebar autosave and streaming-ready output panes.
            </CardDescription>
          </CardHeader>
        </Card>

        {view === "improver" ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

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
            <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

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
