# ConnectMe

A modern social media platform built with React, GraphQL, and PostgreSQL.

## 📱 Features

- **User Authentication**: Sign up, login, and profile management
- **Social Feed**: View posts from users you follow
- **Posts**: Create, read, update, and delete posts
- **Social Interactions**: Like, comment, and follow/unfollow users
- **Real-time Notifications**: Get notified about new followers, comments, and likes
- **Responsive UI**: Works seamlessly on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- React 19.0
- TypeScript
- Vite
- Material UI 7.0
- Apollo Client for GraphQL
- React Router DOM
- Supabase Auth

### Backend
- Go 1.24
- GraphQL (gqlgen)
- PostgreSQL
- Supabase for user authentication & storage
- JWT for authentication

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Go (1.20+)
- PostgreSQL (14+)
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/connectme.git
cd connectme
```

## 🗄️ Database Setup

1. Install PostgreSQL if you haven't already
2. Create a new database:

```bash
createdb social_media_app
```

3. Run the migrations:

```bash
cd SocMed/services/Graphql_Service
# Install goose migration tool if needed
go install github.com/pressly/goose/v3/cmd/goose@latest

# Run migrations
goose postgres "postgres://username:password@localhost:5432/social_media_app?sslmode=disable" up
```

## 🔧 Backend Setup

1. Configure the environment variables:

```bash
cd SocMed/services/Graphql_Service
```

The project is already configured to use a .env file. Create or modify the existing .env file with the following variables:

```
DATABASE_URL=postgresql://postgres.rxcnpwloayzveduaksnq:Loser123321@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
PORT=8080

SUPABASE_JWT_SECRET=w9mU3DTDbCk00t9Lu7GDvm5r1a5GEsxpUc2PwoHSocqo3GWUZplfzat91NZ7jm0d847F2Cw0lH4wJNgRDRQa1w==
```

2. Install dependencies and run the GraphQL server:

```bash
go mod download
go run server.go
```

The GraphQL server should now be running at http://localhost:8080, and the GraphQL playground at http://localhost:8080/

## 🖥️ Frontend Setup


1. Install dependencies and start the frontend:

```bash
cd SocMed/front-end/User_Service
npm install react-markdown @apollo/client @supabase/supabase-js date-fns @mui/material @mui/icons-material @emotion/react @emotion/styled react-router-dom
npm run dev
```

The frontend should now be running at http://localhost:5173

> **Note:** The project is already configured with a Supabase project for development purposes. You can use it as-is for testing, but for production use, you should create your own Supabase project.

## 📁 Project Structure

```
SocMed/
├── front-end/              # Frontend React application
│   └── User_Service/
│       ├── public/         # Static assets
│       └── src/
│           ├── components/ # React components
│           ├── graphql/    # GraphQL queries and mutations
│           ├── lib/        # Utility libraries
│           └── ...
└── services/               # Backend services
    └── Graphql_Service/
        ├── graph/          # GraphQL schema and resolvers
        ├── migrations/     # Database migrations
        └── ...
```

## 🔄 Key Workflows

### Authentication
- Users can sign up with email/password
- Authentication is handled by Supabase
- JWT tokens are used for API authorization

### Post Creation and Interaction
1. Users create posts with title and content
2. Posts appear in followers' feeds
3. Users can like, comment, and view posts

### Social Features
- Follow/unfollow other users
- Receive notifications for new followers, comments, and likes
- View a personalized feed of posts from followed users

## 🌐 API Documentation

The GraphQL API is self-documenting through the GraphQL playground available at http://localhost:8080 when the server is running.

Key GraphQL operations:

- Queries:
  - `getFeed`: Get posts from users you follow
  - `getMyNotifications`: Get your notifications
  - `getPost`: Get a specific post
  - `getPostComments`: Get comments for a post

- Mutations:
  - User: `register`, `followUser`, `unfollowUser`
  - Posts: `createPost`, `updatePost`, `deletePost`
  - Comments: `createComment`, `updateComment`, `deleteComment`
  - Interactions: `likePost`, `unlikePost`

## 💻 Running the Complete Application

1. Start the backend server:

```bash
cd SocMed/services/Graphql_Service
go run server.go
```

2. In a new terminal, start the frontend:

```bash
cd SocMed/front-end/User_Service
npm run dev
```

3. Open your browser and navigate to http://localhost:5173

## 🚧 Known Issues & Limitations

- The application expects PostgreSQL to be running locally
- Supabase integration requires manual setup
- Images are stored using Supabase storage

