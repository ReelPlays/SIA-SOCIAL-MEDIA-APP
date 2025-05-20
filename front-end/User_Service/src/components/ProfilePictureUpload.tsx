// src/components/ProfilePictureUpload.tsx
import React, { useState } from 'react';
import { 
  Box, 
  Avatar, 
  IconButton, 
  CircularProgress, 
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';
import { 
  PhotoCamera 
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';

// Custom event name for profile picture updates
export const PROFILE_PICTURE_UPDATED_EVENT = 'profile_picture_updated';

// Custom event interface
export interface ProfilePictureUpdatedEvent {
  userId: string;
  pictureUrl: string;
  timestamp: number;
}

// Function to dispatch profile picture update event
export const dispatchProfilePictureUpdated = (userId: string, pictureUrl: string) => {
  const eventData: ProfilePictureUpdatedEvent = {
    userId,
    pictureUrl,
    timestamp: Date.now()
  };
  
  // Store in localStorage for cross-tab communication
  localStorage.setItem(PROFILE_PICTURE_UPDATED_EVENT, JSON.stringify(eventData));
  
  // Dispatch custom event for same-tab communication
  window.dispatchEvent(
    new CustomEvent<ProfilePictureUpdatedEvent>(PROFILE_PICTURE_UPDATED_EVENT, { 
      detail: eventData 
    })
  );
  
  console.log(`Profile picture updated for user ${userId}:`, pictureUrl);
};

interface ProfilePictureUploadProps {
  userId: string;
  currentProfilePicture?: string | null;
  size?: number;
  onUploadSuccess?: (url: string) => void;
}

export default function ProfilePictureUpload({
  userId,
  currentProfilePicture,
  size = 150,
  onUploadSuccess
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setImageDialogOpen(true);
      setError(null);
    }
  };
  
  // Handle image upload
  const handleImageUpload = async () => {
    if (!selectedFile || !userId) {
      setError('No image selected or user not logged in');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Generate a unique filename using timestamp
      const fileExt = selectedFile.name.split('.').pop();
      // Simpler path without user ID in folder structure
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
    
      // Upload to Supabase storage - note we're not using a subfolder now
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        throw uploadError;
      }
        
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      
      // Update user profile with new profile picture URL
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ profile_picture_url: publicUrl })
        .eq('id', userId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Dispatch custom event for profile picture update
      dispatchProfilePictureUpdated(userId, publicUrl);
      
      // Call the success callback
      if (onUploadSuccess) {
        onUploadSuccess(publicUrl);
      }
      
      // Close dialog and cleanup
      setImageDialogOpen(false);
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
      setSelectedImage(null);
      setSelectedFile(null);
      
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      setError(error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <Box>
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={
          <Tooltip title="Change profile picture">
            <IconButton
              component="label"
              sx={{
                width: size / 4,
                height: size / 4,
                bgcolor: 'background.paper',
                border: '2px solid #f0f0f0',
                '&:hover': {
                  bgcolor: 'background.default'
                }
              }}
            >
              <PhotoCamera fontSize={size > 100 ? 'small' : 'inherit'} />
              <input
                hidden
                accept="image/*"
                type="file"
                onChange={handleImageSelect}
              />
            </IconButton>
          </Tooltip>
        }
      >
        <Avatar
          src={currentProfilePicture || undefined}
          alt="Profile Picture"
          sx={{
            width: size,
            height: size,
            fontSize: size / 2.5,
            bgcolor: 'primary.main',
            border: `3px solid white`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {!currentProfilePicture && userId ? userId[0]?.toUpperCase() : null}
        </Avatar>
      </Badge>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Image Preview Dialog */}
      <Dialog 
        open={imageDialogOpen} 
        onClose={() => !isUploading && setImageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Profile Picture</DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img
                src={selectedImage}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setImageDialogOpen(false);
              if (selectedImage) {
                URL.revokeObjectURL(selectedImage);
              }
              setSelectedImage(null);
              setSelectedFile(null);
            }} 
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImageUpload} 
            variant="contained" 
            color="primary"
            disabled={isUploading || !selectedImage}
          >
            {isUploading ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}