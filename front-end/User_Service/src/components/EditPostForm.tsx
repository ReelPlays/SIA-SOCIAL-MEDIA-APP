// src/components/EditPostForm.tsx
import React, { useState } from 'react';
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
  Typography
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
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
  const [content, setContent] = useState(post.content);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    // Get the access token from Supabase
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      updatePost({
        variables: {
          input: {
            postId: post.postId,
            title: title.trim(),
            content: content.trim()
          }
        },
        context: {
          headers: {
            "Authorization": `Bearer ${token}`,
          }
        }
      });
    });
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
            disabled={loading || !title.trim() || !content.trim()}
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