import jwt, { JwtPayload } from "jsonwebtoken";

export default function verifyUser(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token is missing or malformed" });
    }

    const token = authHeader.split(" ")[1]; // Extract the token

    const decoded = jwt.verify(token, "secret") as JwtPayload;
    console.log("Decoded Token:", decoded);

    // Authorization logic (if required, e.g., match user ID)
    const userIdFromToken = decoded.user_id; // Adjust based on your JWT payload structure
    
    //We dont need to check if the user, that is trying to access the resource, is the same as the user that is logged in.
    /*if (req.params.id && parseInt(req.params.id) !== userIdFromToken) {
      return res.status(403).json({ message: "You are not authorized to access this resource" });
    }*/

    // Attach user info to request for further use in downstream middleware/routes
    req.body.user = decoded;

    next(); // Proceed to the next middleware or route handler
  } catch (error: any) {
    console.error("JWT verification error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
