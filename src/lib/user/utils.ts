export const getUserAvatar = (user: { image?: string | null }): string => {
  const disableDefaultAvatar = process.env.DISABLE_DEFAULT_AVATAR === "true";
  return user.image || (disableDefaultAvatar ? "" : "/pf.png");
};

export const getIsUserAdmin = (_user?: { role?: string | null }): boolean => {
  // Role functionality removed for now - return false
  return false;
};
