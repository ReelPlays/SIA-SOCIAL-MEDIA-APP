// src/components/EditPostForm.tsx
import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Box,
  Typography,
  Divider
} from '@mui/material';
import { 
  Close as CloseIcon, 
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { UPDATE_POST } from '../graphql/mutations';
import { supabase } from '../lib/supabase';

interface EditPostFormProps {
  open: boolean;
  onClose: () => void;
  post: {
    postId: string;
    title: string;
    content: string;
    createdAt?: string;
    commentsCount?: number;
    author?: {
      accountId: string;
      firstName: string;
      lastName: string;
    };
  };
  onPostUpdated?: () => void;
}

const EditPostForm: React.FC<EditPostFormProps> = ({
  open,
  onClose,
  post,
  onPostUpdated
}) => {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState('');
  const [plainTextContent, setPlainTextContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [keepExistingImage, setKeepExistingImage] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update post mutation
  const [updatePost, { loading }] = useMutation(UPDATE_POST, {
    onCompleted: () => {
      setError(null);
      if (onPostUpdated) onPostUpdated();
      onClose();
    },
    onError: (err) => {
      console.error('Error updating post:', err);
      setError(err.message || 'Failed to update post. Please try again.');
    }
  });

  // Parse content for image when component mounts
  useEffect(() => {
    // Extract image and plain text from content
    const extractImageFromContent = (content: string) => {
      // Look for markdown image syntax: ![alt text](image_url)
      const imageRegex = /!\[.*?\]\((.*?)\)/;
      const match = content.match(imageRegex);
      
      if (match && match[1]) {
        const imageUrl = match[1];
        setCurrentImageUrl(imageUrl);
        
        // Remove the image markdown from content to get plain text
        const plainText = content.replace(imageRegex, '').trim();
        setPlainTextContent(plainText);
        return;
      }
      
      // If no markdown image found, check for HTML img tag
      const htmlImageRegex = /<img.*?src="(.*?)".*?>/;
      const htmlMatch = content.match(htmlImageRegex);
      
      if (htmlMatch && htmlMatch[1]) {
        const imageUrl = htmlMatch[1];
        setCurrentImageUrl(imageUrl);
        
        // Remove the image tag from content to get plain text
        const plainText = content.replace(htmlImageRegex, '').trim();
        setPlainTextContent(plainText);
        return;
      }
      
      // No image found, just use the content as is
      setPlainTextContent(content);
    };
    
    extractImageFromContent(post.content);
  }, [post.content]);

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
      
      // If we're selecting a new image, we're not keeping the existing one
      setKeepExistingImage(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setCurrentImageUrl(null);
    setImagePreview(null);
    setImage(null);
    setKeepExistingImage(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!plainTextContent.trim() && !image && !keepExistingImage) {
      setError('Content is required');
      return;
    }
    
    try {
      let finalContent = plainTextContent;
      
      // Handle image if needed
      if (image) {
        // Upload new image
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
        
        const imageUrl = urlData.publicUrl;
        
        // Add image markdown to content
        finalContent = `${plainTextContent}\n![Post Image](${imageUrl})`;
      } else if (keepExistingImage && currentImageUrl) {
        // Keep existing image
        finalContent = `${plainTextContent}\n![Post Image](${currentImageUrl})`;
      }
      
      // Get the access token from Supabase
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      // Update post
      updatePost({
        variables: {
          input: {
            postId: post.postId,
            title: title.trim(),
            content: finalContent.trim()
          }
        }
      });
    } catch (error: any) {
      console.error('Error preparing post update:', error);
      setError(error.message || 'Failed to update post');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => !loading && onClose()}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Edit post</Typography>
            <IconButton onClick={onClose} disabled={loading}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            variant="outlined"
            InputProps={{
              sx: { borderRadius: 2 }
            }}
          />
          
          <TextField
            fullWidth
            label="Content"
            value={plainTextContent}
            onChange={(e) => setPlainTextContent(e.target.value)}
            margin="normal"
            required
            multiline
            rows={6}
            disabled={loading}
            variant="outlined"
            InputProps={{
              sx: { borderRadius: 2 }
            }}
          />
          
          {/* Image section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Post Image</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {/* Show current image if available */}
            {(currentImageUrl && keepExistingImage) && (
              <Box sx={{ mb: 2, position: 'relative', maxWidth: '100%' }}>
                <Box 
                  component="img"
                  src={currentImageUrl}
                  alt="Current image"
                  sx={{ 
                    maxWidth: '100%',
                    maxHeight: '200px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid #eee'
                  }}
                />
                <IconButton 
                  size="small"
                  onClick={handleRemoveImage}
                  sx={{ 
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.8)'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {/* Show image preview if a new image is selected */}
            {imagePreview && (
              <Box sx={{ mb: 2, position: 'relative', maxWidth: '100%' }}>
                <Box 
                  component="img"
                  src={imagePreview}
                  alt="New image preview"
                  sx={{ 
                    maxWidth: '100%',
                    maxHeight: '200px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid #eee'
                  }}
                />
                <IconButton 
                  size="small"
                  onClick={handleRemoveImage}
                  sx={{ 
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.8)'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {/* Image upload button */}
            {!imagePreview && (!currentImageUrl || !keepExistingImage) && (
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCameraIcon />}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                Upload Image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Button>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            variant="outlined"
            onClick={onClose} 
            disabled={loading}
            sx={{ borderRadius: 5 }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={loading || !title.trim() || (!plainTextContent.trim() && !image && !currentImageUrl)}
            sx={{ borderRadius: 5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditPostForm;