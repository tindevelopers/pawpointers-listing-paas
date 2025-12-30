import { Context, Next } from "hono";
import { errors } from "../lib/response";

/**
 * Permission middleware
 * Checks if user has required permission
 * Note: This is a simplified version - you may want to integrate with your actual permission system
 */
export function requirePermission(permission: string) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return errors.unauthorized(c, "Authentication required");
    }

    // TODO: Implement actual permission checking logic
    // For now, we'll allow all authenticated users
    // You should integrate with your permission system here
    // Example:
    // const hasPermission = await checkUserPermission(user.id, permission);
    // if (!hasPermission) {
    //   return errors.forbidden(c, "Insufficient permissions");
    // }

    await next();
  };
}

