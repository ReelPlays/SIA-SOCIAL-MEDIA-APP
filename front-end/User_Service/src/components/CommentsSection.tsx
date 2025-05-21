// src/components/CommentsSection.tsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { 
  Box, 
  Typography, 
  Button, 
  Divider, 
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import { GET_POST_COMMENTS } from '../graphql/queries';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';
import UserAvatar from './UserAvatar';

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
  const theme = useTheme();
  const [visibleComments, setVisibleComments] = useState(3); // Initial number of comments to display
  
  // Fetch comments for this post
  const { data, loading, error, refetch } = useQuery(GET_POST_COMMENTS, {
    variables: {
      postId,
      limit: 100 // Fetch up to 100 comments initially
    },
    fetchPolicy: 'cache-and-network'
  });
  
  const handleLoadMoreComments = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        <CircularProgress size={24} thickness={4} />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          my: 2,
          borderRadius: 2
        }}
      >
        Error loading comments: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 1 }} onClick={e => e.stopPropagation()}>
      <Divider sx={{ mb: 2 }} />
      
      {currentUserId && (
        <CommentForm
          postId={postId}
          onCommentAdded={handleCommentAdded}
        />
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Comments ({comments.length})
        </Typography>
        
        {!currentUserId && comments.length > 0 && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: theme.palette.primary.main,
              cursor: 'pointer',
              fontWeight: 500,
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => window.location.href = '/login'}
          >
            Sign in to comment
          </Typography>
        )}
      </Box>
      
      {comments.length === 0 ? (
        <Box sx={{ 
          my: 3, 
          textAlign: 'center',
          p: 3,
          bgcolor: 'rgba(0,0,0,0.02)',
          borderRadius: 2
        }}>
          <Typography color="text.secondary">
            No comments yet. Be the first to comment!
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
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
          </Box>
          
          {hasMoreComments && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button 
                onClick={handleLoadMoreComments}
                variant="text"
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: 'rgba(129, 93, 171, 0.05)'
                  }
                }}
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
