require('dotenv').config();
const express = require("express");
const { createClient } = require("redis");
const { setRedis } = require("@av-backend/redis");
const { delay } = require("@av-backend/delay");
const { createEmbeddings, createChat } = require("../openai");

const router = express.Router();
router.use(express.json());

const redis = createClient({
  url: `${process.env.REDIS_CONNECT}`,
});

let redisConnected = false;
let routesConfigured = 0;
let status;
let redisRetries = 3;

const connectredis = async () => {
  try {
    await redis.connect();
    redis.on("error", (error) => {
      console.log("Redis error:", error);
    });
    redisConnected = true;
    console.log(`Redis Connection Established Successfully`);
  } catch (err) {
    if (redisRetries >= 1) {
      console.log(`Error starting redis ${err}, trying again....`);
      await redis.disconnect();
      await delay(10000);
      await connectredis();
      redisRetries -= 1;
    } else {
      console.log(`Error connecting to redis after 3 attempts: ${err}`);
      throw err;
    }
  }
  return redisConnected;
};

const buildConnectionAndRouter = async () => {
  const redisConnection = await connectredis();
  if (redisConnection === true) {
    // initialize the token count to 0
    await Promise.all([
      setRedis(redis, "embeddings:tokensUsed:org_1", 0),
      setRedis(redis, "chat:tokensUsed:org_1", 0),
      setRedis(redis, "embeddings:tokensUsed:org_2", 0),
      setRedis(redis, "chat:tokensUsed:org_2", 0),
      setRedis(redis, "embeddings:tokensUsed:org_3", 0),
      setRedis(redis, "chat:tokensUsed:org_3", 0),

      setRedis(redis, "org_1:tokensUsed", 0),
      setRedis(redis, "org_2:tokensUsed", 0),
      setRedis(redis, "org_3:tokensUsed", 0),

      setRedis(redis, "embeddings:tokensUsed", 0),
      setRedis(redis, "chat:tokensUsed", 0),

      setRedis(redis, "org_1:availability:tokens", 0),
      setRedis(redis, "org_2:availability:tokens", 0),
      setRedis(redis, "org_3:availability:tokens", 0),
    ]);

    const isValidJson = (jsonData) => {
      // Check if jsonData is not null or undefined
      if (!jsonData) {
        return false;
      }

      // Check if jsonData is an object (this also returns true for arrays, so be careful)
      if (typeof jsonData !== "object") {
        return false;
      }

      return true;
    };

    /**
     * Create Embeddings
     * @param {Object} data The data to send to OpenAI for embeddings
     * @returns {Object} The response from OpenAI
     * @throws {Error} If the request fails
     */

    // eslint-disable-next-line consistent-return
    router.post("/embeddings", async (req, res) => {
      try {
        const jsonData = req.body;
        if (!isValidJson(jsonData)) {
          return res.status(400).send("Invalid JSON data");
        }
        console.log("Received JSON:", jsonData);
        const embeddings = await createEmbeddings(jsonData, redis);
        res.send(embeddings);
        status = `${(routesConfigured += 1)} Routes Configured`;
      } catch (error) {
        console.log("Error:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    /**
     * Create Chat
     * @param {Object} data The data to send to OpenAI for chat
     * @returns {Object} The response from OpenAI
     * @throws {Error} If the request fails
     */

    // eslint-disable-next-line consistent-return
    router.post("/completions", async (req, res) => {
      try {
        const jsonData = req.body;
        if (!isValidJson(jsonData)) {
          return res.status(400).send("Invalid JSON data");
        }
        console.log("Received JSON:", jsonData);

        // Require the maxTokens parameter
        const { maxTokens } = jsonData;
        if (maxTokens === undefined) {
          return res.status(400).send("Missing maxTokens parameter");
        }

        const chat = await createChat(jsonData, redis);
        // Custom function to safely stringify objects, including those with circular references
        const safeStringify = (obj, cache = new Set()) =>
          JSON.stringify(obj, (_key, value) => {
            if (typeof value === "object" && value !== null) {
              if (cache.has(value)) {
                return; // Circular reference found
              }
              cache.add(value);
            }
            // eslint-disable-next-line consistent-return
            return value;
          });
        res.send(safeStringify(chat));
        status = `${(routesConfigured += 1)} Routes Configured`;
      } catch (error) {
        console.log("Error:", error);
        res.status(500).send("Internal Server Error");
      }
    });
  }
  return { router, status };
};

module.exports = buildConnectionAndRouter;
