import { create } from "zustand";
import type { ReviewComment, ReviewData } from "../types/review";

const AUTHOR_KEY = "lextyp_review_author";

interface ReviewState {
  reviewMode: boolean;
  comments: ReviewComment[];
  authorName: string;
  selectedCommentId: string | null;

  setReviewMode: (on: boolean) => void;
  loadReviews: (data: ReviewData | null) => void;
  addComment: (
    blockId: string,
    startOffset: number,
    endOffset: number,
    text: string
  ) => void;
  resolveComment: (id: string) => void;
  unresolveComment: (id: string) => void;
  deleteComment: (id: string) => void;
  updateComment: (id: string, text: string) => void;
  setAuthorName: (name: string) => void;
  setSelectedComment: (id: string | null) => void;
  clear: () => void;
  toJSON: () => string;
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviewMode: false,
  comments: [],
  authorName: localStorage.getItem(AUTHOR_KEY) || "",
  selectedCommentId: null,

  setReviewMode: (on) => set({ reviewMode: on }),

  loadReviews: (data) => {
    if (data && data.comments.length > 0) {
      set({ comments: data.comments });
    } else {
      set({ comments: [] });
    }
  },

  addComment: (blockId, startOffset, endOffset, text) => {
    const comment: ReviewComment = {
      id: generateId(),
      blockId,
      startOffset,
      endOffset,
      text,
      author: get().authorName || "Anonymous",
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    set((s) => ({ comments: [...s.comments, comment] }));
  },

  resolveComment: (id) =>
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === id ? { ...c, resolved: true } : c
      ),
    })),

  unresolveComment: (id) =>
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === id ? { ...c, resolved: false } : c
      ),
    })),

  deleteComment: (id) =>
    set((s) => ({
      comments: s.comments.filter((c) => c.id !== id),
      selectedCommentId:
        s.selectedCommentId === id ? null : s.selectedCommentId,
    })),

  updateComment: (id, text) =>
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === id ? { ...c, text } : c
      ),
    })),

  setAuthorName: (name) => {
    localStorage.setItem(AUTHOR_KEY, name);
    set({ authorName: name });
  },

  setSelectedComment: (id) => set({ selectedCommentId: id }),

  clear: () => set({ reviewMode: false, comments: [], selectedCommentId: null }),

  toJSON: () => {
    const { comments } = get();
    const data: ReviewData = { comments };
    return JSON.stringify(data);
  },
}));
