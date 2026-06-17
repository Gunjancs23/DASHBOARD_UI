export const getRoleFromSessionClaims = (sessionClaims: unknown) => {
  const claims = sessionClaims as
    | {
        metadata?: { role?: string };
        publicMetadata?: { role?: string };
      }
    | null
    | undefined;

  return claims?.metadata?.role || claims?.publicMetadata?.role;
};
