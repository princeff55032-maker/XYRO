# XYRO Member App

The `mobile/` workspace is the Expo React Native app for gym members. It uses
the main XYRO deployment as its API and stores the short-lived member access
token in Expo SecureStore.

## Local development

1. Start the XYRO web app from the repository root.
2. Set `EXPO_PUBLIC_API_URL` to the URL reachable from the Android device.
   `localhost` works only for an emulator configured to reach the host machine.
3. Run `npm install` and `npm start` inside `mobile/`.

The app currently supports member sign-in, a rotating QR pass, membership
status, workout and diet plans, attendance, progress history, payments, and
profile/logout.

## Android release

Use an EAS Android build after setting a production `EXPO_PUBLIC_API_URL` and
replacing the placeholder app assets in `mobile/assets/`. The backend must be
deployed with `AUTH_SECRET` and `DATABASE_URL` configured before testing member
sign-in.
