# PetConnect

PetConnect is a React Native and Node.js social network app for pet owners.

This initial setup includes:

- `server/`: Node.js, Express, MongoDB with Mongoose, Socket.io-ready backend
- `client/`: React Native app using Expo
- Health check route: `GET /api/health`
- MVC-oriented backend folder structure
- Placeholder model files for `User`, `Pet`, `Group`, `Post`, `Message`, and `Membership`

Full CRUD, authentication flows, validation rules, and app screens will be added in later steps.

## Project Structure

```text
PetConnect/
  server/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      sockets/
      utils/
      validators/
    .env.example
    package.json
    server.js
  client/
    App.js
    package.json
```

## Backend Setup

1. Open a terminal in the server folder:

```bash
cd PetConnect/server
```

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
copy .env.example .env
```

On macOS or Linux, use:

```bash
cp .env.example .env
```

4. Make sure MongoDB is running locally, or update `MONGO_URI` in `.env` to your MongoDB connection string.

5. Start the backend in development mode:

```bash
npm run dev
```

Or start it normally:

```bash
npm start
```

6. Test the health check:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "PetConnect API is healthy"
}
```

## Frontend Setup

1. Open another terminal in the client folder:

```bash
cd PetConnect/client
```

2. Install dependencies:

```bash
npm install
```

3. Start Expo:

```bash
npm start
```

Then choose one of the Expo options:

- Press `a` to open Android if an emulator is running.
- Press `i` to open iOS on macOS with Simulator.
- Scan the QR code with Expo Go on your phone.
- Press `w` to open the web version.

## Notes

- The backend currently exposes only `GET /api/health`.
- Socket.io is initialized on the backend but no chat or realtime events are implemented yet.
- JWT, bcrypt, validation, and model dependencies are installed and ready for the next build steps.
