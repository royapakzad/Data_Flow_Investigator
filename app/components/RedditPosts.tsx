"use client";

import { useEffect, useState } from "react";
import type { RedditPost } from "@/lib/types";

interface Props {
  vendorName: string;
}

function timeAgo(utc: number): string {
  const seconds = Math.floor(Date.now() / 1000 - utc);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

const ECE_SUBREDDITS = new Set([
  "eceprofessionals", "preschool", "childcare", "teachers",
  "education", "edtech", "parenting", "teaching", "privacy", "k12sysadmin",
]);

function SubredditBadge({ name }: { name: string }) {
  const isEce = ECE_SUBREDDITS.has(name.toLowerCase());
  return (
    <a
      href={`https://www.reddit.com/r/${name}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-xs px-2 py-0.5 rounded font-medium hover:opacity-80 transition-opacity ${
        isEce
          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
          : "bg-slate-700 text-slate-400 border border-slate-600"
      }`}
    >
      r/{name}
    </a>
  );
}

function PostCard({ post }: { post: RedditPost }) {
  const score = post.score >= 1000
    ? `${(post.score / 1000).toFixed(1)}k`
    : String(post.score);

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-2 hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-3">
        {/* Score */}
        <div className="shrink-0 text-center min-w-[36px]">
          <p className="text-sm font-bold text-slate-300">{score}</p>
          <p className="text-xs text-slate-600">pts</p>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title */}
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-200 hover:text-blue-300 transition-colors leading-snug line-clamp-2"
          >
            {post.title}
          </a>

          {/* Preview text */}
          {post.preview && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {post.preview}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <SubredditBadge name={post.subreddit} />
            {post.flair && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                {post.flair}
              </span>
            )}
            <span className="text-xs text-slate-600">
              by u/{post.author}
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-600">{timeAgo(post.createdUtc)}</span>
            <span className="text-xs text-slate-600">·</span>
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              {post.numComments} comments ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RedditPosts({ vendorName }: Props) {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (!vendorName) return;
    setStatus("loading");
    setPosts([]);

    fetch(`/api/reddit?q=${encodeURIComponent(vendorName)}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts ?? []);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, [vendorName]);

  const ecePosts = posts.filter((p) => ECE_SUBREDDITS.has(p.subreddit.toLowerCase()));
  const otherPosts = posts.filter((p) => !ECE_SUBREDDITS.has(p.subreddit.toLowerCase()));

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 text-slate-500 text-sm py-4">
        <div className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
        Searching Reddit for community discussions…
      </div>
    );
  }

  if (status === "error") {
    return (
      <p className="text-sm text-slate-500 italic">
        Could not load Reddit posts — Reddit may be unavailable or rate-limiting requests.
      </p>
    );
  }

  if (status === "done" && posts.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No Reddit posts found in education subreddits for "{vendorName}".
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        {posts.length} posts from Reddit — live data, not AI-generated.
        ECE-relevant subreddits shown first.{" "}
        <a
          href={`https://www.reddit.com/search/?q=${encodeURIComponent(vendorName)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Search Reddit directly ↗
        </a>
      </p>

      {ecePosts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Early Childhood Education &amp; Education Subreddits
          </p>
          {ecePosts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}

      {otherPosts.length > 0 && (
        <div className="space-y-3">
          {ecePosts.length > 0 && (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Other Mentions
            </p>
          )}
          {otherPosts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}
