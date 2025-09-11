# Lighting Dashboard

Example web app with:

- Login for authorized users
- Lighting control with on/off and RGB color selection
- Temperature display from a microcontroller
- Live camera feed with last 24h storage
- Help section

## Usage

```
npm install
npm start
```

Visit `http://localhost:3000/login.html` and log in with `admin` / `password`.

Configure microcontroller and camera URLs with `MICRO_URL` and `CAMERA_URL` environment variables.
