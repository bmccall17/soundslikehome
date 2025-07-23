<img width="36%" height="717" alt="image" src="https://github.com/user-attachments/assets/bfc1c3c5-c42f-4056-9493-1ce07e932646" />
<img width="63%" height="943" alt="image" src="https://github.com/user-attachments/assets/b4d1159e-4269-4dde-8717-5571cce8d0e6" />
<br>

## Sounds Like Home 🎵

A web application where users can record and listen to audio responses about what "home" sounds like to them. Features a sequential prompt system and beautiful rainbow bubble visualizations.

## Features

- **Audio Recording**: Record up to 90 seconds of audio with visual countdown timer
- **Sequential Prompts**: Curated prompts served in sequence to all users
- **Listening Experience**: Play back recordings from others with full audio controls
- **Rainbow Bubbles**: Visual representation of available recordings as floating soap bubbles
- **Admin Panel**: Full CRUD management of prompts and recordings

## Live Demo

🌐 **[https://soundslikehome-brett-5075s-projects.vercel.app/](https://soundslikehome-brett-5075s-projects.vercel.app/)**

### Admin Access

The admin panel is available at `/admin`. Contact the site administrator for login credentials.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Audio**: Web Audio API, MediaRecorder API
- **Storage**: JSON file-based data storage
- **Hosting**: Vercel

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Visit `http://localhost:3000` (or `https://localhost:3443` with SSL)

### SSL Setup (Optional for Development)

For microphone access in development, generate SSL certificates:

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"
```

## Project Structure

```
├── server.js          # Main server file
├── app.js             # Client-side application logic
├── index.html         # Main application page
├── admin.html         # Admin panel interface
├── admin.js           # Admin panel logic
├── styles.css         # Application styles
├── data/              # JSON data storage
│   ├── prompts.json   # Prompt management
│   ├── recordings.json # Recording metadata
│   └── prompt-state.json # Sequential prompt state
├── recordings/        # Audio file storage
└── package.json       # Dependencies and scripts
```

## API Endpoints

### Public Endpoints
- `GET /` - Main application
- `GET /api/prompts/next` - Get next prompt in sequence
- `POST /api/recordings` - Submit new recording
- `GET /api/recordings/random` - Get random recording for listening
- `GET /api/recordings/count` - Get count of approved recordings

### Admin Endpoints (Authentication Required)
- `GET /admin` - Admin panel interface
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/recordings` - Manage recordings
- `GET /api/admin/prompts` - Manage prompts
- `PUT /api/admin/prompts/:id/queue-next` - Queue prompt next

## Deployment

The application is configured for easy deployment to Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables:
   - `NODE_ENV=production`
   - `SESSION_SECRET=your-secure-session-secret`
   - `ADMIN_PASSWORD=your-admin-password`
3. Deploy automatically with git push

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

---

*Built with ❤️ for preserving the sounds of home*
