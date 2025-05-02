import React, { useEffect } from 'react';
import { useQuery, gql } from '@apollo/client'; // Import useQuery and gql
import { Link as RouterLink } from 'react-router-dom'; // For linking
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert,
  Box,
  Divider,
  Link, // Import MUI Link for consistency within text
  Paper,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns'; // For nice date formatting

// Import your query (ensure it fetches necessary fields)
import { GET_MY_NOTIFICATIONS } from '../graphql/queries';

// Define the expected structure of a notification based on your query
interface TriggeringUser {
  __typename?: 'Account';
  accountId: string;
  firstName: string;
  lastName: string;
}

interface Notification {
  __typename?: 'Notification';
  notificationId: string;
  notificationType: string;
  entityId?: string | null; // Optional ID of related entity (post, user)
  isRead: boolean;
  createdAt: string; // ISO string date
  triggeringUser?: TriggeringUser | null; // User who caused the notification
}

const NotificationsPage: React.FC = () => {
  // Fetch notifications using the imported query
  const { data, loading, error, refetch } = useQuery<{ getMyNotifications: Notification[] }>(
    GET_MY_NOTIFICATIONS,
    {
      // Fetch all notifications, not just unread for this page
      variables: { limit: 50, offset: 0 }, // Adjust limit/offset as needed
      fetchPolicy: 'cache-and-network', // Good for lists that might update
    }
  );

  // Optional: Refetch when the component mounts to ensure fresh data
  useEffect(() => {
    refetch();
  }, [refetch]);

  // --- Helper function to render notification text ---
  const renderNotificationText = (notification: Notification) => {
    const { notificationType, triggeringUser, entityId } = notification;
    const userName = triggeringUser ? `${triggeringUser.firstName} ${triggeringUser.lastName}` : 'Someone';
    const userLink = triggeringUser ? (
       <Link component={RouterLink} to={`/profile/${triggeringUser.accountId}`} fontWeight="bold" underline="hover">
           {userName}
       </Link>
     ) : (
       <Typography component="span" fontWeight="bold">{userName}</Typography>
     );

    switch (notificationType) {
      case 'new_follower':
        // Example: Link entityId (follower's ID) to their profile
        return (
           <Typography component="span" variant="body2">
                {userLink} started following you.
           </Typography>
        );
      case 'new_post': // Assuming you implement this type
        // Example: Link entityId (post ID) to the post page (adjust route)
        return (
            <Typography component="span" variant="body2">
               {userLink} created a new{' '}
               <Link component={RouterLink} to={`/posts/${entityId}`} underline="hover">post</Link>.
            </Typography>
        );
      case 'like': // Assuming you implement this type
         // Example: Link entityId (post ID) to the post page
         return (
            <Typography component="span" variant="body2">
               {userLink} liked your{' '}
               <Link component={RouterLink} to={`/posts/${entityId}`} underline="hover">post</Link>.
            </Typography>
         );
        // Add cases for other notification types (e.g., 'new_comment')
      default:
        return (
            <Typography component="span" variant="body2">
                {userName} triggered a notification ({notificationType}).
            </Typography>
         );
    }
  };

  // --- Render logic ---
  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Error loading notifications: {error.message}</Alert>
        <Button onClick={() => refetch()} sx={{ mt: 1 }}>Retry</Button>
      </Container>
    );
  }

  const notifications = data?.getMyNotifications || [];

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>
      <Paper elevation={1} sx={{borderRadius: 2}}>
         <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, padding: 0 }}>
           {notifications.length === 0 ? (
             <ListItem>
               <ListItemText primary="You have no notifications yet." />
             </ListItem>
           ) : (
             notifications.map((notification, index) => (
               <React.Fragment key={notification.notificationId}>
                 <ListItem
                   alignItems="flex-start"
                   sx={{
                     // Style unread notifications differently
                     bgcolor: notification.isRead ? 'inherit' : 'action.hover',
                     // Add potential click handler later for marking as read/navigating
                     // cursor: 'pointer',
                     // '&:hover': { bgcolor: notification.isRead ? 'action.selected' : 'action.disabledBackground' }
                   }}
                 >
                   <ListItemAvatar>
                     <Avatar sx={{ bgcolor: 'secondary.main' }}>
                       {notification.triggeringUser?.firstName?.[0]?.toUpperCase() ?? '?'}
                     </Avatar>
                   </ListItemAvatar>
                   <ListItemText
                     primary={renderNotificationText(notification)}
                     secondary={
                       <Typography variant="caption" color="text.secondary">
                         {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                       </Typography>
                     }
                     primaryTypographyProps={{component: 'div'}} // Allow complex primary content
                   />
                 </ListItem>
                 {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
               </React.Fragment>
             ))
           )}
         </List>
      </Paper>
    </Container>
  );
};

export default NotificationsPage;