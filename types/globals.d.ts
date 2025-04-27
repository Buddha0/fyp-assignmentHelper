export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingCompleted?: boolean;
      role?: "POSTER" | "DOER" | "ADMIN"; // Define roles based on your application needs
    }
  }
}
