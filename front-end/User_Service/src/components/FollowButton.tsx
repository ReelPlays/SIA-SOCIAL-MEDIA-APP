// src/components/FollowButton.tsx
import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { Button, CircularProgress, useTheme } from '@mui/material';
import { Add, Check } from '@mui/icons-material';
import { FOLLOW_USER, UNFOLLOW_USER } from '../graphql/mutations';

interface FollowButtonProps {
  userIdToFollow: string;
  initialIsFollowing: boolean;
  currentUserId?: string | null;
  onUpdate?: (userId: string, newStatus: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userIdToFollow,
  initialIsFollowing,
  currentUserId,
  onUpdate,
}) => {
  const theme = useTheme();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const [followUser, { loading: followLoading }] = useMutation(FOLLOW_USER, {
    onCompleted: () => {
      setIsFollowing(true);
      onUpdate?.(userIdToFollow, true);
    },
    onError: (err) => {
      console.error("Follow Error:", err);
      setIsFollowing(false);
      onUpdate?.(userIdToFollow, false);
    }
  });

  const [unfollowUser, { loading: unfollowLoading }] = useMutation(UNFOLLOW_USER, {
    onCompleted: () => {
      setIsFollowing(false);
      onUpdate?.(userIdToFollow, false);
    },
    onError: (err) => {
      console.error("Unfollow Error:", err);
      setIsFollowing(true);
      onUpdate?.(userIdToFollow, true);
    }
  });

  const handleFollowToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;

    if (isFollowing) {
      unfollowUser({ variables: { userIdToUnfollow: userIdToFollow } });
    } else {
      followUser({ variables: { userIdToFollow: userIdToFollow } });
    }
  };

  if (currentUserId === userIdToFollow) {
    return null;
  }

  const isLoading = followLoading || unfollowLoading;

  return (
    <Button
      variant={isFollowing ? "outlined" : "contained"}
      size="small"
      onClick={handleFollowToggle}
      disabled={isLoading}
      startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : (isFollowing ? <Check /> : <Add />)}
      sx={{ 
        ml: 1, 
        minWidth: '90px', 
        height: '32px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        textTransform: 'none',
        fontWeight: 600,
        boxShadow: 'none',
        borderColor: isFollowing ? theme.palette.primary.main : 'transparent',
        color: isFollowing ? theme.palette.primary.main : '#fff',
        '&:hover': {
          boxShadow: 'none',
          borderColor: isFollowing ? theme.palette.primary.dark : 'transparent',
          backgroundColor: isFollowing ? 'rgba(129, 93, 171, 0.1)' : theme.palette.primary.dark,
        }
      }}
    >
      {isLoading ? 'Loading...' : (isFollowing ? 'Following' : 'Follow')}
    </Button>
  );
};

export default FollowButton;