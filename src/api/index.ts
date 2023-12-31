import task_router from "./task.js";
import user_router from "./user.js";
import statistics_router from "./statistics.js";
import auth_router from "./auth.js";
import { authorize } from "../middlewares/authorization.js";
import express, { Request, Response } from "express";

const setupRoutes = (app: express.Application) => {
  app.use("/auth", auth_router);
  app.use("/task", authorize, task_router);
  app.use("/user", user_router);
  app.use("/statistics", statistics_router);
  app.use("*", (req: Request, res: Response) => {
    res.status(404).json({
      message: "Request URL does not exist",
    });
  });
};

export default setupRoutes;
