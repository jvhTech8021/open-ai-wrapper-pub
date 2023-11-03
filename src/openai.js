/* eslint-disable camelcase */
const axios = require("axios");
const { countTokens } = require("@av-backend/tokenizer");
const { setRedis, getRedis } = require("@av-backend/redis");
const { delay } = require("@av-backend/delay");
const {
  EMBEDDINGS_TPM_MAX,
  baseURL,
  OPEN_AI_KEYS,
  models,
  EMBEDDINGS_COST,
} = require("./constants");

let openAIorgKey = OPEN_AI_KEYS.JVH_TECH;
const numOfOpenAIaccounts = Object.keys(OPEN_AI_KEYS).length;
let openAIorg = "org_1";
let headers = {
  Authorization: `Bearer ${openAIorgKey}`,
  "Content-Type": "application/json",
};

/**
 * Process Redis
 * @param {Number} value The number of tokens used
 * @param {String} type The type of request
 * @param {String} org The org that made the request
 * @param {Object} redis The redis client
 */
const processRedis = async (tokens, tokensRem, requestsRem, type, org, redis) => {
  try {
    const keyForSpecificTokens = `${type}:tokensUsed:${org}`;
    const keyForOrgTokens = `${org}:tokensUsed`;
    const keyForTypeTokens = `${type}:tokensUsed`;
    const orgTokensAvailableKey = `${org}:availability:tokens`;
    const orgRequestsAvailableKey = `${org}:availability:requests`;

    await setRedis(redis, orgTokensAvailableKey, tokensRem);
    await setRedis(redis, orgRequestsAvailableKey, requestsRem);

    const currentTokensUsed = await getRedis(redis, keyForSpecificTokens);
    const currentOrgUse = await getRedis(redis, keyForOrgTokens);
    const currentTypeUse = await getRedis(redis, keyForTypeTokens);

    const newTokensUsed = parseInt(currentTokensUsed, 10) + parseInt(tokens, 10);

    await setRedis(redis, keyForSpecificTokens, newTokensUsed);
    await setRedis(
      redis,
      keyForOrgTokens,
      parseInt(tokens, 10) + parseInt(currentOrgUse, 10),
    );
    await setRedis(
      redis,
      keyForTypeTokens,
      parseInt(tokens, 10) + parseInt(currentTypeUse, 10),
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

/**
 * Determine OpenAI Key
 * @param {Object} redis The redis client
 */
const determineOpenAIKey = async (org, redis) => {
  let orgToUse = org;
  const org_1_tokensUsed = await getRedis(redis, "org_1:tokensUsed");
  const org_2_TokensUsed = await getRedis(redis, "org_2:tokensUsed");
  const org_3_TokensUsed = await getRedis(redis, "org_3:tokensUsed");

  const org_1_reqs_rem = await getRedis(redis, "org_1:availability:tokens");
  const org_2_reqs_rem = await getRedis(redis, "org_2:availability:tokens");
  const org_3_reqs_rem = await getRedis(redis, "org_3:availability:tokens");

  const tokensUsed = {
    org_1: org_1_tokensUsed,
    org_2: org_2_TokensUsed,
    org_3: org_3_TokensUsed,
  };

  const requestsRem = {
    org_1: parseInt(org_1_reqs_rem, 10),
    org_2: parseInt(org_2_reqs_rem, 10),
    org_3: parseInt(org_3_reqs_rem, 10),
  };

  const labelOfMaxTokensRem = Object.entries(tokensUsed).reduce(
    (max, [label, value]) => (value > max.value ? { label, value } : max),
    { label: "", value: -Infinity },
  ).label;

  const labelOfMaxRequestsRem = Object.entries(requestsRem).reduce(
    (max, [label, value]) => (value > max.value ? { label, value } : max),
    { label: "", value: -Infinity },
  ).label;

  orgToUse = labelOfMaxTokensRem;

  if (labelOfMaxTokensRem !== labelOfMaxRequestsRem) {
    orgToUse = labelOfMaxTokensRem;
  }

  // console.log(JSON.stringify(tokensRem));

  if (orgToUse === "org_1") {
    openAIorgKey = OPEN_AI_KEYS.ORG_1;
    openAIorg = "org_1";
  } else if (orgToUse === "org_2") {
    openAIorgKey = OPEN_AI_KEYS.ORG_2;
    openAIorg = "org_2";
  } else {
    openAIorgKey = OPEN_AI_KEYS.ORG_3;
    openAIorg = "org_3";
  }

  headers = {
    Authorization: `Bearer ${openAIorgKey}`,
    "Content-Type": "application/json",
  };
};

/**
 * Create Embeddings
 * @param {Object} data The data to send to OpenAI for embeddings
 * @returns {Object} The response from OpenAI
 * @throws {Error} If the request fails
 */
// eslint-disable-next-line consistent-return
const createEmbeddings = async (
  data,
  redis,
  force = 0,
  retryCount = numOfOpenAIaccounts,
) => {
  const { text, model = "text-embedding-ada-002" } = data;
  const openAIreq = {
    input: text,
    model,
  };
  const tokenSpaceNeeded = countTokens(text, model);
  let tokenAvailability = await getRedis(redis, `${openAIorg}:availability:tokens`);
  const requestAvailability = await getRedis(redis, `${openAIorg}:availability:requests`);

  const makeRequest = async () => {
    if (tokenAvailability > tokenSpaceNeeded && requestAvailability > 1) {
      return true;
    }
    if (force === 1) {
      return true;
    }
    if (tokenAvailability === "0" && numOfOpenAIaccounts > 1) {
      await setRedis(redis, "org_1:availability:tokens", EMBEDDINGS_TPM_MAX);
      await setRedis(redis, "org_2:availability:tokens", EMBEDDINGS_TPM_MAX);
      await setRedis(redis, "org_3:availability:tokens", EMBEDDINGS_TPM_MAX);
      tokenAvailability = await getRedis(redis, `${openAIorg}:availability:tokens`);
      return true;
    }
    return false;
  };

  const shouldMakeReq = await makeRequest();

  if (shouldMakeReq) {
    try {
      const response = await axios.post(`${baseURL}/embeddings`, openAIreq, { headers });
      const tokensUsed = response.data.usage.total_tokens;
      const accountTokensRem = response.headers["x-ratelimit-remaining-tokens"];
      const accountRequestsRem = response.headers["x-ratelimit-remaining-requests"];
      const cost = (tokensUsed / 1000) * EMBEDDINGS_COST;
      await processRedis(
        tokensUsed,
        accountTokensRem,
        accountRequestsRem,
        "embeddings",
        openAIorg,
        redis,
      );
      const returnObj = {
        text_to_embed: text,
        org: openAIorg,
        remainingAvailableTokensThisMinute: tokenAvailability - tokensUsed,
        tokensUsed,
        cost,
        embeddings: response.data.data[0],
      };
      return returnObj;
    } catch (error) {
      console.log("Error:", error);
      throw error;
    }
  } else if (retryCount !== 0) {
    try {
      console.log("Not enough tokens available...trying different account in 10 seconds");
      if (numOfOpenAIaccounts > 1) {
        await determineOpenAIKey(openAIorg, redis);
      }
      await delay(10000);
      return await createEmbeddings(data, redis, 0, retryCount - 1);
    } catch (error) {
      console.log(`Error with ${openAIorg}....trying again in one minute`);
      await delay(60000);
      if (numOfOpenAIaccounts > 1) {
        await determineOpenAIKey(openAIorg, redis);
      }
      return createEmbeddings(data, redis, 0, retryCount - 1);
    }
  } else if (force !== 1) {
    console.log("All retries failed...forcing request");
    try {
      return await createEmbeddings(data, redis, 1, retryCount - numOfOpenAIaccounts);
    } catch (err) {
      throw new Error("All retries on all accounts failed...");
    }
  } else {
    throw new Error("All retries on all accounts failed...");
  }
};

/**
 * Create Completion
 * @param {Object} data The data to send to OpenAI for completion
 * @returns {Object} The response from OpenAI
 * @throws {Error} If the request fails
 */

// eslint-disable-next-line consistent-return
const createChat = async (data, redis, force = 0, retryCount = numOfOpenAIaccounts) => {
  const {
    text,
    maxTokens,
    model = "gpt-3.5-turbo",
    temperature = 1,
    systemPrompt = "",
  } = data;

  let modelLimit;
  let modelCostInput;
  let modelCostOutput;

  switch (model) {
    case "gpt-3.5-turbo":
      modelLimit = models.gpt_3.modelLimit;
      modelCostInput = models.gpt_3.modelCostInput;
      modelCostOutput = models.gpt_3.modelCostOutput;
      break;
    case "gpt-3.5-turbo-16k":
      modelLimit = models.gpt_3_16k.modelLimit;
      modelCostInput = models.gpt_3_16k.modelCostInput;
      modelCostOutput = models.gpt_3_16k.modelCostOutput;
      break;
    case "gpt-3.5-turbo-instruct":
      modelLimit = models.gpt_3_instruct.modelLimit;
      modelCostInput = models.gpt_3_instruct.modelCostInput;
      modelCostOutput = models.gpt_3_instruct.modelCostOutput;
      break;
    case "gpt-4":
      modelLimit = models.gpt_4.modelLimit;
      modelCostInput = models.gpt_4.modelCostInput;
      modelCostOutput = models.gpt_4.modelCostOutput;
      break;
    default:
      break;
  }

  const openAIreq = {
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: text,
      },
    ],
    max_tokens: maxTokens,
    temperature,
  };

  const openAIreqLegacy = {
    model,
    prompt: text,
    max_tokens: maxTokens,
    temperature,
  };

  const openAIrequest = model === "gpt-3.5-turbo-instruct" ? openAIreqLegacy : openAIreq;
  const tokenModel = model !== "gpt-4" ? "gpt-3.5-turbo" : "gpt-4";

  const tokenSpaceNeeded = countTokens(text, tokenModel) + 10 + maxTokens;
  let tokenAvailability = await getRedis(redis, `${openAIorg}:availability:tokens`);
  const requestAvailability = await getRedis(redis, `${openAIorg}:availability:requests`);

  const makeRequest = async () => {
    console.log("making req");
    if (tokenAvailability > tokenSpaceNeeded && requestAvailability > 1) {
      return true;
    }
    if (force === 1) {
      return true;
    }
    if (tokenAvailability === "0" && numOfOpenAIaccounts > 1) {
      // console.log("Setting availability to max");
      await setRedis(redis, "org_1:availability:tokens", modelLimit);
      await setRedis(redis, "org_2:availability:tokens", modelLimit);
      await setRedis(redis, "org_3:availability:tokens", modelLimit);
      tokenAvailability = await getRedis(redis, `${openAIorg}:availability:tokens`);
      console.log("New availability:", tokenAvailability);
      return true;
    } else {
      await setRedis(redis, "org_1:availability:tokens", modelLimit);
      tokenAvailability = await getRedis(redis, `${openAIorg}:availability:tokens`);
      console.log("New availability:", tokenAvailability);
      return true;
    }
    return false;
  };

  const shouldMakeReq = await makeRequest();

  if (shouldMakeReq) {
    const url =
      model === "gpt-3.5-turbo-instruct"
        ? `${baseURL}/completions`
        : `${baseURL}/chat/completions`;
    try {
      console.log("Making request to:", url, openAIrequest)
      const response = await axios.post(url, openAIrequest, { headers });
      const tokensUsed = response.data.usage.total_tokens;
      const accountTokensRem = response.headers["x-ratelimit-remaining-tokens"];
      const accountRequestsRem = response.headers["x-ratelimit-remaining-requests"];
      const costInput = (tokenSpaceNeeded / 1000) * modelCostInput;
      const costOutput = (tokensUsed - tokenSpaceNeeded / 1000) * modelCostOutput;
      const totalCost = costInput + costOutput;
      await processRedis(
        tokensUsed,
        accountTokensRem,
        accountRequestsRem,
        "chat",
        openAIorg,
        redis,
      );
      const returnObj = {
        prompt: text,
        org: openAIorg,
        remainingAvailableTokensThisMinute: tokenAvailability - tokensUsed,
        tokensUsed,
        totalCost,
        output: response,
      };
      return returnObj;
    } catch (error) {
      console.log("Error making request:", error);
      throw error;
    }
  } else if (retryCount !== 0) {
    try {
      console.log("Not enough tokens available...trying different account in 10 seconds");
      if (numOfOpenAIaccounts > 1) {
        await determineOpenAIKey(openAIorg, redis);
      }
      await delay(10000);
      return createChat(data, redis, retryCount - 1);
    } catch (error) {
      console.log(`Error with ${openAIorg}....trying again in one minute`);
      await delay(60000);
      if (numOfOpenAIaccounts) {
        await determineOpenAIKey(openAIorg, redis);
      }
      return createChat(data, redis, retryCount - 1);
    }
  } else if (force !== 1) {
    console.log("All retries failed...forcing request");
    try {
      return await createChat(data, redis, 1, retryCount - numOfOpenAIaccounts);
    } catch (err) {
      throw new Error("All retries on all accounts failed...");
    }
  } else {
    throw new Error("All retries on all accounts failed...");
  }
};

module.exports = {
  createEmbeddings,
  createChat,
};
