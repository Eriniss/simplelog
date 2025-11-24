export interface User {
    ID: string;
    Username: string;
    Email: string;
    Avatar: string;
    Intro: string;
    Role: string;
    CreatedAt?: string;
    UpdatedAt?: string;
}

export interface Tag {
    ID: number;
    Name: string;
}

export interface Post {
    ID: number;
    Title: string;
    Content: string;
    AuthorID: string;
    AuthorUsername: string;
    AuthorAvatar: string;
    Tags: Tag[];
    IsSecret: boolean;
    CreatedAt: string;
    UpdatedAt: string;
}

export interface Comment {
    ID: number;
    Content: string;
    AuthorID: string;
    AuthorUsername: string;
    AuthorAvatar: string;
    PostID: number;
    ParentID?: number;
    Replies?: Comment[];
    CreatedAt: string;
}
