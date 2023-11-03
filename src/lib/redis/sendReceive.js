/**
 * Deletes an entry from redis
 * @param {RedisClient} redis A connected redis client used to connect
 * @param {string} key The key to delete from redis
 * @returns {Promise<Number>} Response from the redis delete
 */
const deleteRedis = async (redis, key) => redis.del(key);

/**
 * Gets the entry in redis for the given key and json parses the response
 * @param {RedisClient} redis A connected redis client used to connect
 * @param {string} key The key to get from redis
 * @returns {Promise<Object>} Either the parsed redis entry or null if not found
 */
const getRedis = async (redis, key) => redis.get(key);

/**
 * Gets the entry in redis for the given key and json parses the response
 * @param {RedisClient} redis A connected redis client used to connect
 * @param {string} key The key to get from redis
 * @returns {Promise<Object>} Either the parsed redis entry or null if not found
 */
const getParsedRedis = async (redis, key) => {
  const redisEntry = await redis.get(key);
  return redisEntry ? JSON.parse(redisEntry) : redisEntry;
};

/**
 * Gets the entry in redis for the given key and json parses the response
 * and checks to ensure the job is still active, if not returns null as well
 * @param {RedisClient} redis A connected redis client used to connect
 * @param {string} key The key to get from redis
 * @returns {Promise<Object>} Either the parsed redis entry or null if not found
 */
const getParsedRedisJobUrls = async (redis, key) => {
  const redisEntry = await getParsedRedis(redis, key);
  for (const entry of redisEntry?.JobUrls || []) {
    if (entry.active) {
      return redisEntry;
    }
  }
  return null;
};

/**
 * Sets an expiry on a redis key
 * @param {RedisClient} redis A connected redis client used to connect
 * @param {string} key The key to get from redis
 * @param {number} time The amount of time until expiry
 * @returns {Promise<Object>} The response from redis for the expiration
 */
const expireRedis = async (redis, key, time) => redis.expire(key, time);

/**
 * Sets a redis entry with the given key/value and opts
 * @param {RedisClient} redis A connected redis client used to connect
 * @param {string} key The key for the entry
 * @param {string} value The value for the entry
 * @param {Object} opts Any options to include on the set (i.e. EX)
 */
const setRedis = async (redis, key, value, opts = {}) => {
  await redis.set(key, value, {
    ...opts,
  });
};

/**
 * Sets a redis entry with the given key/value and opts and serializes the value
 * @param {RedisClient} redis A connected redis client used to connect
 * @param {string} key The key for the entry
 * @param {Object} value The value to be serialized and set
 * @param {Object} opts Any options to include on the set (i.e. EX)
 */
const setParsedRedis = async (redis, key, value, opts = {}) => {
  await redis.set(key, JSON.stringify(value), {
    ...opts,
  });
};

/**
 * Gets the JobUrls for a given JobHash, whether residing in redis or the db or returns null if not found
 * @param {RedisClient} redis A connected redis client used to connect
 * @param {MongoClient} db A connected db client used to connect
 * @param {string} JobHash The the JobHash to find
 * @returns {Promise<Array|null>} The array of JobUrls for the job
 */
const getJobUrlsRedis = async (redis, db, JobHash) => {
  let jobEnt = await getParsedRedis(redis, `JobUrls:${JobHash}`);
  if (!jobEnt) {
    jobEnt = await db
      .db("jobsDB")
      .collection("urls")
      .findOne(
        {
          JobHash,
        },
        {
          projection: {
            _id: 0,
            JobUrls: 1,
          },
        },
      );
  }
  return jobEnt?.JobUrls;
};

module.exports = {
  deleteRedis,
  getRedis,
  getParsedRedis,
  getParsedRedisJobUrls,
  expireRedis,
  setRedis,
  setParsedRedis,
  getJobUrlsRedis,
};
