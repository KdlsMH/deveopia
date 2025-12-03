# Developia - Collaborative Project Platform

A real-time collaborative platform built with Next.js, Supabase, and WebRTC for team project management.

## Features

- **Real-time Chat**: Instant messaging with channel support
- **Video Meetings**: WebRTC-powered video/audio conferencing with screen sharing
- **Interactive Whiteboard**: Real-time collaborative drawing with cursor preview
- **Code Editor**: Syntax-highlighted code editing with file management
- **File Management**: Upload and organize project files with Supabase Storage
- **Organization Tools**: Calendar, timeline, and activity tracking
- **User Authentication**: Secure login with Supabase Auth
- **Role-based Access**: Admin/Member/Viewer permissions with invite system

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **WebRTC**: Native Browser APIs

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/developia.git
cd developia
\`\`\`

2. Install dependencies:
\`\`\`bash
pnpm install
# or
npm install
\`\`\`

3. Set up environment variables:

Create a `.env.local` file in the root directory:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_prisma_url
POSTGRES_URL_NON_POOLING=your_non_pooling_url
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=your_database
POSTGRES_HOST=your_host

# Auth
SUPABASE_JWT_SECRET=your_jwt_secret
\`\`\`

4. Run database migrations:

Execute the SQL scripts in `scripts/` directory in your Supabase dashboard:
- `001_create_schema.sql` - Creates all tables
- `002_create_user_trigger.sql` - Sets up user auto-creation
- `003_insert_default_channels.sql` - Adds default channels

5. Run the development server:
\`\`\`bash
pnpm dev
# or
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel Dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/developia)

### Important: Supabase Configuration

After deployment, update Supabase settings:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel deployment URL to:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: 
     - `https://your-app.vercel.app/**`
     - `https://your-app.vercel.app/auth/callback`

## Project Structure

\`\`\`
developia/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main entry point
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── auth-page.tsx     # Authentication
│   ├── dashboard.tsx     # Project dashboard
│   ├── meeting.tsx       # Video conference
│   ├── chat.tsx          # Real-time chat
│   ├── whiteboard.tsx    # Collaborative drawing
│   ├── code-editor.tsx   # Code editing
│   └── ...
├── lib/                   # Utilities and helpers
│   ├── supabase/         # Supabase clients
│   ├── project-context.tsx # Global state
│   └── types.ts          # TypeScript types
├── scripts/              # Database migrations
└── middleware.ts         # Auth middleware
\`\`\`

## Key Features Explained

### WebRTC Video Conferencing
- Peer-to-peer video/audio streaming
- Camera and microphone toggle
- Screen sharing (production only)
- Real-time participant list

### Real-time Whiteboard
- Collaborative drawing with multiple users
- Brush size preview with circular cursor
- Auto-save to Supabase
- Instant synchronization via Realtime

### File Management
- Upload files to Supabase Storage
- Download and delete with RLS protection
- Activity logging for all operations

### Invite System
- Role-based invitations (Admin/Member/Viewer)
- Expiration dates
- Email notifications (optional)

## Database Schema

13 tables with Row Level Security:
- `users` - User profiles
- `projects` - Project information
- `project_members` - Membership with roles
- `channels` - Chat channels
- `messages` - Chat messages
- `meetings` - Meeting schedules
- `notes` - Project notes
- `files` - File metadata
- `whiteboard_data` - Drawing data
- `code_files` - Code files
- `user_presence` - Online status
- `activity_logs` - Audit trail

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebRTC features (video/audio/screen sharing) require HTTPS in production.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and Supabase
