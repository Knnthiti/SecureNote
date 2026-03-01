# SecureNote Project Report

## 1. JS Engine vs. Runtime

*Placeholder for explanation of JavaScript engines (e.g., V8) and runtimes (Node.js, browsers).

## 2. DOM / Virtual DOM

*Placeholder for discussion on the Document Object Model and how frameworks use a virtual DOM for performance.

## 3. HTTP / HTTPS Request Cycle

*Placeholder for outlining request/response life cycle, headers, status codes, TLS/SSL.

## 4. Environment Variables Security

*Placeholder to discuss why env vars should be kept out of source control, use .env, and server-side protection.

## 5. Step-by-Step Implementation Guide

1. **Setup Backend:** Initialize a Node project with `express` and `dotenv`. Create a `.env` file containing `PORT` and `SECRET_TOKEN`.
2. **Create API:** Build the REST endpoints (`GET`, `POST`, `DELETE` under `/api/notes`), and test them using tools like curl, Postman, or ThunderClient to ensure logic works.
3. **Setup Frontend:** Scaffold a Next.js application and implement the user interface for listing, creating, and deleting notes.
4. **Connect:** Use `fetch('http://localhost:YOUR_PORT/api/notes')` in the frontend to communicate with the backend API.
5. **Secure:** Implement logic to send the `SECRET_TOKEN` in the `Authorization` header of fetch requests and enforce validation on the server.
6. **Document:** Write and maintain the `REPORT.md` describing architecture, decisions, and concepts.


## 6. Bonus Challenges Completed

- **Data persistence:** Notes are stored in a `notes.json` file on the backend; the server loads the file on startup and saves after any create/delete. This ensures notes survive a server restart (+10 points).
- **Loading state:** A `loading` boolean state variable displays a subtle indicator next to "Your Notes" and disables form buttons while requests are in progress (+5 points).
- **Edit functionality:** Frontend now allows users to click the pencil icon on a note to populate the form for editing. Submitting while editing sends a `PATCH` request to `/api/notes/:id`, and the backend updates the stored note accordingly (+optional usability enhancement).

*(Additional bonus tasks such as cloud deployment were left optional.)*

### Using PocketHost API

The backend can be configured to use the provided PocketHost endpoints instead of local storage. To enable it, add the following environment variables to `backend/.env`:

```
POCKET_HOST_URL=https://app-tracking.pockethost.io/api/collections/notes/records
POCKET_HOST_TOKEN=your_api_key_here
```

When `POCKET_HOST_TOKEN` is present the server will forward `GET`, `POST`, and `DELETE` requests to that service, allowing notes to live in the cloud (+15 optional points). Otherwise it falls back to the local `notes.json` file.

### Deployment Notes

The project is split into a Node backend and a Next.js frontend. Both can be deployed to popular hosts:

- **Frontend**: push the `frontend` folder to Vercel or Netlify; set the `NEXT_PUBLIC_SECRET_TOKEN` value in the provider’s environment settings. The build command is `npm run build` and start is `npm start` or the platform will handle it automatically.
- **Backend**: deploy the `backend` folder to any Node-capable service (Heroku, Render, Fly, etc.). Set environment variables (`PORT`, `SECRET_TOKEN`, and optionally `POCKET_HOST_*`). Ensure CORS is allowed for your frontend origin, or configure a proxy.

HTTPS is automatically provided by those hosts; just confirm the frontend uses `https://` when calling the API. For local testing you can use `ngrok` or similar to expose the backend over HTTPS.

Deploying both gives you a fully hosted, secure notes app accessible anywhere.
