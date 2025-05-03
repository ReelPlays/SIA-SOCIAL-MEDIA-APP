// src/graphql/queries.ts
import { gql } from '@apollo/client';

// Query to fetch notifications for the logged-in user
export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications($limit: Int, $offset: Int, $filter: String) {
    getMyNotifications(limit: $limit, offset: $offset, filter: $filter) {
      notificationId
      notificationType
      entityId
      isRead
      createdAt
      triggeringUser {
        accountId
        firstName
        lastName
      }
    }
  }
`;

// Query for listing posts (ensure it includes author and isFollowing)
export const LIST_POSTS = gql`
  query ListPosts { # Add arguments like limit/offset if needed
    listPosts {
      postId
      title
      content
      createdAt
      author {
        accountId
        firstName
        lastName
        isFollowing # Fetch the new field
      }
    }
  }
`;

// *** ADD THIS QUERY DEFINITION ***
export const GET_FEED = gql`
  query GetFeed($limit: Int, $offset: Int) {
    # Use the exact query name from your backend schema
    getFeed(limit: $limit, offset: $offset) {
      postId
      title
      content
      createdAt
      author {
        accountId
        firstName
        lastName
        isFollowing # Needed for FollowButton
      }
    }
  }
`;


/* Optional: If you implement marking as read
export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) # Needs backend implementation
  }
`;
*/