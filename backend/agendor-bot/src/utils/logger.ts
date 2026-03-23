import pino from "pino";
import { config } from "../config/index.js";

export const logger = pino({
  level: "info",
  transport:
    config.nodeEnv !== "production"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
      : undefined,
});
