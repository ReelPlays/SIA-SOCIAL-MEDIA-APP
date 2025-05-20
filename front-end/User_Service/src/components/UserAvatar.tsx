// src/components/UserAvatar.tsx
import React, { useEffect } from 'react';
import { Avatar, AvatarProps } from '@mui/material';
import { useProfile } from '../ProfileContext';

interface UserAvatarProps extends Omit<AvatarProps, 'src'> {
  userId: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  size?: number;
}

/**
 * A component that displays a user's avatar with automatic profile picture updates.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  firstName,
  lastName,
  profilePictureUrl,
  size = 40,
  sx,
  ...props
}) => {
  const { userProfiles, refreshUserProfile } = useProfile();
  
  // Get the profile from context or use provided props
  const profile = userProfiles[userId];
  
  // Use context data if available, otherwise fall back to props
  const displayName = profile 
    ? `${profile.firstName} ${profile.lastName}`
    : firstName && lastName 
      ? `${firstName} ${lastName}`
      : '';
      
  const avatarUrl = profile?.profilePictureUrl || profilePictureUrl;
  
  // Generate initials for the avatar
  const initials = displayName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  // Generate a consistent color based on userId
  const generateColorFromId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `#${(hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0')}`;
  };
  
  const bgColor = generateColorFromId(userId);
  
  // Fetch the user profile if we don't have it already
  useEffect(() => {
    if (!profile && userId) {
      refreshUserProfile(userId);
    }
  }, [userId, profile, refreshUserProfile]);
  
  return (
    <Avatar
      src={avatarUrl}
      alt={displayName || 'User Avatar'}
      sx={{
        width: size,
        height: size,
        fontSize: size / 2.5,
        bgcolor: bgColor,
        ...sx
      }}
      {...props}
    >
      {!avatarUrl && initials}
    </Avatar>
  );
};

export default UserAvatar;