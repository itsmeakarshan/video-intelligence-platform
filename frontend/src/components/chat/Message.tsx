import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useVideo } from "../../context/VideoContext";
import {
  Sparkles,
  Play,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface Source {
  video_id: number;
  start_time: number;
  end_time: number;
}

interface Props {
  id?: string;
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  isError?: boolean;
  onRegenerate?: () => void;
  onListen?: () => void;
  isSpeaking?: boolean;
}

function parseStartTimestampToSeconds(tsRangeStr: string): number {
  const clean = tsRangeStr.replace(/[()\[\]▶►▸▶️\u25b6\u25ba\u25b8]/g, "").trim();
  const firstPart = clean.split(/[\-–—]|to/i)[0].trim();
  const parts = firstPart.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1 && !isNaN(parts[0])) return parts[0];
  return 0;
}

export default function Message({
  role,
  text,
  sources = [],
  isError = false,
  onRegenerate,
  onListen,
  isSpeaking = false
}: Props) {
  const isUser = role === "user";
  const { videos, selectedVideo, jumpToVideo, seekTo } = useVideo();

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleTimestampClick(tsMatch: string) {
    const startSec = parseStartTimestampToSeconds(tsMatch);
    const sourceVideoId = sources && sources.length > 0 ? sources[0].video_id : null;

    let targetVideo = null;
    if (sourceVideoId) {
      targetVideo = videos.find(v => v.id === sourceVideoId);
    }
    if (!targetVideo) {
      targetVideo = selectedVideo || (videos.length > 0 ? videos[0] : null);
    }

    if (targetVideo && jumpToVideo) {
      jumpToVideo(targetVideo, startSec);
    } else if (seekTo) {
      seekTo(startSec);
    }
  }

  function renderTextWithTimestamps(content: string) {
    const regex = /(?:[▶►▸▶️\u25b6\u25ba\u25b8]\s*)?(?:\(|\[)?\s*(?:[▶►▸▶️\u25b6\u25ba\u25b8]\s*)?\b(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\s*[\-–—to]+\s*(?:\d{1,2}:)?\d{1,2}:\d{2})?\s*(?:\)|\])?/g;
    const elements: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        elements.push(content.substring(lastIndex, match.index));
      }
      const tsMatch = match[0];
      const displayLabel = tsMatch.replace(/[()\[\]▶►▸▶️\u25b6\u25ba\u25b8]/g, "").trim();
      elements.push(
        <button
          key={`${match.index}-${tsMatch}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTimestampClick(tsMatch);
          }}
          className="inline-flex items-center gap-1 mx-1 my-0.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/35 hover:bg-[#E5F842]/30 hover:border-[#E5F842] transition-all cursor-pointer shadow-2xs group"
          title={`Click to jump to ${displayLabel} in video player`}
        >
          <Play className="w-2.5 h-2.5 fill-[#E5F842] text-[#E5F842] group-hover:scale-110 transition-transform" />
          <span>{displayLabel}</span>
        </button>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      elements.push(content.substring(lastIndex));
    }

    return elements.length > 0 ? elements : content;
  }

  function processChild(child: any): any {
    if (typeof child === "string") {
      return renderTextWithTimestamps(child);
    }
    if (Array.isArray(child)) {
      return child.map((c: any, i: number) => (
        <React.Fragment key={i}>{processChild(c)}</React.Fragment>
      ));
    }
    if (React.isValidElement(child)) {
      // Never re-process inside button or code tags to prevent duplicate buttons or nested button errors
      if (child.type === "button" || child.type === "code") {
        return child;
      }
      const props: any = child.props;
      if (props && props.children) {
        const newChildren = Array.isArray(props.children)
          ? props.children.map((c: any, i: number) => <React.Fragment key={i}>{processChild(c)}</React.Fragment>)
          : processChild(props.children);

        return React.cloneElement(child, {}, newChildren);
      }
    }
    return child;
  }

  const renderMarkdownComponents = {
    code: ({ children }: any) => {
      const str = String(children).trim();
      if (/^(?:[▶►▸▶️\u25b6\u25ba\u25b8]\s*)?(?:\(|\[)?\s*(?:[▶►▸▶️\u25b6\u25ba\u25b8]\s*)?(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\s*[\-–—to]+\s*(?:\d{1,2}:)?\d{1,2}:\d{2})?\s*(?:\)|\])?$/.test(str)) {
        const displayLabel = str.replace(/[()\[\]▶►▸▶️\u25b6\u25ba\u25b8]/g, "").trim();
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTimestampClick(str);
            }}
            className="inline-flex items-center gap-1 mx-1 my-0.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/35 hover:bg-[#E5F842]/30 hover:border-[#E5F842] cursor-pointer group"
          >
            <Play className="w-2.5 h-2.5 fill-[#E5F842] text-[#E5F842] group-hover:scale-110 transition-transform" />
            <span>{displayLabel}</span>
          </button>
        );
      }
      return (
        <code className="bg-[#18191E] text-[#E5F842] px-1.5 py-0.5 rounded-md font-mono text-xs border border-[#333642]">
          {children}
        </code>
      );
    },
    strong: ({ children }: any) => {
      return <strong className="font-bold text-white">{processChild(children)}</strong>;
    },
    em: ({ children }: any) => {
      return <em className="italic text-slate-200">{processChild(children)}</em>;
    },
    p: ({ children }: any) => <p className="mb-2.5 last:mb-0 leading-relaxed text-sm text-slate-200">{processChild(children)}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-2.5 space-y-1 text-sm text-slate-200">{processChild(children)}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-sm text-slate-200">{processChild(children)}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{processChild(children)}</li>,
    h1: ({ children }: any) => <h1 className="text-base font-extrabold text-white mt-3 mb-1.5">{processChild(children)}</h1>,
    h2: ({ children }: any) => <h2 className="text-sm font-extrabold text-white mt-2.5 mb-1">{processChild(children)}</h2>,
    h3: ({ children }: any) => <h3 className="text-xs font-bold text-white mt-2 mb-1">{processChild(children)}</h3>
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#E5F842] text-[#121316] font-bold rounded-2xl rounded-br-xs px-4 py-2.5 text-sm leading-relaxed shadow-xs">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-xl bg-[#18191E] text-[#E5F842] flex items-center justify-center shrink-0 mt-0.5 border border-[#333642] shadow-2xs">
        {isError ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Sparkles className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`p-4 rounded-2xl text-slate-200 text-sm border shadow-2xs ${
          isError ? "bg-rose-500/10 border-rose-500/30 text-rose-200" : "bg-[#1E2028] border-[#333642]"
        }`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderMarkdownComponents}>
            {text}
          </ReactMarkdown>
        </div>

        {/* Action Row */}
        {!isError && (
          <div className="flex items-center justify-between mt-1.5 px-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setLiked(!liked); if (disliked) setDisliked(false); }}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-[#E5F842] hover:bg-[#2E313B] transition-colors ${
                  liked ? "text-[#E5F842] bg-[#2E313B]" : ""
                }`}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => { setDisliked(!disliked); if (liked) setLiked(false); }}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#2E313B] transition-colors ${
                  disliked ? "text-rose-400 bg-rose-500/10" : ""
                }`}
                title="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#E5F842] hover:bg-[#2E313B] transition-colors"
                title={copied ? "Copied!" : "Copy response"}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#E5F842]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {onListen && (
                <button
                  type="button"
                  onClick={onListen}
                  className={`p-1.5 rounded-lg text-slate-400 hover:text-[#E5F842] hover:bg-[#2E313B] transition-colors ${
                    isSpeaking ? "text-[#E5F842] bg-[#2E313B] animate-pulse" : ""
                  }`}
                  title={isSpeaking ? "Stop speech" : "Read aloud"}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}

              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#E5F842] hover:bg-[#2E313B] transition-colors"
                  title="Regenerate answer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              Grounded in video transcripts
            </span>
          </div>
        )}

        {isError && onRegenerate && (
          <div className="mt-2">
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/25 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
