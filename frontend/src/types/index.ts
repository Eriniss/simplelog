export interface User {
  ID: string;
  Username: string;
  Email: string;
  Avatar?: string;
  Intro?: string;
  Role: 'admin' | 'user';
}

export interface Post {
  ID: number;
  Title: string;
  Content: string;
  AuthorID: string;
  AuthorUsername: string;
  AuthorAvatar?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Comment {
  ID: number;
  Content: string;
  PostID: number;
  AuthorID: string;
  AuthorUsername: string;
  AuthorAvatar?: string;
  ParentID?: number;
  Replies?: Comment[];
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
}

export interface UpdatePostRequest {
  title: string;
  content: string;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: number;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface UpdateProfileRequest {
  intro?: string;
  avatar?: string;
}
