// src/components/CreatePostModal.tsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  CircularProgress,
  Typography,
  Alert,
} from '@mui/material';
import { PhotoCamera, Close as CloseIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import UserAvatar from './UserAvatar'; 

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
  currentUser: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_picture_url?: string;
    email?: string;
  } | null;
}

export default function CreatePostModal({ 
  open, 
  onClose, 
  onPostCreated,
  currentUser 
}: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Fix: Safely access first_name and last_name properties with optional chaining
  const userName = currentUser?.first_name || 'User';
  // Fix: Safely access first character with optional chaining and provide fallbacks
  const userInitials = currentUser 
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`
    : '';

  // Handle image selection
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImage(file);
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form state
  const resetForm = () => {
    setTitle('');
    setContent('');
    setImage(null);
    setImagePreview(null);
    setError('');
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    
    if (!currentUser) {
      setError('You must be logged in to create a post');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Get user account ID
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', currentUser.id)
        .single();
      
      if (accountError || !accountData) {
        throw new Error('Could not find user account.');
      }
      
      const authorId = accountData.id;
      
      // Upload image if one was selected
      let imageUrl = null;
      if (image) {
        const fileName = `${Date.now()}-${image.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, image);
        
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error('Failed to upload image.');
        }
        
        // Get public URL for the uploaded image
        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }
      
      // Create post in Supabase
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          title,
          content: imageUrl ? `${content}\n![Post Image](${imageUrl})` : content,
          author_id: authorId,
        });

      if (postError) {
        throw postError;
      }
      
      // Reset form
      resetForm();
      
      // Call callback function
      if (onPostCreated) {
        onPostCreated();
      }
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error creating post:', error);
      setError(error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflowY: 'visible'
        }
      }}
    >
      {/* Title with close button */}
      <DialogTitle sx={{ pb: 1 }}>
        Create Post
      </DialogTitle>
      {/* Add close button separately */}
      <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleClose}
          aria-label="close"
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      
      <DialogContent dividers sx={{ py: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
       <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        {currentUser && (
            <UserAvatar 
            userId={currentUser.id}
            firstName={currentUser.first_name}
            lastName={currentUser.last_name}
            profilePictureUrl={currentUser.profile_picture_url}
            size={40}
            sx={{ 
                mr: 2
            }}
            />
        )}
        
        <Typography variant="subtitle1" fontWeight="medium">
            {currentUser?.first_name || ''} {currentUser?.last_name || ''}
        </Typography>
        </Box>
                
        <TextField
          margin="normal"
          required
          fullWidth
          id="title"
          label="Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          id="content"
          label="What's on your mind?"
          name="content"
          multiline
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<PhotoCamera />}
            disabled={loading}
            sx={{ borderRadius: 5 }}
          >
            Add Image
            <input
              hidden
              accept="image/*"
              type="file"
              onChange={handleImageChange}
            />
          </Button>
          
          {imagePreview && (
            <Box sx={{ mt: 2, position: 'relative', maxWidth: '100%' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '200px',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }} 
              />
              <IconButton
                size="small"
                sx={{ 
                  position: 'absolute', 
                  top: 5, 
                  right: 5,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': { 
                    bgcolor: 'rgba(0,0,0,0.7)' 
                  }
                }}
                onClick={() => {
                  setImage(null);
                  setImagePreview(null);
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{ borderRadius: 5 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !title.trim() || !content.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{ borderRadius: 5 }}
        >
          {loading ? 'Posting...' : 'Post'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
