import { Request, Response, NextFunction } from "express";

// Role hierarchy from highest to lowest privilege
const roleHierarchy = ["supergod", "admin", "user"];

/**
 * Check if a user has a required role or higher
 * @param requiredRole Minimum role required
 * @param userRole User's current role
 * @returns Boolean indicating if user has sufficient privileges
 */
export function hasRole(requiredRole: string, userRole: string): boolean {
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  
  // If either role is not found in hierarchy, return false
  if (requiredRoleIndex === -1 || userRoleIndex === -1) return false;
  
  // Lower index means higher privilege
  return userRoleIndex <= requiredRoleIndex;
}

/**
 * Check if a user has supergod role
 * @param userRole User's current role
 * @returns Boolean indicating if user has supergod privileges
 */
export function isSupergod(userRole: string): boolean {
  return userRole === "supergod";
}

/**
 * Check if a user has admin or higher privileges
 * @param userRole User's current role
 * @returns Boolean indicating if user has admin or higher privileges
 */
export function isAdminOrHigher(userRole: string): boolean {
  return hasRole("admin", userRole);
}

/**
 * Middleware to restrict access to supergod only
 * @returns Express middleware function
 */
export function requireSupergod() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userRole = req.user?.role;
    
    // Check if user has supergod role
    if (userRole !== "supergod") {
      return res.status(403).json({ 
        message: "Super-God privileges required",
        userRole
      });
    }
    
    console.log("[DEBUG] Super-God privileges confirmed");
    next();
  };
}

/**
 * Middleware to restrict access based on user role
 * @param requiredRole Minimum role required to access the route
 * @returns Express middleware function
 */
export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userRole = req.user?.role;
    
    // Log current user role for debugging
    console.log(`[DEBUG] Current user role: ${userRole}`);
    
    // Check if user has supergod role
    if (userRole === "supergod") {
      console.log("[DEBUG] Super-God privileges unlocked");
    }
    
    // Check if user has required role
    if (!hasRole(requiredRole, userRole)) {
      return res.status(403).json({ 
        message: "Insufficient privileges",
        requiredRole,
        userRole
      });
    }
    
    next();
  };
}