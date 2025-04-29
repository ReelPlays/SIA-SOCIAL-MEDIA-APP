import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function PostForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('User not logged in.');
      }
      
      // Get user account ID
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('email', userData.user.email)
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
      setTitle('');
      setContent('');
      setImage(null);
      setImagePreview(null);
      
      // Show success message and navigate back
      showSnackbar('Post created successfully!', 'success');
      navigate('/');
    } catch (error: any) {
      console.error('Error creating post:', error);
      showSnackbar(error.message || 'Failed to create post', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Create a New Post
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit}>
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
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="content"
            label="Content"
            name="content"
            multiline
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
          />
          
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCamera />}
              disabled={loading}
            >
              Upload Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </Button>
            {imagePreview && (
              <Box sx={{ position: 'relative', width: 100, height: 100 }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: '4px'
                  }} 
                />
                <IconButton
                  size="small"
                  sx={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: -10,
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'background.default' }
                  }}
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                >
                  ×
                </IconButton>
              </Box>
            )}
          </Stack>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={loading || !title || !content}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Post'
            )}
          </Button>
        </Box>
      </Paper>
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}