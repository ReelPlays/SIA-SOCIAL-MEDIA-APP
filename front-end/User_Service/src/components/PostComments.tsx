// src/components/PostComments.tsx
import React from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  Typography,
  CircularProgress,
  useTheme
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { GET_POST_COMMENTS } from '../graphql/queries';
import UserAvatar from './UserAvatar'; // Add this import

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

interface PostCommentsProps {
  postId: string;
}

const PostComments: React.FC<PostCommentsProps> = ({ postId }) => {
  const theme = useTheme();
  
  // Use Apollo useQuery to fetch comments for this post
  const { data, loading, error } = useQuery(GET_POST_COMMENTS, {
    variables: { postId, limit: 20 }
  });
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="error" align="center">
          Error loading comments: {error.message}
        </Typography>
      </Box>
    );
  }
  
  const comments = data?.getPostComments || [];
  
  return (
    <Box>
      {comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center">
          No comments yet. Be the first to comment!
        </Typography>
      ) : (
        comments.map((comment: Comment) => (
          <Box 
            key={comment.commentId}
            sx={{ 
              display: 'flex', 
              mb: 2,
              alignItems: 'flex-start'
            }}
          >
            {/* Replace Avatar with UserAvatar */}
            <UserAvatar 
              userId={comment.author.accountId}
              firstName={comment.author.firstName}
              lastName={comment.author.lastName}
              size={32}
              sx={{ 
                mr: 1.5,
                bgcolor: theme.palette.primary.main
              }}
            />
            <Box>
              <Box sx={{ 
                bgcolor: 'rgba(0,0,0,0.04)', 
                borderRadius: 2,
                p: 1.5
              }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {comment.author.firstName} {comment.author.lastName}
                </Typography>
                <Typography variant="body2">
                  {comment.content}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
};

export default PostComments;