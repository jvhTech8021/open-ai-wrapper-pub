const tiktoken = require("@dqbd/tiktoken");

const countTokens = (text, model = "cl100k_base") => {
  const encoder = tiktoken.encoding_for_model(model);
  const tokens = encoder.encode(text);
  encoder.free();
  return tokens.length;
};

module.exports = {
  countTokens,
};
