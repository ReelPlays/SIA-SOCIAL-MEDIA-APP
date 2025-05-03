// src/graphql/mutations.ts (or add to queries.ts)
import { gql } from '@apollo/client';

export const FOLLOW_USER = gql`
  mutation FollowUser($userIdToFollow: ID!) {
    followUser(userIdToFollow: $userIdToFollow) {
      accountId # Return fields needed to update cache, if any
      isFollowing # Crucially, return the NEW follow status
    }
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUser($userIdToUnfollow: ID!) {
    unfollowUser(userIdToUnfollow: $userIdToUnfollow) {
      accountId # Return fields needed to update cache, if any
      isFollowing # Crucially, return the NEW follow status
    }
  }
`;