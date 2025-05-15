import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { 
  IconButton, 
  Typography, 
  Box, 
  CircularProgress 
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
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  
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
  
  const handleLikeToggle = () => {
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
        color={isLiked ? 'error' : 'default'}
      >
        {loading ? (
          <CircularProgress size={16} color="inherit" />
        ) : isLiked ? (
          <FavoriteIcon fontSize="small" />
        ) : (
          <FavoriteBorderIcon fontSize="small" />
        )}
      </IconButton>
      <Typography variant="body2" color="text.secondary">
        {likeCount}
      </Typography>
    </Box>
  );
};

export default LikeButton;