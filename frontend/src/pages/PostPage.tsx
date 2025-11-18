import React from 'react';
import { useParams } from 'react-router-dom';
import { PostDetail } from '../components/PostDetail';
import { Comments } from '../components/Comments';
import { usePost } from '../hooks/usePosts';
import { useComments } from '../hooks/useComments';
import { useAuth } from '../hooks/useAuth';

export const PostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const postId = parseInt(id || '0', 10);
  const { post, loading: postLoading, refetch: refetchPost } = usePost(postId);
  const { comments, refetch: refetchComments } = useComments(postId);
  const { user } = useAuth();

  if (postLoading) {
    return (
      <main className="container">
        <div className="loading">로딩 중...</div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="container">
        <div className="empty-state">글을 찾을 수 없습니다.</div>
      </main>
    );
  }

  return (
    <main className="container">
      <div id="single-post-view">
        <PostDetail post={post} user={user} onDeleted={refetchPost} />
        <Comments
          postId={postId}
          comments={comments}
          user={user}
          onUpdate={refetchComments}
        />
      </div>
    </main>
  );
};
