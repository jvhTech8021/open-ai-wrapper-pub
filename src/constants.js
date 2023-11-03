/* eslint-disable camelcase */
const ONE_MINUTE = 60;
const EMBEDDINGS_TPM_MAX = 1000000;
const CHAT_THREE_FIVE_TURBO_16k = 180000;
const CHAT_TPM_MAX = 85000;
const EMBEDDINGS_COST = 0.0001;
const CHAT_THREE_FIVE_COST_INPUT = 0.0015;
const CHAT_THREE_FIVE_COST_OUTPUT = 0.002;
const CHAT_THREE_FIVE_16k_COST_INPUT = 0.003;
const CHAT_THREE_FIVE_16k_COST_OUTPUT = 0.004;
const CHAT_THREE_FIVE_INSTRUCT_TPM_MAX = 250000;
const CHAT_FOUR_COST_8k_INPUT = 0.03;
const CHAT_FOUR_COST_8k_OUTPUT = 0.06;
const CHAT_FOUR_COST_32k_INPUT = 0.06;
const CHAT_FOUR_COST_32k_OUTPUT = 0.12;
const CHAT_FOUR_TPM_MAX = 10000;
const baseURL = "https://api.openai.com/v1";
const OPEN_AI_KEYS = {
  JVH_TECH: process.env.OPENAI_KEY_JVH_TECH,

};

const models = {
  gpt_3: {
    models: ["gpt-3.5-turbo", "gpt-3.5-turbo-0301", "gpt-3.5-turbo-0613"],
    modelLimit: CHAT_TPM_MAX,
    modelCostInput: CHAT_THREE_FIVE_COST_INPUT,
    modelCostOutput: CHAT_THREE_FIVE_COST_OUTPUT,
  },
  gpt_3_16k: {
    models: ["gpt-3.5-turbo-16k", "gpt-3.5-turbo-16k-0613"],
    modelLimit: CHAT_THREE_FIVE_TURBO_16k,
    modelCostInput: CHAT_THREE_FIVE_16k_COST_INPUT,
    modelCostOutput: CHAT_THREE_FIVE_16k_COST_OUTPUT,
  },
  gpt_3_instruct: {
    models: ["gpt-3.5-turbo-instruct", "gpt-3.5-turbo-instruct-0914"],
    modelLimit: CHAT_THREE_FIVE_INSTRUCT_TPM_MAX,
    modelCostInput: CHAT_THREE_FIVE_COST_INPUT,
    modelCostOutput: CHAT_THREE_FIVE_COST_OUTPUT,
  },
  gpt_4: {
    models: ["gpt-4", "gpt-4-0314", "gpt-4-0613"],
    modelLimit: CHAT_FOUR_TPM_MAX,
    modelCostInput: CHAT_FOUR_COST_8k_INPUT,
    modelCostOutput: CHAT_FOUR_COST_8k_OUTPUT,
  },
  gpt_4_32k: {
    models: ["gpt-4", "gpt-4-0314", "gpt-4-0613"],
    modelLimit: CHAT_FOUR_TPM_MAX,
    modelCostInput: CHAT_FOUR_COST_32k_INPUT,
    modelCostOutput: CHAT_FOUR_COST_32k_OUTPUT,
  },
};

module.exports = {
  ONE_MINUTE,
  EMBEDDINGS_TPM_MAX,
  baseURL,
  OPEN_AI_KEYS,
  EMBEDDINGS_COST,
  models,
};
