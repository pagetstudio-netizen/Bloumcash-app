declare module "express" {
  interface Request {
    currentUser?: import("./middleware/user-auth").UserTokenPayload;
    admin?: import("./middleware/admin-auth").AdminTokenPayload;
    log: import("pino").Logger;
  }
}

export {};
