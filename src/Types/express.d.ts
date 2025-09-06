import { User } from "../Types/types";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
