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
  Box
} from '@mui/material';
import { UPDATE_POST } from '../graphql/mutations';

interface EditPostFormProps {
  open: boolean;
  onClose: () => void;
  post: {
    postId: string;
    title: string;
    content: string;
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
    
    updatePost({
      variables: {
        input: {
          postId: post.postId,
          title: title.trim(),
          content: content.trim()
        }
      }
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => !loading && onClose()}
      fullWidth
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Post</DialogTitle>
        
        <DialogContent>
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
          />
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={loading || !title.trim() || !content.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditPostForm;