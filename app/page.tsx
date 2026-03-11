"use client";

import { TextStreamChatTransport, UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { Copy, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type View = "improver" | "responder";
type ReplyMode = "custom" | "edgy";
const DEFAULT_INSTRUCTIONS_ENDPOINT = "/api/default-system-instructions";

function isView(value: string): value is View {
  return value === "improver" || value === "responder";
}

function getMessageText(message: UIMessage): string {
  let text = "";

  for (const part of message.parts) {
    if (part.type === "text") {
      text += part.text;
    }
  }

  return text.trim();
}

function getLatestAssistantText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "assistant") {
      continue;
    }

    const text = getMessageText(message);

    if (text) {
      return text;
    }
  }

  return "";
}

function PromptField({
  id,
  label,
  description,
  value,
  onChange,
  rows = 3,
  required = false,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </FieldLabel>
      <FieldContent>
        <Textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      </FieldContent>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}

function StreamPanel({
  title,
  description,
  messages,
  status,
  copied,
  onCopy,
  error,
}: {
  title: string;
  description: string;
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  copied: boolean;
  onCopy: () => void;
  error?: string;
}) {
  const streaming = status === "submitted" || status === "streaming";
  const latestOutput = getLatestAssistantText(messages);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction className="flex items-center gap-2">
          <Badge variant={streaming ? "secondary" : "outline"}>
            {streaming ? "Streaming" : "Idle"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            disabled={!latestOutput}
            className="gap-1.5"
          >
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <Conversation className="h-72 rounded-xl border bg-background/70">
          <ConversationContent className="gap-4 p-4">
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="No streamed output yet"
                description="Submit a prompt to start real-time streaming from your backend route."
              />
            ) : (
              messages.map((message) => {
                const text = getMessageText(message);

                if (!text) {
                  return null;
                }

                const from = message.role === "user" ? "user" : "assistant";

                return (
                  <Message key={message.id} from={from}>
                    <MessageContent>
                      <MessageResponse>{text}</MessageResponse>
                    </MessageContent>
                  </Message>
                );
              })
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [view, setView] = useState<View>("improver");
  const storageOwnerId = isSignedIn && user?.id ? user.id : "anonymous";
  const storageKey = useMemo(
    () => `user-preferences:${storageOwnerId}:default-system-instructions`,
    [storageOwnerId],
  );
  const [instructionOverrides, setInstructionOverrides] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [draft, setDraft] = useState("");
  const [specificInstructions, setSpecificInstructions] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [improverCopied, setImproverCopied] = useState(false);

  const [targetPost, setTargetPost] = useState("");
  const [customAngle, setCustomAngle] = useState("");
  const [responderCopied, setResponderCopied] = useState(false);

  const improverTransport = useMemo(
    () => new TextStreamChatTransport({ api: "/api/improve" }),
    [],
  );
  const responderTransport = useMemo(
    () => new TextStreamChatTransport({ api: "/api/respond" }),
    [],
  );

  const {
    messages: improverMessages,
    sendMessage: sendImproverMessage,
    status: improverStatus,
    error: improverError,
  } = useChat({
    id: "improver-stream",
    transport: improverTransport,
  });

  const {
    messages: responderMessages,
    sendMessage: sendResponderMessage,
    status: responderStatus,
    error: responderError,
  } = useChat({
    id: "responder-stream",
    transport: responderTransport,
  });

  const improverBusy = improverStatus === "submitted" || improverStatus === "streaming";
  const responderBusy = responderStatus === "submitted" || responderStatus === "streaming";
  const storedInstructions = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(storageKey) ?? "";
  }, [storageKey]);
  const systemInstructions = instructionOverrides[storageKey] ?? storedInstructions;

  const userDisplayName =
    user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Signed in user";
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userInitials = userDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("") || "U";

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    const loadFromDatabase = async (): Promise<void> => {
      try {
        const response = await fetch(DEFAULT_INSTRUCTIONS_ENDPOINT, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          data?: { defaultSystemInstructions?: string };
        };
        const dbInstructions = payload.data?.defaultSystemInstructions ?? "";

        if (cancelled) {
          return;
        }

        setInstructionOverrides((previous) => ({
          ...previous,
          [storageKey]: dbInstructions,
        }));
        window.localStorage.setItem(storageKey, dbInstructions);
      } catch {
        return;
      }
    };

    void loadFromDatabase();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, storageKey]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let clearStateTimer: number | null = null;

    const timeout = window.setTimeout(() => {
      const persistInstructions = async (): Promise<void> => {
        try {
          window.localStorage.setItem(storageKey, systemInstructions);

          if (isSignedIn) {
            const response = await fetch(DEFAULT_INSTRUCTIONS_ENDPOINT, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ defaultSystemInstructions: systemInstructions }),
            });

            if (!response.ok) {
              throw new Error("Failed to save default instructions.");
            }
          }

          setSaveState("saved");
          clearStateTimer = window.setTimeout(() => {
            setSaveState("idle");
          }, 1200);
        } catch {
          setSaveState("error");
          clearStateTimer = window.setTimeout(() => {
            setSaveState("idle");
          }, 2000);
        }
      };

      void persistInstructions();
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
      if (clearStateTimer !== null) {
        window.clearTimeout(clearStateTimer);
      }
    };
  }, [isLoaded, isSignedIn, storageKey, systemInstructions]);

  async function submitImprover(): Promise<void> {
    if (!draft.trim() || improverBusy) {
      return;
    }

    setImproverCopied(false);

    await sendImproverMessage(
      { text: draft.trim() },
      {
        body: {
          specificInstructions,
          additionalContext,
          defaultSystemInstructions: systemInstructions,
        },
      },
    );
  }

  async function submitResponder(mode: ReplyMode): Promise<void> {
    if (!targetPost.trim() || responderBusy) {
      return;
    }

    setResponderCopied(false);

    await sendResponderMessage(
      { text: targetPost.trim() },
      {
        body: {
          mode,
          customAngleTone: customAngle,
          defaultSystemInstructions: systemInstructions,
        },
      },
    );
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Workspace</CardTitle>
              <CardDescription>Switch between drafting and response modes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={view}
                onValueChange={(nextValue) => {
                  if (isView(nextValue)) {
                    setView(nextValue);
                  }
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="improver">Improver</TabsTrigger>
                  <TabsTrigger value="responder">Responder</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-sm">Default System Instructions</CardTitle>
              <CardDescription>
                Shared guardrails and tone sent with every AI request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field>
                <FieldLabel htmlFor="system-instructions">Global Instructions</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="system-instructions"
                    className="h-48"
                    placeholder="Set default behavior, tone, constraints, and style."
                    value={systemInstructions}
                    onChange={(event) => {
                      setSaveState("saving");
                      setInstructionOverrides((previous) => ({
                        ...previous,
                        [storageKey]: event.target.value,
                      }));
                    }}
                  />
                </FieldContent>
                <FieldDescription>
                  Autosaved to local storage for {storageOwnerId}.
                </FieldDescription>
              </Field>

              <p className="text-xs text-muted-foreground">
                Status{" "}
                <Badge variant={saveState === "saved" ? "secondary" : "outline"}>
                  {saveState === "saving"
                    ? "Saving..."
                    : saveState === "saved"
                      ? "Saved"
                      : saveState === "error"
                        ? "Save failed"
                        : "Idle"}
                </Badge>
              </p>
            </CardContent>
          </Card>

          <Card className="mt-auto">
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground">Authenticated User</p>
              {!isLoaded ? (
                <p className="mt-2 text-xs text-muted-foreground">Loading user details...</p>
              ) : (
                <>
                  <Show when="signed-in">
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{userDisplayName}</p>
                          {userEmail ? (
                            <p className="text-xs text-muted-foreground">{userEmail}</p>
                          ) : null}
                        </div>
                      </div>
                      <UserButton />
                    </div>
                  </Show>

                  <Show when="signed-out">
                    <div className="mt-2 flex gap-2">
                      <SignInButton mode="redirect">
                        <Button size="sm" variant="outline">
                          Sign in
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="redirect">
                        <Button size="sm" variant="outline">
                          Sign up
                        </Button>
                      </SignUpButton>
                    </div>
                  </Show>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl p-4 md:ml-80 md:p-8">
        <Card className="mb-6">
          <CardHeader>
            <CardDescription className="text-xs font-semibold tracking-[0.2em] uppercase">
              Tweet Copilot MVP
            </CardDescription>
            <CardTitle className="text-2xl tracking-tight">
              {view === "improver" ? "Post Improver" : "Post Responder"}
            </CardTitle>
            <CardDescription>
              Streaming is now powered by `useChat` and rendered with `ai-elements`.
            </CardDescription>
          </CardHeader>
        </Card>

        {view === "improver" ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
                <CardDescription>Send one draft and optional guidance to improve it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PromptField
                  id="draft-post"
                  label="Draft Post"
                  description="The base post to improve."
                  value={draft}
                  onChange={setDraft}
                  rows={5}
                  required
                />
                <PromptField
                  id="specific-instructions"
                  label="Specific Instructions"
                  description="Style or intent changes for this run."
                  value={specificInstructions}
                  onChange={setSpecificInstructions}
                />
                <PromptField
                  id="additional-context"
                  label="Additional Context"
                  description="Extra details the model should consider."
                  value={additionalContext}
                  onChange={setAdditionalContext}
                />

                <Button
                  onClick={() => {
                    void submitImprover();
                  }}
                  disabled={!draft.trim() || improverBusy}
                >
                  {improverBusy ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Streaming...
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

            <StreamPanel
              title="Stream Output"
              description="Live stream rendered with ai-elements components."
              messages={improverMessages}
              status={improverStatus}
              copied={improverCopied}
              onCopy={() => {
                void copyText(getLatestAssistantText(improverMessages), "improver");
              }}
              error={improverError?.message}
            />
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
                <CardDescription>Generate a custom or edgy response with streaming.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PromptField
                  id="target-post"
                  label="Target Post"
                  description="The post you want to respond to."
                  value={targetPost}
                  onChange={setTargetPost}
                  rows={5}
                  required
                />
                <PromptField
                  id="custom-angle"
                  label="Custom Angle / Tone"
                  description="Optional framing for custom mode."
                  value={customAngle}
                  onChange={setCustomAngle}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      void submitResponder("custom");
                    }}
                    disabled={!targetPost.trim() || responderBusy}
                  >
                    {responderBusy ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Streaming...
                      </>
                    ) : (
                      "Generate Custom Reply"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void submitResponder("edgy");
                    }}
                    disabled={!targetPost.trim() || responderBusy}
                  >
                    Edgy Response
                  </Button>
                </div>
              </CardContent>
            </Card>

            <StreamPanel
              title="Stream Output"
              description="Real-time response stream from the responder route."
              messages={responderMessages}
              status={responderStatus}
              copied={responderCopied}
              onCopy={() => {
                void copyText(getLatestAssistantText(responderMessages), "responder");
              }}
              error={responderError?.message}
            />
          </section>
        )}
      </main>
    </div>
  );
}
