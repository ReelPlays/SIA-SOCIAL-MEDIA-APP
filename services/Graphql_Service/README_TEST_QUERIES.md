# GraphQL Test Queries Guide

## Overview
This guide explains how to use the test queries provided in `test_queries.graphql` to interact with the Profile Service through GraphQL.

## Prerequisites
- The GraphQL server must be running
- A PostgreSQL database must be properly configured and accessible
- The `DATABASE_URL` environment variable must be set correctly

## Available Test Queries

### 1. Create a Profile
This mutation creates a new profile in the database.

```graphql
mutation CreateProfile {
  createProfile(input: {
    accountId: "acc123" # This should be a valid account ID from your accounts table
    username: "testuser"
    email: "test@example.com"
    password: "securepassword"
    firstName: "Test"
    lastName: "User"
    bio: "This is a test profile"
    profilePictureUrl: "https://example.com/profile.jpg"
    bannerPictureUrl: "https://example.com/banner.jpg"
    dateOfBirth: "1990-01-01"
    address: "123 Test Street"
  }) {
    profileId
    username
    email
    firstName
    lastName
    bio
    profilePictureUrl
    bannerPictureUrl
    dateOfBirth
    address
  }
}
```

**Important Notes:**
- The `accountId` must be a valid ID from your accounts table
- All fields marked with `!` in the schema are required (accountId, username, email, password)
- Other fields are optional

### 2. Get a Profile by ID
This query retrieves a profile by its ID.

```graphql
query GetProfile {
  getProfile(profileId: "acc123") {
    profileId
    username
    email
    firstName
    lastName
    bio
    profilePictureUrl
    bannerPictureUrl
    dateOfBirth
    address
  }
}
```

**Note:** Replace `"acc123"` with the actual profile ID you want to retrieve.

### 3. List All Profiles
This query retrieves all profiles from the database.

```graphql
query ListProfiles {
  listProfiles {
    profileId
    username
    email
    firstName
    lastName
    bio
    profilePictureUrl
    bannerPictureUrl
    dateOfBirth
    address
  }
}
```

## How to Execute Queries

### Using GraphQL Playground
1. Start your GraphQL server
2. Open your browser and navigate to the GraphQL Playground (typically at http://localhost:8080/playground)
3. Copy and paste the desired query from `test_queries.graphql`
4. Click the "Play" button to execute

### Using curl
You can also execute queries using curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  --data '{"query": "mutation { createProfile(input: { accountId: \"acc123\", username: \"testuser\", email: \"test@example.com\", password: \"securepassword\" }) { profileId username email } }"}' \
  http://localhost:8080/query
```

### Using a GraphQL Client
You can use clients like Apollo Client, urql, or graphql-request in your frontend applications to execute these queries.

## Troubleshooting

### Common Errors

1. **"accountId cannot be empty"** - Ensure you're providing a valid account ID that exists in your accounts table.

2. **"failed to connect to database"** - Check that your DATABASE_URL environment variable is set correctly and the database is running.

3. **"profile not found"** - The profile ID you're trying to retrieve doesn't exist in the database.