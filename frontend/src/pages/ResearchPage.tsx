import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { FieldSelector } from "@/components/research/FieldSelector";
import { ArticleCard } from "@/components/research/ArticleCard";
import { PaperNetwork } from "@/components/research/PaperNetwork";
import { ResearchSuggestions } from "@/components/research/ResearchSuggestions";
import { RefreshCw, Bookmark, Search, Folder, Tag, Download, SlidersHorizontal, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

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
  tags: string;
  folder: string;
  notes: string;
  published_at: string | null;
  fetched_at: string;
}

interface ArticleList {
  articles: Article[];
  total: number;
}

interface ResearchField {
  id: number;
  name: string;
  name_en: string;
  icon: string;
  is_active: boolean;
}

export default function ResearchPage() {
  const { showError, ToastContainer } = useToast();
  const [savedOnly, setSavedOnly] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [editingFolder, setEditingFolder] = useState<number | null>(null);
  const [folderInput, setFolderInput] = useState("");
  const [editingTags, setEditingTags] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [sortBy, setSortBy] = useState("fetched_at");
  const [smartFiltering, setSmartFiltering] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);

  const { data: fields } = useApi<ResearchField[]>(
    () => api.get("/research/fields")
  );
  const { data: folders } = useApi<string[]>(
    () => api.get("/research/folders")
  );
  const { data: tags } = useApi<string[]>(
    () => api.get("/research/tags")
  );

  useEffect(() => {
    if (fields && fields.length > 0 && selectedFieldId === null) {
      const active = fields.find((f) => f.is_active);
      if (active) setSelectedFieldId(active.id);
    }
  }, [fields, selectedFieldId]);

  const { data, refetch } = useApi<ArticleList>(
    () => {
      let url = `/research/articles?saved_only=${savedOnly}&limit=50&sort_by=${sortBy}`;
      if (selectedFolder) url += `&folder=${encodeURIComponent(selectedFolder)}`;
      if (selectedTag) url += `&tag=${encodeURIComponent(selectedTag)}`;
      if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      return api.get(url);
    },
    [savedOnly, selectedFolder, selectedTag, searchQuery, sortBy]
  );

  const handleFieldSelect = async (fieldId: number) => {
    setSelectedFieldId(fieldId);
    try {
      await api.patch(`/research/fields/${fieldId}`, { is_active: true });
    } catch (e) {
      showError(e instanceof Error ? e.message : "切换方向失败");
    }
  };

  const handleFetch = async () => {
    setFetching(true);
    try {
      const param = selectedFieldId ? `?field_id=${selectedFieldId}` : "";
      await api.post(`/research/fetch${param}`);
      await refetch();
    } catch (e) {
      showError(e instanceof Error ? e.message : "抓取文章失败");
    } finally {
      setFetching(false);
    }
  };

  const articles = data?.articles ?? [];

  const handleUpdateFolder = async (articleId: number) => {
    try {
      await api.patch(`/research/articles/${articleId}`, { folder: folderInput });
      setEditingFolder(null);
      refetch();
    } catch (e) {
      showError(e instanceof Error ? e.message : "更新文件夹失败");
    }
  };

  const handleUpdateTags = async (articleId: number) => {
    try {
      await api.patch(`/research/articles/${articleId}`, { tags: tagInput });
      setEditingTags(null);
      refetch();
    } catch (e) {
      showError(e instanceof Error ? e.message : "更新标签失败");
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (selectedFolder) params.set("folder", selectedFolder);
    if (savedOnly) params.set("saved_only", "true");
    const url = `/api/research/export/markdown${params.toString() ? "?" + params : ""}`;
    window.open(url, "_blank");
  };

  const handleSmartFilter = async () => {
    setSmartFiltering(true);
    try {
      const res = await api.post<{ evaluated: number }>("/research/articles/smart-filter");
      await refetch();
      showError(`AI 已评估 ${res.evaluated} 篇论文的个人相关性`);
    } catch (e) {
      showError(e instanceof Error ? e.message : "AI 筛选失败");
    } finally {
      setSmartFiltering(false);
    }
  };

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="科研雷达"
        subtitle={`共 ${data?.total ?? 0} 篇文章 · AI 为你筛选`}
        mascotMood="thinking"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="btn-soft flex items-center gap-1 text-xs"
              title="导出 Markdown"
            >
              <Download size={13} />
            </button>
            <button
              onClick={handleSmartFilter}
              disabled={smartFiltering}
              className="btn-soft flex items-center gap-1 text-xs"
              title="AI 智能筛选"
            >
              <Sparkles size={13} className={smartFiltering ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleFetch}
              disabled={fetching}
              className="btn-primary flex items-center gap-1.5 text-xs"
            >
              <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
              抓取
            </button>
          </div>
        }
      />

      <FieldSelector
        fields={fields ?? []}
        selectedId={selectedFieldId}
        onSelect={handleFieldSelect}
      />

      {/* Filter tabs + Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSavedOnly(false)}
          className={`tag text-xs cursor-pointer transition-all ${!savedOnly ? "tag-primary" : ""}`}
        >
          全部
        </button>
        <button
          onClick={() => setSavedOnly(true)}
          className={`tag text-xs cursor-pointer transition-all ${savedOnly ? "tag-primary" : ""}`}
        >
          <Bookmark size={10} /> 已收藏
        </button>
        {selectedFolder && (
          <button
            onClick={() => setSelectedFolder("")}
            className="tag text-xs cursor-pointer tag-primary"
          >
            <Folder size={10} /> {selectedFolder} &times;
          </button>
        )}
        {selectedTag && (
          <button
            onClick={() => setSelectedTag("")}
            className="tag text-xs cursor-pointer tag-primary"
          >
            <Tag size={10} /> {selectedTag} &times;
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <SlidersHorizontal size={12} className="text-[var(--color-muted-foreground)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[10px] font-semibold bg-transparent border-none outline-none text-[var(--color-muted-foreground)] cursor-pointer"
          >
            <option value="fetched_at">最新抓取</option>
            <option value="relevance_score">AI 评分</option>
            <option value="user_relevance_score">个人相关性</option>
          </select>
        </div>
      </div>

      {/* Network toggle */}
      <button
        onClick={() => setShowNetwork(!showNetwork)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        🔗 论文关系图
        {showNetwork ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {showNetwork && (
        <PaperNetwork onSelectArticle={(id) => {
          const el = document.getElementById(`article-${id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }} />
      )}

      {/* AI Research Suggestions */}
      <ResearchSuggestions onGoToArticle={(id) => {
        const el = document.getElementById(`article-${id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }} />

      {/* Folder & Tag filters */}
      {(folders && folders.length > 0) && (
        <div className="flex gap-1.5 flex-wrap">
          <Folder size={12} className="text-[var(--color-muted-foreground)] mt-0.5" />
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFolder(selectedFolder === f ? "" : f)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                selectedFolder === f
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {(tags && tags.length > 0) && (
        <div className="flex gap-1.5 flex-wrap">
          <Tag size={12} className="text-[var(--color-muted-foreground)] mt-0.5" />
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(selectedTag === t ? "" : t)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                selectedTag === t
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索文章标题、作者、摘要..."
          className="cute-input pl-9 text-xs"
        />
      </div>

      {/* Article List */}
      {articles.length === 0 ? (
        <div className="cute-card p-10 text-center">
          <div className="text-5xl mb-4">🦴</div>
          <p className="text-sm text-[var(--color-muted-foreground)] font-medium">
            {searchQuery.trim() || selectedFolder || selectedTag ? "没有找到匹配的文章" : "还没有文章哦，选择方向后点击\"抓取\""}
          </p>
        </div>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {articles.map((article, i) => (
            <div key={article.id} id={`article-${article.id}`} className="relative">
              <ArticleCard
                article={article}
                index={i}
                onToggleSave={refetch}
              />
              {/* Folder & Tag editing */}
              <div className="flex items-center gap-2 mt-1 px-1">
                {editingFolder === article.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={folderInput}
                      onChange={(e) => setFolderInput(e.target.value)}
                      placeholder="文件夹名"
                      className="cute-input text-[10px] py-0.5 px-2 w-24"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateFolder(article.id)}
                    />
                    <button onClick={() => handleUpdateFolder(article.id)} className="text-[10px] text-[var(--color-primary)]">✓</button>
                    <button onClick={() => setEditingFolder(null)} className="text-[10px] text-[var(--color-muted-foreground)]">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingFolder(article.id); setFolderInput(article.folder); }}
                    className="flex items-center gap-0.5 text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                  >
                    <Folder size={10} />
                    {article.folder || "分类"}
                  </button>
                )}

                {editingTags === article.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="标签1, 标签2"
                      className="cute-input text-[10px] py-0.5 px-2 w-32"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateTags(article.id)}
                    />
                    <button onClick={() => handleUpdateTags(article.id)} className="text-[10px] text-[var(--color-primary)]">✓</button>
                    <button onClick={() => setEditingTags(null)} className="text-[10px] text-[var(--color-muted-foreground)]">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingTags(article.id); setTagInput(article.tags); }}
                    className="flex items-center gap-0.5 text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                  >
                    <Tag size={10} />
                    {article.tags || "标签"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
