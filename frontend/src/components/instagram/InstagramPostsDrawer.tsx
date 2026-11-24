import { useState, useEffect } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  Video,
  Layers,
  Smile,
  Frown,
  Minus,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  instagramApi,
  type InstagramAccount,
  type InstagramPost,
  type InstagramComment,
} from '../../api/instagramApi';

interface InstagramPostsDrawerProps {
  businessId: string;
  account: InstagramAccount;
  onClose: () => void;
}

export default function InstagramPostsDrawer({
  businessId,
  account,
  onClose,
}: InstagramPostsDrawerProps) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected post comments modal / expansion
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [account.id, businessId]);

  const loadPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await instagramApi.listPosts(businessId, account.id, 50, 0);
      setPosts(res.posts);
      setTotalPosts(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load Instagram posts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommentsForPost = async (postId: string) => {
    if (selectedPostId === postId) {
      setSelectedPostId(null);
      return;
    }
    setSelectedPostId(postId);
    setIsLoadingComments(true);
    try {
      const res = await instagramApi.listComments(businessId, postId, 50, 0);
      setComments(res.comments);
    } catch (err: any) {
      console.warn('Failed to load comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const getMediaIcon = (type?: string | null) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('video') || lower.includes('reel')) {
      return <Video className="w-3.5 h-3.5 text-[#4ade80]" />;
    }
    if (lower.includes('sidecar') || lower.includes('carousel')) {
      return <Layers className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <ImageIcon className="w-3.5 h-3.5 text-[#a3a3a3]" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#171717] border-l border-[#262626] h-full flex flex-col text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                {account.profile_pic_url ? (
                  <img
                    src={account.profile_pic_url}
                    alt={account.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-xs uppercase text-zinc-300">
                    {account.username.slice(0, 2)}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-light text-xl text-white tracking-[-0.01em]">@{account.username}</h3>
                <a
                  href={account.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#737373] hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-[11px] text-[#a3a3a3] font-mono">
                {totalPosts} ingested posts & reels
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#262626] bg-[#1f1f1f] hover:bg-[#262626] text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-6 h-6 text-[#4ade80] animate-spin" />
              <p className="text-xs text-[#a3a3a3] font-mono">Loading ingested posts & media...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl border border-rose-900/40 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#262626] rounded-2xl bg-[#141414] space-y-2">
              <MessageSquare className="w-8 h-8 text-[#737373] mx-auto" />
              <p className="text-xs text-white font-medium">No posts ingested yet</p>
              <p className="text-[11px] text-[#737373]">
                Trigger a synchronization to scrape the latest posts and reels via Apify.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-2xl border border-[#262626] bg-[#141414] space-y-3 transition-colors hover:border-[#404040]"
              >
                {/* Post Top Row */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-full bg-[#1f1f1f] border border-[#262626]">
                      {getMediaIcon(post.content_type)}
                    </span>
                    <span className="text-[11px] font-mono text-[#a3a3a3] capitalize">
                      {post.content_type || 'Post'}
                    </span>
                    {post.published_at && (
                      <>
                        <span className="text-[#404040]">•</span>
                        <span className="text-[11px] font-mono text-[#737373]">
                          {new Date(post.published_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>

                  <a
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#4ade80] hover:underline transition-colors font-mono"
                  >
                    <span>View on IG</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Caption */}
                {post.caption ? (
                  <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line line-clamp-4">
                    {post.caption}
                  </p>
                ) : (
                  <p className="text-xs text-[#737373] italic">No caption provided</p>
                )}

                {/* AI Classification & Engagement row */}
                <div className="pt-2 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 text-[#a3a3a3]">
                      <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                      <span>{post.likes_count != null ? post.likes_count.toLocaleString() : '–'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => loadCommentsForPost(post.id)}
                      className="flex items-center gap-1.5 text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>{post.comments_count != null ? post.comments_count.toLocaleString() : '–'}</span>
                      <span className="text-[10px] text-[#737373] underline ml-0.5">
                        {selectedPostId === post.id ? 'Hide Comments' : 'View Comments'}
                      </span>
                    </button>
                  </div>

                  {/* AI Classification Badge */}
                  {post.ai_analysis && (
                    <div className="flex items-center gap-1.5">
                      {post.ai_analysis.classification === 'business_promotional' ? (
                        <span
                          title="Authored by the brand as promotional content. Not counted towards customer sentiment."
                          className="px-2.5 py-0.5 rounded-full font-mono text-[10px] bg-[#1f1f1f] text-[#a3a3a3] border border-[#262626]"
                        >
                          Promotional
                        </span>
                      ) : post.ai_analysis.sentiment_label ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] flex items-center gap-1 border font-semibold ${
                            post.ai_analysis.sentiment_label === 'positive'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                              : post.ai_analysis.sentiment_label === 'negative'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                              : 'bg-[#1f1f1f] text-[#a3a3a3] border-[#262626]'
                          }`}
                        >
                          {post.ai_analysis.sentiment_label === 'positive' ? (
                            <Smile className="w-3 h-3" />
                          ) : post.ai_analysis.sentiment_label === 'negative' ? (
                            <Frown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          <span className="capitalize">{post.ai_analysis.sentiment_label}</span>
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Expandable Comments Drawer */}
                {selectedPostId === post.id && (
                  <div className="mt-3 p-4 rounded-xl bg-[#0a0a0a] border border-[#262626] space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#a3a3a3] border-b border-[#262626] pb-1.5">
                      <span>Public Customer Comments</span>
                      <span className="font-mono text-[#737373]">{comments.length} loaded</span>
                    </div>

                    {isLoadingComments ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-xs text-[#a3a3a3] font-mono">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4ade80]" />
                        <span>Loading comments...</span>
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-[#737373] italic py-2">
                        No public comments returned by the scraper for this post.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {comments.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl bg-[#141414] border border-[#262626] space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10.5px]">
                              <span className="font-semibold text-white">
                                @{c.author_username || 'customer'}
                              </span>

                              {c.ai_analysis?.sentiment_label && (
                                <span
                                  className={`px-2 py-0.5 rounded-full font-mono text-[9px] uppercase font-semibold ${
                                    c.ai_analysis.sentiment_label === 'positive'
                                      ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                                      : c.ai_analysis.sentiment_label === 'negative'
                                      ? 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
                                      : 'text-[#a3a3a3] bg-[#1f1f1f] border border-[#262626]'
                                  }`}
                                >
                                  {c.ai_analysis.sentiment_label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-200 leading-normal">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
