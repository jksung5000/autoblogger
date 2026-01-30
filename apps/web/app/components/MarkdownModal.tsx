"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

marked.setOptions({ gfm: true, breaks: true });

export function MarkdownModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  markdown: string;
}) {
  const [mode, setMode] = useState<"preview" | "markdown">("preview");

  const html = useMemo(() => {
    try {
      return marked.parse(props.markdown || "") as string;
    } catch {
      return "";
    }
  }, [props.markdown]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="w-[min(96vw,1100px)] h-[min(90vh,900px)] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="pr-2">{props.title}</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant={mode === "preview" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("preview")}
              >
                Preview
              </Button>
              <Button
                variant={mode === "markdown" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("markdown")}
              >
                Markdown
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 pb-4 overflow-auto" style={{ maxHeight: "calc(90vh - 64px)" }}>
          {mode === "preview" ? (
            <div
              className="md-preview max-w-none break-words"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <pre className="text-xs whitespace-pre-wrap break-words rounded-md border bg-muted p-3">
              {props.markdown || ""}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
