export interface ReviewComment {
  id: string;
  blockId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

export interface ReviewData {
  comments: ReviewComment[];
}
