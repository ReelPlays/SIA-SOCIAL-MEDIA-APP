// src/components/LikeButton.tsx
import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { 
  IconButton, 
  Typography, 
  Box, 
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import { gql } from '@apollo/client';

// Define the like mutations
const LIKE_POST = gql`
  mutation LikePost($postId: ID!) {
    likePost(postId: $postId)
  }
`;

const UNLIKE_POST = gql`
  mutation UnlikePost($postId: ID!) {
    unlikePost(postId: $postId)
  }
`;

interface LikeButtonProps {
  postId: string;
  initialLikeCount: number;
  initialIsLiked: boolean;
  currentUserId?: string | null;
  onLikeUpdate?: (postId: string, isLiked: boolean, likeCount: number) => void;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  postId,
  initialLikeCount,
  initialIsLiked,
  currentUserId,
  onLikeUpdate
}) => {
  const theme = useTheme();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Keep internal state synced with props
  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
  }, [initialIsLiked, initialLikeCount]);
  
  // Like post mutation
  const [likePost, { loading: likeLoading }] = useMutation(LIKE_POST, {
    onCompleted: () => {
      setIsLiked(true);
      setLikeCount(prevCount => prevCount + 1);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
      if (onLikeUpdate) onLikeUpdate(postId, true, likeCount + 1);
    },
    onError: (err) => {
      console.error('Error liking post:', err);
    }
  });
  
  // Unlike post mutation
  const [unlikePost, { loading: unlikeLoading }] = useMutation(UNLIKE_POST, {
    onCompleted: () => {
      setIsLiked(false);
      setLikeCount(prevCount => Math.max(0, prevCount - 1));
      if (onLikeUpdate) onLikeUpdate(postId, false, Math.max(0, likeCount - 1));
    },
    onError: (err) => {
      console.error('Error unliking post:', err);
    }
  });
  
  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return; // Don't allow unauthenticated likes
    
    if (isLiked) {
      unlikePost({ variables: { postId } });
    } else {
      likePost({ variables: { postId } });
    }
  };
  
  const loading = likeLoading || unlikeLoading;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton 
        size="small" 
        onClick={handleLikeToggle}
        disabled={loading || !currentUserId}
        sx={{
          color: isLiked ? theme.palette.error.main : 'inherit',
          transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          '&:hover': {
            color: isLiked ? theme.palette.error.main : theme.palette.error.light,
            bgcolor: isLiked ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)'
          }
        }}
      >
        {loading ? (
          <CircularProgress size={16} color="inherit" />
        ) : isLiked ? (
          <FavoriteIcon fontSize="small" />
        ) : (
          <FavoriteBorderIcon fontSize="small" />
        )}
      </IconButton>
      <Typography 
        variant="body2" 
        color={isLiked ? "error" : "text.secondary"}
        sx={{ 
          ml: 0.5,
          fontWeight: isLiked ? 500 : 400,
          transition: 'all 0.2s ease',
        }}
      >
        {likeCount}
      </Typography>
    </Box>
  );
};

export default LikeButton;