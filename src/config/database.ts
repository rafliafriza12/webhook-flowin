import mongoose from "mongoose";
import { configDotenv } from "dotenv";

configDotenv();

const clientOptions: mongoose.ConnectOptions = {
  serverApi: {
    version: "1" as const,
    strict: true,
    deprecationErrors: true,
  },
  retryWrites: true,
  w: "majority",
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
};

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache =
  global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null });

const connectDB = async (): Promise<typeof mongoose> => {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }
    cache.promise = mongoose.connect(process.env.MONGO_URI, clientOptions);
  }

  cache.conn = await cache.promise;
  return cache.conn;
};

export default connectDB;
