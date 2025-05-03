import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { Button, CircularProgress } from '@mui/material';
import { Add, Check } from '@mui/icons-material';
import { FOLLOW_USER, UNFOLLOW_USER } from '../graphql/mutations';

interface FollowButtonProps {
  userIdToFollow: string;
  initialIsFollowing: boolean;
  currentUserId?: string | null;
  // Add callback prop to notify parent of status change
  onUpdate?: (userId: string, newStatus: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userIdToFollow,
  initialIsFollowing,
  currentUserId,
  onUpdate, // Destructure the new prop
}) => {
  // Internal state still useful for reflecting prop changes
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const [followUser, { loading: followLoading }] = useMutation(FOLLOW_USER, {
      onCompleted: () => {
        setIsFollowing(true);
        onUpdate?.(userIdToFollow, true); // Call callback on success
      },
      onError: (err) => {
          console.error("Follow Error:", err);
          // Revert UI immediately if needed, parent state handles persistence
          setIsFollowing(false);
          onUpdate?.(userIdToFollow, false); // Notify parent of failed attempt revert
      }
  });

  const [unfollowUser, { loading: unfollowLoading }] = useMutation(UNFOLLOW_USER, {
     onCompleted: () => {
       setIsFollowing(false);
       onUpdate?.(userIdToFollow, false); // Call callback on success
     },
      onError: (err) => {
          console.error("Unfollow Error:", err);
          setIsFollowing(true); // Revert UI
          onUpdate?.(userIdToFollow, true); // Notify parent of failed attempt revert
      }
  });

  const handleFollowToggle = () => {
    if (isLoading) return; // Prevent double clicks

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
      sx={{ ml: 1, textTransform: 'none', minWidth: '80px', height: '28px' }} // Adjust styling
    >
      {isLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
    </Button>
  );
};

export default FollowButton;