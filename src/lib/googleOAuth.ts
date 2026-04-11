const LOVABLE_DEV_HOST_SUFFIX = ".lovableproject.com";

export function getGoogleOAuthOrigin() {
  const { origin, hostname } = window.location;

  if (hostname.endsWith(LOVABLE_DEV_HOST_SUFFIX)) {
    const projectId = hostname.replace(LOVABLE_DEV_HOST_SUFFIX, "");
    return `https://id-preview--${projectId}.lovable.app`;
  }

  return origin;
}

export function getGoogleOAuthRedirectUri() {
  return `${getGoogleOAuthOrigin()}/google/callback`;
}