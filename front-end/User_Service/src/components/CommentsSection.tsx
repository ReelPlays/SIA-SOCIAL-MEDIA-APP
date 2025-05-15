import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { 
  Box, 
  Typography, 
  Button, 
  Divider, 
  CircularProgress,
  Alert
} from '@mui/material';
import { GET_POST_COMMENTS } from '../graphql/queries';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

// Define the Comment interface
interface Comment {
  commentId: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  author: {
    accountId: string;
    firstName: string;
    lastName: string;
  };
}

interface CommentsSectionProps {
  postId: string;
  currentUserId: string | null;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, currentUserId }) => {
  const [visibleComments, setVisibleComments] = useState(5); // Initial number of comments to display
  
  // Fetch comments for this post
  const { data, loading, error, refetch } = useQuery(GET_POST_COMMENTS, {
    variables: {
      postId,
      limit: 100 // Fetch up to 100 comments initially
    },
    fetchPolicy: 'cache-and-network'
  });
  
  const handleLoadMoreComments = () => {
    setVisibleComments(prev => prev + 5);
  };
  
  const handleCommentAdded = () => {
    refetch();
  };
  
  const handleCommentUpdated = () => {
    refetch();
  };
  
  const handleCommentDeleted = () => {
    refetch();
  };
  
  const comments: Comment[] = data?.getPostComments || [];
  const hasMoreComments = comments.length > visibleComments;
  const displayedComments = comments.slice(0, visibleComments);
  
  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Error loading comments: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      
      {currentUserId && (
        <CommentForm
          postId={postId}
          onCommentAdded={handleCommentAdded}
        />
      )}
      
      <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>
        Comments ({comments.length})
      </Typography>
      
      {comments.length === 0 ? (
        <Typography color="text.secondary" sx={{ my: 2, textAlign: 'center' }}>
          No comments yet. Be the first to comment!
        </Typography>
      ) : (
        <>
          {displayedComments.map((comment: Comment) => (
            <CommentItem
              key={comment.commentId}
              comment={comment}
              postId={postId}
              currentUserId={currentUserId}
              onCommentDeleted={handleCommentDeleted}
              onCommentUpdated={handleCommentUpdated}
            />
          ))}
          
          {hasMoreComments && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button 
                onClick={handleLoadMoreComments}
                variant="outlined"
                size="small"
              >
                Load more comments
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default CommentsSection;