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

/* Optional: If you implement marking as read
export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) # Needs backend implementation
  }
`;
*/