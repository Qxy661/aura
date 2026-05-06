import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, ChevronDown, Sparkles, MessageCircle, StickyNote, Save, Eye, EyeOff, Brain } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { ScoreBar } from "./ScoreBar";
import { PaperChat } from "./PaperChat";

interface StructuredAnalysis {
  methodology: string;
  key_results: string;
  limitations: string;
  suggested_questions: string[];
}

interface Article {
  id: number;
  title: string;
  url: string;
  source: string;
  authors: string;
  abstract: string;
  summary: string;
  key_points: string;
  relevance_score: number;
  user_relevance_score: number;
  is_saved: boolean;
  is_read: boolean;
  tags: string;
  folder: string;
  notes: string;
  structured_analysis: string | null;
  published_at: string | null;
  fetched_at: string;
}

interface ArticleCardProps {
  article: Article;
  index: number;
  onToggleSave: () => void;
}

export function ArticleCard({ article, index, onToggleSave }: ArticleCardProps) {
  const { showSuccess, showError, ToastContainer } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [localSummary, setLocalSummary] = useState(article.summary);
  const [localKeyPoints, setLocalKeyPoints] = useState(article.key_points);
  const [localScore, setLocalScore] = useState(article.relevance_score);
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(article.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<StructuredAnalysis | null>(() => {
    if (article.structured_analysis) {
      try { return JSON.parse(article.structured_analysis); } catch { return null; }
    }
    return null;
  });
  const [analyzing, setAnalyzing] = useState(false);

  const toggleSave = async () => {
    await api.patch(`/research/articles/${article.id}`, { is_saved: !article.is_saved });
    onToggleSave();
  };

  const toggleRead = async () => {
    await api.patch(`/research/articles/${article.id}`, { is_read: !article.is_read });
    onToggleSave();
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.patch(`/research/articles/${article.id}`, { notes: localNotes });
      showSuccess("笔记已保存");
    } catch {
      showError("保存失败");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeepAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await api.post<{ analysis: StructuredAnalysis }>(
        `/research/articles/${article.id}/analyze-structured`
      );
      setAnalysis(result.analysis);
      setShowAnalysis(true);
      showSuccess("深度分析已生成");
    } catch {
      showError("分析生成失败，请重试");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const result = await api.post<{ summary: string; key_points: string; relevance_score: number }>(
        `/research/articles/${article.id}/summarize`
      );
      setLocalSummary(result.summary);
      setLocalKeyPoints(result.key_points);
      setLocalScore(result.relevance_score);
      showSuccess("AI 摘要已生成");
    } catch {
      showError("摘要生成失败，请重试");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <>
      <div
        className="cute-card p-5 fade-in-up"
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        {/* Tags row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="tag text-[10px]">
            {article.source === "arxiv" ? "📄" : "📰"} {article.source}
          </span>
          {article.is_saved && <span className="tag tag-primary text-[10px]">❤️ 已收藏</span>}
        </div>

        {/* Title */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] font-bold text-[var(--color-foreground)] hover:text-[var(--color-accent-foreground)] transition-colors leading-snug line-clamp-2"
        >
          {article.title}
          <ExternalLink size={11} className="inline ml-1 opacity-40" />
        </a>

        {/* Authors */}
        {article.authors && (
          <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1 truncate">
            ✍️ {article.authors}
          </p>
        )}

        {/* Scores */}
        <div className="flex items-center gap-4 mt-2">
          {localScore > 0 && (
            <ScoreBar score={localScore} label="AI" />
          )}
          {article.user_relevance_score > 0 && (
            <ScoreBar score={article.user_relevance_score} label="个人" />
          )}
        </div>

        {/* Summary */}
        {localSummary ? (
          <div className="mt-3 bg-[var(--color-muted)] rounded-lg px-3 py-2">
            <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              💡 {localSummary}
            </p>
            {localKeyPoints && (
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1.5 leading-relaxed">
                🎯 {localKeyPoints}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-muted)] hover:bg-[var(--color-accent)] transition-all text-[var(--color-accent-foreground)]"
          >
            <Sparkles size={12} className={summarizing ? "animate-spin" : ""} />
            {summarizing ? "AI 分析中..." : "AI 一键摘要"}
          </button>
        )}

        {/* Expand abstract */}
        {article.abstract && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-[var(--color-accent-foreground)] mt-2 font-semibold"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded ? "收起摘要" : "展开摘要"}
          </button>
        )}
        {expanded && (
          <p className="text-xs text-[var(--color-muted-foreground)] mt-2 leading-relaxed">
            {article.abstract}
          </p>
        )}

        {/* Notes */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1 text-[11px] text-[var(--color-accent-foreground)] mt-2 font-semibold"
        >
          <StickyNote size={12} />
          {showNotes ? "收起笔记" : localNotes ? "查看笔记" : "写笔记"}
        </button>
        {showNotes && (
          <div className="mt-2 space-y-2 fade-in-up">
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="写下你的笔记..."
              rows={3}
              className="cute-input resize-none text-xs w-full"
            />
            <div className="flex justify-end">
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="btn-soft text-[10px] px-3 py-1.5 flex items-center gap-1"
              >
                <Save size={11} />
                {savingNotes ? "保存中..." : "保存笔记"}
              </button>
            </div>
          </div>
        )}

        {/* Structured Analysis */}
        {analysis ? (
          <>
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="flex items-center gap-1 text-[11px] text-[var(--color-accent-foreground)] mt-2 font-semibold"
            >
              <Brain size={12} />
              {showAnalysis ? "收起深度分析" : "查看深度分析"}
            </button>
            {showAnalysis && (
              <div className="mt-2 space-y-2 bg-[var(--color-muted)] rounded-lg p-3 fade-in-up">
                <div>
                  <p className="text-[11px] font-bold text-[var(--color-foreground)]">🔬 研究方法论</p>
                  <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 leading-relaxed">{analysis.methodology}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--color-foreground)]">📊 关键结果</p>
                  <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 leading-relaxed">{analysis.key_results}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--color-foreground)]">⚠️ 局限性</p>
                  <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 leading-relaxed">{analysis.limitations}</p>
                </div>
                {analysis.suggested_questions && analysis.suggested_questions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-[var(--color-foreground)]">❓ 深入探讨</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {analysis.suggested_questions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setShowChat(true);
                          }}
                          className="text-[10px] px-2 py-1 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:opacity-80 transition-opacity"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleDeepAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1 text-[11px] text-[var(--color-accent-foreground)] mt-2 font-semibold"
          >
            <Brain size={12} className={analyzing ? "animate-pulse" : ""} />
            {analyzing ? "深度分析中..." : "深度分析"}
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-all text-[var(--color-accent-foreground)]"
            >
              <MessageCircle size={13} />
              对话
            </button>
            <button
              onClick={toggleRead}
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-all"
              title={article.is_read ? "标记为未读" : "标记为已读"}
            >
              {article.is_read ? (
                <Eye size={13} className="text-green-600" />
              ) : (
                <EyeOff size={13} className="text-[var(--color-muted-foreground)]" />
              )}
            </button>
          </div>
          <button
            onClick={toggleSave}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-all"
          >
            {article.is_saved ? (
              <>
                <BookmarkCheck size={13} className="text-[var(--color-primary)]" />
                <span className="text-[var(--color-primary)]">已收藏</span>
              </>
            ) : (
              <>
                <Bookmark size={13} className="text-[var(--color-muted-foreground)]" />
                <span className="text-[var(--color-muted-foreground)]">收藏</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showChat && (
        <PaperChat
          articleId={article.id}
          articleTitle={article.title}
          onClose={() => setShowChat(false)}
        />
      )}
      <ToastContainer />
    </>
  );
}
